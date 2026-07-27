const express = require("express");
const router = express.Router();

const cartController = require("../controllers/cartController");
const { doubleCsrfProtection } = require("../middleware/csrf");

router.get("/cart", cartController.showCart);
router.post("/cart/add", doubleCsrfProtection, cartController.addToCart);
router.post("/cart/item/:productId", doubleCsrfProtection, cartController.updateItem);
router.delete("/cart/item/:productId", doubleCsrfProtection, cartController.removeItem);
router.post("/cart/coupon", doubleCsrfProtection, cartController.applyCoupon);

module.exports = router;
