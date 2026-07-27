const express = require("express");
const router = express.Router();

const checkoutController = require("../controllers/checkoutController");
const validate = require("../middleware/validate");
const checkoutValidator = require("../validators/checkoutValidator");
const { doubleCsrfProtection } = require("../middleware/csrf");
const { checkoutLimiter } = require("../middleware/rateLimiters");

router.get("/checkout", checkoutController.showCheckout);

router.post(
  "/checkout",
  checkoutLimiter,
  doubleCsrfProtection,
  validate(checkoutValidator),
  checkoutController.placeOrder
);

router.post(
  "/checkout/whatsapp",
  checkoutLimiter,
  doubleCsrfProtection,
  validate(checkoutValidator),
  checkoutController.placeOrderWhatsApp
);

router.get("/order/:orderNumber", checkoutController.showConfirmation);

module.exports = router;
