const productService = require("../services/productService");
const { trackView, getRecentlyViewedIds } = require("../utils/recentlyViewed");
const { productSchema, breadcrumbSchema } = require("../utils/structuredData");
const siteConfig = require("../config/siteConfig");

exports.showProduct = async (req, res, next) => {
  try {
    const product = await productService.getBySlug(req.params.slug);
    if (!product) return res.status(404).render("errors/404", { title: "Product not found" });

    const [related, recentlyViewedProducts] = await Promise.all([
      productService.getRelated(product, 6),
      productService.getByIds(getRecentlyViewedIds(req, product._id)),
    ]);

    trackView(req, product._id);

    const isWishlisted = req.user ? req.user.wishlist.some((id) => id.toString() === product._id.toString()) : false;

    res.render("product", {
      title: product.name,
      metaDescription: (product.shortDescription || product.description || `${product.name} available at ${siteConfig.name}.`).slice(0, 160),
      ogImage: product.images && product.images[0] ? product.images[0] : undefined,
      structuredData: [
        productSchema(product),
        breadcrumbSchema([
          { name: "Home", url: siteConfig.url },
          { name: product.category.name, url: `${siteConfig.url}/category/${product.category.slug}` },
          { name: product.name, url: `${siteConfig.url}/product/${product.slug}` },
        ]),
      ],
      product,
      related,
      recentlyViewedProducts,
      isWishlisted,
    });
  } catch (err) {
    next(err);
  }
};
