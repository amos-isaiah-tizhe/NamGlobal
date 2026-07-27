const cart = require("../utils/cart");
const cartService = require("../services/cartService");

exports.showCart = async (req, res, next) => {
  try {
    const hydrated = await cartService.hydrateCart(cart.getCartItems(req));
    const totals = await cartService.computeTotals(hydrated, { couponCode: req.session.couponCode });

    res.render("cart", { title: "Your Cart", items: hydrated, totals, couponCode: req.session.couponCode || "" });
  } catch (err) {
    next(err);
  }
};

exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity, variant } = req.body;
    cart.addItem(req, productId, Math.max(1, parseInt(quantity, 10) || 1), variant || null);
    res.status(200).json({ success: true, itemCount: cart.getCartItems(req).length });
  } catch (err) {
    next(err);
  }
};

exports.updateItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity, variant } = req.body;
    cart.updateQuantity(req, productId, parseInt(quantity, 10) || 1, variant || null);

    const hydrated = await cartService.hydrateCart(cart.getCartItems(req));
    const totals = await cartService.computeTotals(hydrated, { couponCode: req.session.couponCode });
    res.status(200).json({ success: true, totals });
  } catch (err) {
    next(err);
  }
};

exports.removeItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    cart.removeItem(req, productId, req.body.variant || null);

    const hydrated = await cartService.hydrateCart(cart.getCartItems(req));
    const totals = await cartService.computeTotals(hydrated, { couponCode: req.session.couponCode });
    res.status(200).json({ success: true, totals });
  } catch (err) {
    next(err);
  }
};

exports.applyCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;
    const hydrated = await cartService.hydrateCart(cart.getCartItems(req));
    const totals = await cartService.computeTotals(hydrated, { couponCode: code });

    if (!totals.couponValid) {
      return res.status(400).json({ error: totals.couponError });
    }

    req.session.couponCode = code.toUpperCase();
    res.status(200).json({ success: true, totals });
  } catch (err) {
    next(err);
  }
};
