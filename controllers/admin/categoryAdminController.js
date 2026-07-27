const Category = require("../../models/Category");
const { bumpCacheVersion } = require("../../config/cache");

exports.list = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.render("admin/categories/list", { title: "Categories", layout: "layouts/admin", categories });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    await Category.create({ name: req.body.name, description: req.body.description });
    await bumpCacheVersion(); // Section 2.17 — explicit invalidation on catalog writes
    res.redirect("/admin/categories");
  } catch (err) {
    next(err);
  }
};

exports.toggleActive = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: "Not found" });
    category.isActive = !category.isActive;
    await category.save();
    await bumpCacheVersion();
    res.json({ success: true, isActive: category.isActive });
  } catch (err) {
    next(err);
  }
};
