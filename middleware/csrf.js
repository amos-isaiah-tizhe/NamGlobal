const { doubleCsrf } = require("csrf-csrf");

const env = require("../config/env");

const {
  generateCsrfToken,
  doubleCsrfProtection,
  invalidCsrfTokenError,
} = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET,
  getSessionIdentifier: (req) => req.session.id,
  cookieName: "nam_global_csrf",
  cookieOptions: {
    httpOnly: true,
    sameSite: "strict",
    secure: env.isProduction || env.isStaging,
    path: "/",
  },
  size: 64,
  getCsrfTokenFromRequest: (req) => req.body?._csrf || req.headers["x-csrf-token"],
});

/**
 * Attaches a fresh CSRF token to res.locals so every EJS form can render
 * `<input type="hidden" name="_csrf" value="<%= csrfToken %>">` without each
 * controller wiring it manually.
 *
 * Because sessions use `saveUninitialized: false` (Section 2.6 — don't set
 * a session cookie for anonymous visitors who never need one), an untouched
 * session is never persisted, so its `id` changes on every request. Since
 * the CSRF token is bound to `req.session.id` (getSessionIdentifier above),
 * that would break validation between the GET that renders the form and
 * the POST that submits it. Writing a harmless flag forces express-session
 * to persist this session and send the cookie, keeping the ID stable.
 */
function exposeCsrfToken(req, res, next) {
  if (!req.session.csrfInitialized) {
    req.session.csrfInitialized = true;
  }
  res.locals.csrfToken = generateCsrfToken(req, res);
  next();
}

module.exports = { doubleCsrfProtection, exposeCsrfToken, invalidCsrfTokenError };
