const categoryService = require("../services/categoryService");
const productService = require("../services/productService");
const { breadcrumbSchema } = require("../utils/structuredData");
const siteConfig = require("../config/siteConfig");

exports.showCategory = async (req, res, next) => {
  try {
    const category = await categoryService.getBySlug(req.params.slug);
    if (!category) return res.status(404).render("errors/404", { title: "Category not found" });

    const { page, sort, brand, minPrice, maxPrice, q } = req.query;

    const { products, pagination } = await productService.listByCategory(category._id, {
      page,
      sort,
      brand,
      minPrice,
      maxPrice,
      search: q,
    });

    res.render("category", {
      title: category.name,
      metaDescription:
        category.description ||
        `Shop ${category.name} at ${siteConfig.name} — quality phones and gadgets, competitive prices, nationwide delivery across Nigeria.`,
      structuredData: [
        breadcrumbSchema([
          { name: "Home", url: siteConfig.url },
          { name: category.name, url: `${siteConfig.url}/category/${category.slug}` },
        ]),
      ],
      category,
      products,
      pagination,
      activeSort: sort || "newest",
      activeSearch: q || "",
    });
  } catch (err) {
    next(err);
  }
};
