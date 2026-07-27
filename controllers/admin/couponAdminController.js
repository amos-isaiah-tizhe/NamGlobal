const Coupon = require("../../models/Coupon");

exports.list = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.render("admin/coupons/list", { title: "Coupons", layout: "layouts/admin", coupons });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    await Coupon.create({
      code: req.body.code,
      discountType: req.body.discountType,
      discountValue: Number(req.body.discountValue),
      minOrderValue: Number(req.body.minOrderValue) || 0,
      maxUses: req.body.maxUses ? Number(req.body.maxUses) : null,
      expiresAt: req.body.expiresAt || null,
    });
    res.redirect("/admin/coupons");
  } catch (err) {
    next(err);
  }
};

exports.toggleActive = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ error: "Not found" });
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json({ success: true, isActive: coupon.isActive });
  } catch (err) {
    next(err);
  }
};
