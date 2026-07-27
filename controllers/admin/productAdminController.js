const Product = require("../../models/Product");
const Category = require("../../models/Category");
const Brand = require("../../models/Brand");
const AuditLog = require("../../models/AuditLog");
const { bumpCacheVersion } = require("../../config/cache");

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 20;
    const [products, totalCount] = await Promise.all([
      Product.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("category", "name"),
      Product.countDocuments(),
    ]);

    res.render("admin/products/list", {
      title: "Products",
      layout: "layouts/admin",
      products,
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    });
  } catch (err) {
    next(err);
  }
};

exports.showCreateForm = async (req, res, next) => {
  try {
    const [categories, brands] = await Promise.all([Category.find({ isActive: true }), Brand.find({ isActive: true })]);
    res.render("admin/products/form", { title: "New Product", layout: "layouts/admin", product: null, categories, brands });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const product = await Product.create(buildProductPayload(req.body));

    await AuditLog.create({
      actor: req.user._id,
      action: "product.created",
      targetType: "Product",
      targetId: product._id,
      metadata: { name: product.name },
    });

    await bumpCacheVersion(); // Section 2.17 — explicit invalidation on catalog writes

    res.redirect("/admin/products");
  } catch (err) {
    next(err);
  }
};

exports.showEditForm = async (req, res, next) => {
  try {
    const [product, categories, brands] = await Promise.all([
      Product.findById(req.params.id),
      Category.find({ isActive: true }),
      Brand.find({ isActive: true }),
    ]);
    if (!product) return res.status(404).render("errors/404", { title: "Product not found" });

    res.render("admin/products/form", { title: "Edit Product", layout: "layouts/admin", product, categories, brands });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).render("errors/404", { title: "Product not found" });

    const priceChanged = Number(req.body.price) !== product.price;

    Object.assign(product, buildProductPayload(req.body));
    await product.save();

    await AuditLog.create({
      actor: req.user._id,
      action: priceChanged ? "product.price_updated" : "product.updated",
      targetType: "Product",
      targetId: product._id,
      metadata: { name: product.name },
    });

    await bumpCacheVersion();

    res.redirect("/admin/products");
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    product.status = "discontinued"; // soft delete — never hard-delete, order history still references this product
    await product.save();

    await AuditLog.create({
      actor: req.user._id,
      action: "product.discontinued",
      targetType: "Product",
      targetId: product._id,
      metadata: { name: product.name },
    });

    await bumpCacheVersion();

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

function buildProductPayload(body) {
  return {
    name: body.name,
    category: body.category,
    brand: body.brand || undefined,
    price: Number(body.price),
    discountPrice: body.discountPrice ? Number(body.discountPrice) : undefined,
    stock: Number(body.stock) || 0,
    sku: body.sku,
    shortDescription: body.shortDescription,
    description: body.description,
    status: body.status || "draft",
    featured: body.featured === "on",
    trending: body.trending === "on",
    flashSale: body.flashSale === "on",
    newArrival: body.newArrival === "on",
    bestseller: body.bestseller === "on",
  };
}
