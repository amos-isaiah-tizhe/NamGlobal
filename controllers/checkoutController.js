const cart = require("../utils/cart");
const cartService = require("../services/cartService");
const { recordCouponUse } = require("../services/couponService");
const { generateOrderNumber } = require("../utils/orderNumber");
const { buildWhatsAppOrderMessage, buildWhatsAppUrl } = require("../utils/whatsappOrderMessage");
const { initiatePayment, getAvailableProviders } = require("../services/paymentService");
const Order = require("../models/Order");
const siteConfig = require("../config/siteConfig");

exports.showCheckout = async (req, res, next) => {
  try {
    const hydrated = await cartService.hydrateCart(cart.getCartItems(req));
    if (hydrated.length === 0) return res.redirect("/cart");

    const totals = await cartService.computeTotals(hydrated, {
      couponCode: req.session.couponCode,
      shippingState: req.query.state,
    });

    res.render("checkout", { title: "Checkout", items: hydrated, totals, user: req.user });
  } catch (err) {
    next(err);
  }
};

/**
 * Shared by both checkout paths: re-hydrates the cart from the DB (never
 * trusts anything from the session/client beyond productId+quantity), builds
 * the order-item snapshots, and computes totals fresh (Section 2.7).
 */
async function buildOrderFromCart(req) {
  const hydrated = await cartService.hydrateCart(cart.getCartItems(req));
  if (hydrated.length === 0) return null;

  const shippingAddress = {
    recipientName: req.body.recipientName,
    phone: req.body.phone,
    line1: req.body.line1,
    line2: req.body.line2 || "",
    city: req.body.city,
    state: req.body.state,
    country: "Nigeria",
  };

  const totals = await cartService.computeTotals(hydrated, {
    couponCode: req.session.couponCode,
    shippingState: shippingAddress.state,
  });

  const items = hydrated.map((item) => ({
    product: item.product._id,
    name: item.name,
    productSlug: item.slug,
    sku: item.sku,
    variant: item.variant,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
  }));

  return { hydrated, items, totals, shippingAddress };
}

// ---- Standard checkout — creates the order, then redirects to the chosen
// payment provider's hosted checkout (Section 2.7/2.19: status only ever
// becomes "paid" via a verified webhook, never here) ----

exports.placeOrder = async (req, res, next) => {
  try {
    const built = await buildOrderFromCart(req);
    if (!built) return res.status(400).json({ error: "Your cart is empty" });

    const { items, totals, shippingAddress } = built;

    const provider = req.body.paymentProvider;
    const enabledProviders = await getAvailableProviders();
    if (!provider || !enabledProviders.includes(provider)) {
      return res.status(400).json({
        error: enabledProviders.length === 0
          ? "No payment providers are currently configured. Try 'Order via WhatsApp' instead."
          : `Select a valid payment method: ${enabledProviders.join(", ")}`,
      });
    }

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: req.user ? req.user._id : null,
      guestEmail: req.user ? undefined : req.body.guestEmail,
      guestPhone: req.user ? undefined : req.body.phone,
      items,
      subtotal: totals.subtotal,
      shippingFee: totals.shippingFee,
      tax: totals.tax,
      discount: totals.discount,
      total: totals.total,
      couponCode: totals.couponValid && req.session.couponCode ? req.session.couponCode : null,
      shippingAddress,
      status: "pending", // flips to "paid" only via a verified webhook (Section 2.7/2.19) — never here
      channel: "storefront",
      paymentProvider: provider,
    });

    if (totals.couponRecord) await recordCouponUse(totals.couponRecord._id);

    // Section 2.7 — the provider is handed only the order's already-computed
    // total (fixed server-side above); nothing from the client body is used
    // for the amount charged.
    const email = req.user ? req.user.email : req.body.guestEmail;
    const baseUrl = siteConfig.url;

    let paymentInit;
    try {
      paymentInit = await initiatePayment(order, provider, {
        successUrl: `${baseUrl}/order/${order.orderNumber}`,
        cancelUrl: `${baseUrl}/checkout`,
        callbackUrl: `${baseUrl}/order/${order.orderNumber}`,
        redirectUrl: `${baseUrl}/order/${order.orderNumber}`,
        email,
        phone: shippingAddress.phone,
        name: shippingAddress.recipientName,
      });
    } catch (paymentErr) {
      // Order already exists as "pending" — safe to leave it; the customer
      // can retry payment for the same order rather than losing the cart.
      console.error("Payment initiation failed for order", order.orderNumber, paymentErr);
      return res.status(502).json({
        error: "Could not start payment with the selected provider. Please try again or use WhatsApp checkout.",
        orderNumber: order.orderNumber,
      });
    }

    if (paymentInit.providerReference) {
      order.paymentReference = paymentInit.providerReference;
      await order.save();
    }

    cart.clearCart(req);
    delete req.session.couponCode;

    res.status(201).json({ success: true, orderNumber: order.orderNumber, redirectTo: paymentInit.redirectUrl });
  } catch (err) {
    next(err);
  }
};

// ---- WhatsApp checkout (Section 2.3) ----

exports.placeOrderWhatsApp = async (req, res, next) => {
  try {
    const built = await buildOrderFromCart(req);
    if (!built) return res.status(400).json({ error: "Your cart is empty" });

    const { items, totals, shippingAddress } = built;

    // Real Order ID is generated BEFORE the WhatsApp redirect, per spec —
    // never send an unrecorded order.
    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: req.user ? req.user._id : null,
      guestEmail: req.user ? undefined : req.body.guestEmail,
      guestPhone: req.user ? undefined : req.body.phone,
      items,
      subtotal: totals.subtotal,
      shippingFee: totals.shippingFee,
      tax: totals.tax,
      discount: totals.discount,
      total: totals.total,
      couponCode: totals.couponValid && req.session.couponCode ? req.session.couponCode : null,
      shippingAddress,
      status: "pending_whatsapp", // never auto-confirmed — admin progresses this manually (Section 2.3)
      channel: "whatsapp",
      paymentProvider: "manual",
      notes: req.body.preferredMethod || "",
    });

    if (totals.couponRecord) await recordCouponUse(totals.couponRecord._id);

    const message = buildWhatsAppOrderMessage(order, { baseUrl: siteConfig.url });
    const whatsappUrl = buildWhatsAppUrl(siteConfig.contact.whatsapp, message);

    cart.clearCart(req);
    delete req.session.couponCode;

    res.status(201).json({ success: true, orderNumber: order.orderNumber, whatsappUrl });
  } catch (err) {
    next(err);
  }
};

exports.showConfirmation = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });
    if (!order) return res.status(404).render("errors/404", { title: "Order not found" });

    res.render("order-confirmation", { title: "Order Confirmation", order });
  } catch (err) {
    next(err);
  }
};