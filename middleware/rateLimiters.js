const rateLimit = require("express-rate-limit");

/**
 * Section 2.6/2.7 rate limiting. These are the application-level limits;
 * Section 2.7's Cloudflare WAF rate-limiting rules on /login, /register,
 * and /checkout are a network-level backstop on top of these (Stage 11),
 * not a replacement.
 *
 * Counters currently live in-process (fine for a single instance). Stage 10
 * moves these onto a Redis-backed store (rate-limit-redis) so limits stay
 * consistent across multiple instances (Section 2.17).
 */

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// Stricter limiter for auth endpoints — pairs with account lockout (Stage 4)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait before trying again." },
});

// Contact/newsletter forms — generous enough for real use, tight enough to
// blunt scripted spam submissions
const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions from this address. Please try again later." },
});

// Checkout — separate from the general limiter so legitimate high-traffic
// browsing never throttles someone mid-purchase, while still capping abuse
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many checkout attempts. Please try again shortly." },
});

// Admin dashboard — separate, stricter limit from general storefront traffic
// (Section 2.7 — admin-surface isolation gets its own rate limits)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin requests. Please slow down." },
});

module.exports = { generalLimiter, authLimiter, formLimiter, checkoutLimiter, adminLimiter };
