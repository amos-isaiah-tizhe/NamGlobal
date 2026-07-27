const helmet = require("helmet");
const crypto = require("crypto");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");

/**
 * Section 2.10 (structured data / JSON-LD) needs an inline <script
 * type="application/ld+json"> tag on product/category/home pages. Rather
 * than weaken script-src to 'unsafe-inline' (which would defeat the point
 * of Section 2.8's CSP for every other script on the page), each request
 * gets its own random nonce; only a <script> tag carrying that exact nonce
 * attribute is allowed to execute. Regular page scripts stay on 'self' and
 * never need the nonce at all.
 */
function cspNonceMiddleware(req, res, next) {
  res.locals.cspNonce = crypto.randomBytes(16).toString("base64");
  next();
}

/**
 * Section 2.8 — exact CSP required by the spec, extended with a per-request
 * nonce for structured-data script tags only (see above).
 */
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  // HSTS — enforced once the app is actually served over HTTPS (production/staging,
  // typically behind Cloudflare Tunnel per Section 2.7). Harmless in dev.
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  crossOriginEmbedderPolicy: false, // avoid breaking Cloudinary image loads
});

// Section 2.6/2.7 — strip any operators ($gt, $ne, etc.) from user input to
// prevent NoSQL injection in query/body/params.
const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: "_",
});

// Section 2.7 — reject duplicate query-string parameters that could be used
// to smuggle unexpected array values into a handler expecting a scalar.
const hppMiddleware = hpp();

module.exports = { helmetMiddleware, mongoSanitizeMiddleware, hppMiddleware, cspNonceMiddleware };
