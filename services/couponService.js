const Coupon = require("../models/Coupon");

/**
 * Returns { valid, discount, error }. Called both when the cart page shows
 * a preview discount and again at order-placement time (Section 2.7 — never
 * trust a discount amount carried over from an earlier request; re-validate
 * against the live coupon record every time money is calculated).
 */
async function validateAndComputeDiscount(code, subtotal) {
  if (!code) return { valid: true, discount: 0 };

  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
  if (!coupon) return { valid: false, discount: 0, error: "Invalid or expired coupon code" };

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { valid: false, discount: 0, error: "This coupon has expired" };
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, discount: 0, error: "This coupon has reached its usage limit" };
  }
  if (subtotal < coupon.minOrderValue) {
    return {
      valid: false,
      discount: 0,
      error: `This coupon requires a minimum order of ₦${coupon.minOrderValue.toLocaleString()}`,
    };
  }

  const discount =
    coupon.discountType === "percentage" ? Math.round((subtotal * coupon.discountValue) / 100) : coupon.discountValue;

  return { valid: true, discount: Math.min(discount, subtotal), coupon };
}

async function recordCouponUse(couponId) {
  await Coupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } });
}

module.exports = { validateAndComputeDiscount, recordCouponUse };
