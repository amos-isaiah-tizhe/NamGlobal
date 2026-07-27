const express = require("express");
const router = express.Router();

const categoryController = require("../controllers/categoryController");
const productController = require("../controllers/productController");
const searchController = require("../controllers/searchController");
const wishlistController = require("../controllers/wishlistController");
const newsletterController = require("../controllers/newsletterController");
const seoController = require("../controllers/seoController");

const { requireAuth } = require("../middleware/auth");
const { doubleCsrfProtection } = require("../middleware/csrf");
const { formLimiter } = require("../middleware/rateLimiters");

router.get("/sitemap.xml", seoController.sitemap);

router.get("/search", searchController.showResults);
router.get("/api/v1/search/suggest", searchController.suggest); // Section 2.17 versioned API surface

router.get("/category/:slug", categoryController.showCategory);
router.get("/product/:slug", productController.showProduct);

router.post("/wishlist/:productId/toggle", requireAuth, doubleCsrfProtection, wishlistController.toggle);

router.post("/newsletter/subscribe", formLimiter, doubleCsrfProtection, newsletterController.subscribe);

module.exports = router;
