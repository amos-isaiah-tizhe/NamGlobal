const express = require("express");
const router = express.Router();

const contactController = require("../controllers/contactController");
const validate = require("../middleware/validate");
const contactValidator = require("../validators/contactValidator");
const { formLimiter } = require("../middleware/rateLimiters");
const { doubleCsrfProtection } = require("../middleware/csrf");

router.get("/contact", contactController.showForm);

router.post(
  "/contact",
  formLimiter,
  doubleCsrfProtection,
  validate(contactValidator),
  contactController.submit
);

module.exports = router;
