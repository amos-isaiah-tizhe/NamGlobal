const express = require("express");
const router = express.Router();
const passport = require("../config/passport");
const { completeOAuthLogin } = require("../controllers/oauthController");

// ---- Google OAuth — customer-facing storefront login/register ----
router.get("/auth/google", passport.authenticate("google", { session: false, scope: ["profile", "email"] }));

router.get(
  "/auth/google/callback",
  (req, res, next) => passport.authenticate("google", { session: false }, completeOAuthLogin(req, res, "/account"))(req, res, next)
);

// ---- GitHub OAuth — internal developer tooling only, never the customer
// storefront (Section 2.7b). Kept on its own /internal prefix so it's easy
// to isolate further (e.g. a separate CSP/rate limit) when that tooling
// actually gets built. ----
router.get(
  "/internal/auth/github",
  passport.authenticate("github", { session: false, scope: ["read:org", "user:email"] })
);

router.get(
  "/internal/auth/github/callback",
  (req, res, next) =>
    passport.authenticate("github", { session: false }, completeOAuthLogin(req, res, "/internal"))(req, res, next)
);

module.exports = router;
