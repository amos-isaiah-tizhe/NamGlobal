const Product = require("../models/Product");
const { getShippingFee, getTax } = require("../config/checkoutRates");
const { validateAndComputeDiscount } = require("./couponService");

/**
 * Joins the session cart's {productId, quantity, variant} entries against
 * live Product documents. Silently drops items whose product no longer
 * exists or is inactive, and clamps quantity to available stock — the cart
 * page should reflect reality, not a stale snapshot.
 */
async function hydrateCart(cartItems) {
  if (!cartItems || cartItems.length === 0) return [];

  const productIds = cartItems.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds }, status: "active" });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const hydrated = [];
  for (const item of cartItems) {
    const product = productMap.get(item.productId);
    if (!product) continue; // product deleted/deactivated since it was added

    const quantity = Math.min(item.quantity, Math.max(product.stock, 0));
    if (quantity <= 0) continue; // out of stock

    const unitPrice = product.discountPrice ?? product.price;

    hydrated.push({
      product,
      productId: product._id.toString(),
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      image: product.images?.[0] || null,
      variant: item.variant || null,
      unitPrice,
      quantity,
      lineTotal: unitPrice * quantity,
      maxStock: product.stock,
    });
  }

  return hydrated;
}

/**
 * Computes the full order-summary totals from a hydrated cart. Used both to
 * render the cart/checkout page and, separately, re-run at order-placement
 * time against a freshly re-hydrated cart — the two calls never share a
 * cached total (Section 2.7).
 */
async function computeTotals(hydratedItems, { couponCode, shippingState } = {}) {
  const subtotal = hydratedItems.reduce((sum, item) => sum + item.lineTotal, 0);

  const couponResult = await validateAndComputeDiscount(couponCode, subtotal);
  const discount = couponResult.valid ? couponResult.discount : 0;

  const shippingFee = shippingState ? getShippingFee(shippingState) : 0;
  const taxableAmount = Math.max(subtotal - discount, 0);
  const tax = getTax(taxableAmount);

  const total = Math.max(taxableAmount + tax + shippingFee, 0);

  return {
    subtotal,
    discount,
    shippingFee,
    tax,
    total,
    couponValid: couponResult.valid,
    couponError: couponResult.error || null,
    couponRecord: couponResult.coupon || null,
  };
}

module.exports = { hydrateCart, computeTotals };
