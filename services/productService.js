const Product = require("../models/Product");
const { buildPagination } = require("../utils/pagination");
const { getOrSet } = require("../config/cache");

const ACTIVE_ONLY = { status: "active" };

// Homepage sections are the highest-traffic reads on the whole site and
// change rarely (only on an admin edit), so they're cached longest.
const HOMEPAGE_TTL_SECONDS = 300;
const CATEGORY_TTL_SECONDS = 120;
const PRODUCT_DETAIL_TTL_SECONDS = 300;

// ---- Homepage sections (Section 2.3), Redis-cached (Section 2.17) ----

function getFeatured(limit = 8) {
  return getOrSet(["home", "featured", limit], HOMEPAGE_TTL_SECONDS, () =>
    Product.find({ ...ACTIVE_ONLY, featured: true }).sort({ createdAt: -1 }).limit(limit).lean()
  );
}

function getNewArrivals(limit = 8) {
  return getOrSet(["home", "newArrivals", limit], HOMEPAGE_TTL_SECONDS, () =>
    Product.find({ ...ACTIVE_ONLY, newArrival: true }).sort({ createdAt: -1 }).limit(limit).lean()
  );
}

function getFlashSale(limit = 8) {
  return getOrSet(["home", "flashSale", limit], HOMEPAGE_TTL_SECONDS, () =>
    Product.find({ ...ACTIVE_ONLY, flashSale: true }).sort({ createdAt: -1 }).limit(limit).lean()
  );
}

function getTrending(limit = 8) {
  return getOrSet(["home", "trending", limit], HOMEPAGE_TTL_SECONDS, () =>
    Product.find({ ...ACTIVE_ONLY, trending: true }).sort({ rating: -1 }).limit(limit).lean()
  );
}

function getBestsellers(limit = 8) {
  return getOrSet(["home", "bestsellers", limit], HOMEPAGE_TTL_SECONDS, () =>
    Product.find({ ...ACTIVE_ONLY, bestseller: true }).sort({ rating: -1 }).limit(limit).lean()
  );
}

function getLatest(limit = 8) {
  return getOrSet(["home", "latest", limit], HOMEPAGE_TTL_SECONDS, () =>
    Product.find(ACTIVE_ONLY).sort({ createdAt: -1 }).limit(limit).lean()
  );
}

// ---- Category listing (Section 2.3 — filter/sort/paginate/search) ----

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  rating: { rating: -1 },
};

async function listByCategory(categoryId, { page = 1, limit = 20, sort = "newest", brand, minPrice, maxPrice, search } = {}) {
  // Free-text search results change too situationally to benefit from
  // caching the same way a stable filter/sort combination does — skip the
  // cache for search queries, cache everything else.
  if (search) return listByCategoryUncached(categoryId, { page, limit, sort, brand, minPrice, maxPrice, search });

  const cacheKey = ["category", categoryId, page, limit, sort, brand || "", minPrice || "", maxPrice || ""];
  return getOrSet(cacheKey, CATEGORY_TTL_SECONDS, () => listByCategoryUncached(categoryId, { page, limit, sort, brand, minPrice, maxPrice }));
}

async function listByCategoryUncached(categoryId, { page = 1, limit = 20, sort = "newest", brand, minPrice, maxPrice, search } = {}) {
  const filter = { ...ACTIVE_ONLY, category: categoryId };

  if (brand) filter.brand = brand;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (search) filter.$text = { $search: search };

  const totalCount = await Product.countDocuments(filter);
  const pagination = buildPagination(page, limit, totalCount);

  const products = await Product.find(filter)
    .sort(SORT_OPTIONS[sort] || SORT_OPTIONS.newest)
    .skip(pagination.skip)
    .limit(pagination.limit)
    .populate("brand", "name slug")
    .lean();

  return { products, pagination };
}

// ---- Product detail, Redis-cached ----

function getBySlug(slug) {
  return getOrSet(["product", slug], PRODUCT_DETAIL_TTL_SECONDS, () =>
    Product.findOne({ slug, status: { $ne: "draft" } })
      .populate("category", "name slug")
      .populate("brand", "name slug")
      .populate("reviews.user", "firstName lastName")
      .lean()
  );
}

function getRelated(product, limit = 6) {
  return Product.find({
    ...ACTIVE_ONLY,
    category: product.category,
    _id: { $ne: product._id },
  }).limit(limit);
}

function getByIds(ids) {
  return Product.find({ _id: { $in: ids }, ...ACTIVE_ONLY });
}

// ---- Search (Section 2.5) — not cached, same reasoning as category search above ----

async function searchProducts(query, { page = 1, limit = 20 } = {}) {
  const filter = { ...ACTIVE_ONLY, $text: { $search: query } };

  const totalCount = await Product.countDocuments(filter);
  const pagination = buildPagination(page, limit, totalCount);

  const products = await Product.find(filter, { score: { $meta: "textScore" } })
    .sort({ score: { $meta: "textScore" } })
    .skip(pagination.skip)
    .limit(pagination.limit);

  return { products, pagination };
}

/** Lightweight autocomplete — name matches only, capped small (Section 2.5). */
function suggest(query, limit = 8) {
  return Product.find(
    { ...ACTIVE_ONLY, name: { $regex: escapeRegex(query), $options: "i" } },
    { name: 1, slug: 1, images: 1, price: 1 }
  ).limit(limit);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  getFeatured,
  getNewArrivals,
  getFlashSale,
  getTrending,
  getBestsellers,
  getLatest,
  listByCategory,
  getBySlug,
  getRelated,
  getByIds,
  searchProducts,
  suggest,
};
