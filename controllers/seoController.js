const Product = require("../models/Product");
const Category = require("../models/Category");
const siteConfig = require("../config/siteConfig");

const STATIC_PATHS = ["/", "/contact", "/search"];

exports.sitemap = async (req, res, next) => {
  try {
    const [products, categories] = await Promise.all([
      Product.find({ status: "active" }, "slug updatedAt"),
      Category.find({ isActive: true }, "slug updatedAt"),
    ]);

    const urls = [
      ...STATIC_PATHS.map((path) => ({ loc: `${siteConfig.url}${path}`, lastmod: new Date().toISOString() })),
      ...categories.map((c) => ({ loc: `${siteConfig.url}/category/${c.slug}`, lastmod: c.updatedAt.toISOString() })),
      ...products.map((p) => ({ loc: `${siteConfig.url}/product/${p.slug}`, lastmod: p.updatedAt.toISOString() })),
    ];

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`),
      "</urlset>",
    ].join("\n");

    res.setHeader("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    next(err);
  }
};
