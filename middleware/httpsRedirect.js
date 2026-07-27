const env = require("../config/env");

/**
 * Redirects HTTP -> HTTPS in production/staging. Relies on `app.set("trust
 * proxy", 1)` being set in server.js so `req.secure` reflects the
 * X-Forwarded-Proto header set by Cloudflare/the reverse proxy (Section
 * 2.17 — "Terminate TLS at a reverse proxy... redirect all HTTP to HTTPS at
 * that layer"). This middleware is the application-level backstop in case
 * that layer is ever misconfigured.
 */
function httpsRedirect(req, res, next) {
  if (!env.isProduction && !env.isStaging) return next();
  if (req.secure) return next();
  return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
}

module.exports = httpsRedirect;
