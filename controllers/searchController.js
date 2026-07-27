const productService = require("../services/productService");

exports.showResults = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.render("search", { title: "Search", query: "", products: [], pagination: null });

    const { products, pagination } = await productService.searchProducts(q, { page: req.query.page });

    res.render("search", { title: `Search results for "${q}"`, query: q, products, pagination });
  } catch (err) {
    next(err);
  }
};

/** GET /api/v1/search/suggest?q= — Section 2.5 autocomplete, Section 2.17 versioned API surface */
exports.suggest = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (q.length < 2) return res.json({ suggestions: [] });

    const products = await productService.suggest(q, 8);
    res.json({
      suggestions: products.map((p) => ({
        name: p.name,
        slug: p.slug,
        price: p.price,
        image: p.images?.[0] || null,
      })),
    });
  } catch (err) {
    next(err);
  }
};
