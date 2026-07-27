const express = require("express");
const router = express.Router();

const legalController = require("../controllers/legalController");
const { doubleCsrfProtection } = require("../middleware/csrf");
const { formLimiter } = require("../middleware/rateLimiters");

router.get("/privacy-policy", legalController.showPrivacyPolicy);
router.get("/terms", legalController.showTerms);
router.get("/cookie-policy", legalController.showCookiePolicy);

router.post("/privacy/data-request", formLimiter, doubleCsrfProtection, legalController.submitDataRequest);

module.exports = router;
