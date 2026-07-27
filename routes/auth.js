const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimiters");
const { doubleCsrfProtection } = require("../middleware/csrf");
const { requireAuth } = require("../middleware/auth");

router.get("/register", authController.showRegisterForm);
router.post("/register", authLimiter, doubleCsrfProtection, authController.register);

router.get("/login", authController.showLoginForm);
router.post("/login", authLimiter, doubleCsrfProtection, authController.login);

// 2FA enrollment (admin/staff mandatory, customers optional) — Section 2.7
router.post("/account/2fa/setup", requireAuth, authController.setupTwoFactor);
router.post("/account/2fa/confirm", requireAuth, doubleCsrfProtection, authController.verifyTwoFactorSetup);

// 2FA challenge during login (separate from requireAuth since the session
// is intentionally in a "pending" state at this point)
router.post("/login/2fa", authLimiter, doubleCsrfProtection, authController.verifyTwoFactorLogin);

router.post("/logout", doubleCsrfProtection, authController.logout);

module.exports = router;
