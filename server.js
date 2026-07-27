const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const path = require("path");

const env = require("./config/env");
const siteConfig = require("./config/siteConfig");
const buildSessionMiddleware = require("./config/session");
const { connectDB, disconnectDB } = require("./config/database");
const passport = require("./config/passport");
const logger = require("./config/logger");
const { initSentry, captureException } = require("./config/sentry");

const { helmetMiddleware, mongoSanitizeMiddleware, hppMiddleware, cspNonceMiddleware } = require("./middleware/security");
const httpsRedirect = require("./middleware/httpsRedirect");
const requestLogger = require("./middleware/requestLogger");
const { generalLimiter } = require("./middleware/rateLimiters");
const { exposeCsrfToken, invalidCsrfTokenError } = require("./middleware/csrf");
const { organizationSchema } = require("./utils/structuredData");
const { cloudinaryResize } = require("./utils/cloudinaryUrl");
const { loadUser } = require("./middleware/auth");

const healthRoutes = require("./routes/health");
const indexRoutes = require("./routes/index");
const contactRoutes = require("./routes/contact");
const authRoutes = require("./routes/auth");
const oauthRoutes = require("./routes/oauth");
const catalogRoutes = require("./routes/catalog");
const cartRoutes = require("./routes/cart");
const checkoutRoutes = require("./routes/checkout");
const webhookRoutes = require("./routes/webhooks");
const adminRoutes = require("./routes/admin");
const accountRoutes = require("./routes/account");
const legalRoutes = require("./routes/legal");

initSentry(); // no-op unless SENTRY_DSN is set (Section 2.17 / 2.21 free tier)

async function createApp() {
  // Stage 4 needs the database for real (users, lockout state, 2FA secrets) —
  // Stage 1-3 never required a live connection; this is the first stage where it does.
  await connectDB();

  const app = express();

  // ---- Trust the reverse proxy (Cloudflare Tunnel / load balancer) so
  // req.secure and req.ip reflect X-Forwarded-* headers correctly (Section 2.17) ----
  app.set("trust proxy", 1);

  // ---- Structured logging with per-request correlation IDs (Section 2.17) ----
  app.use(requestLogger);

  // ---- Health/readiness — mounted before rate limiting/session/CSRF so
  // uptime monitors (Section 2.21 — UptimeRobot) always get a fast, cheap
  // answer regardless of app-level throttling or dependency hiccups
  // elsewhere in the chain (Section 2.17). ----
  app.use("/", healthRoutes);

  // ---- HTTPS enforcement backstop (Section 2.6/2.7) ----
  app.use(httpsRedirect);

  // ---- Per-request CSP nonce, must run before helmet reads it (Section 2.10) ----
  app.use(cspNonceMiddleware);

  // ---- Security headers + strict CSP (Section 2.8) ----
  app.use(helmetMiddleware);

  // ---- Response compression (Section 2.9) ----
  app.use(compression());

  // ---- View engine ----
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));
  app.use(expressLayouts);
  app.set("layout", "layouts/main");

  // ---- Static assets ----
  app.use(express.static(path.join(__dirname, "public")));

  // ---- Payment provider webhooks — MUST be mounted before the app-wide
  // body parsers below. Each route parses its own body with express.raw()
  // so signature verification (Section 2.7) sees the exact bytes the
  // provider signed, not a re-serialized object. ----
  app.use("/", webhookRoutes);

  // ---- Body parsing. Global limit here is a safety net; Section 2.7 calls
  // for tighter *per-endpoint* limits, added as those endpoints are built
  // (e.g. image upload routes in Stage 8 will set a larger, explicit limit). ----
  app.use(express.urlencoded({ extended: true, limit: "100kb" }));
  app.use(express.json({ limit: "100kb" }));

  // ---- Cookie parsing (required by the CSRF double-submit-cookie pattern) ----
  app.use(cookieParser());

  // ---- NoSQL injection + HTTP parameter pollution guards (Section 2.6/2.7) ----
  app.use(mongoSanitizeMiddleware);
  app.use(hppMiddleware);

  // ---- Sessions — Redis-backed (fallback: connect-mongo). Never MemoryStore. ----
  const sessionMiddleware = await buildSessionMiddleware();
  app.use(sessionMiddleware);

  // ---- CSRF token available to every view/form; enforcement
  // (doubleCsrfProtection) is applied per state-changing route ----
  app.use(exposeCsrfToken);

  // ---- Passport (OAuth strategies only — Section 2.7b). We don't use
  // passport's own session serialization; req.session.userId (set by
  // authController/oauthController) is the single source of truth for who's
  // logged in, so local and OAuth login share identical lockout/2FA logic. ----
  app.use(passport.initialize());

  // ---- Loads req.user / res.locals.user from the session on every request ----
  app.use(loadUser);

  // ---- General rate limit (Section 2.6/2.7). Stricter per-route limiters
  // — authLimiter, formLimiter, checkoutLimiter — are applied on top of
  // this in their respective route files. ----
  app.use(generalLimiter);

  // ---- Brand config + default SEO locals available to every view (Section 2.10) ----
  app.use((req, res, next) => {
    res.locals.site = siteConfig;
    res.locals.canonicalUrl = `${siteConfig.url}${req.originalUrl.split("?")[0]}`;
    res.locals.baseStructuredData = organizationSchema();
    res.locals.cloudinaryResize = cloudinaryResize; // Section 2.9 responsive images
    next();
  });

  // ---- Routes ----
  app.use("/", indexRoutes);
  app.use("/", contactRoutes);
  app.use("/", authRoutes);
  app.use("/", oauthRoutes);
  app.use("/", catalogRoutes);
  app.use("/", cartRoutes);
  app.use("/", checkoutRoutes);
  app.use("/", adminRoutes);
  app.use("/", accountRoutes);
  app.use("/", legalRoutes);

  // ---- 404 ----
  app.use((req, res) => {
    res.status(404).send("Not found");
  });

  // ---- Centralized error handling (Section 2.6), structured via Pino and
  // forwarded to Sentry if configured (Section 2.17). ----
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    if (err === invalidCsrfTokenError || err?.code === "EBADCSRFTOKEN") {
      req.log?.warn({ path: req.originalUrl }, "Invalid CSRF token");
      return res.status(403).json({ error: "Invalid or missing CSRF token" });
    }
    req.log?.error({ err }, "Unhandled request error");
    captureException(err);
    res.status(500).send("Something went wrong");
  });

  return app;
}

async function start() {
  const app = await createApp();
  const port = process.env.PORT || 3000;

  const server = app.listen(port, () => {
    logger.info(`[${env.NODE_ENV}] ${siteConfig.name} listening on port ${port}`);
  });

  /**
   * Section 2.17 — graceful shutdown: stop accepting new connections, let
   * in-flight requests finish, then close the DB/Redis connections cleanly.
   * Matters for zero-downtime PM2 reloads (Section 2.22) and rolling
   * deploys generally — a hard kill mid-request drops that request; this
   * doesn't.
   */
  let shuttingDown = false;

  async function gracefulShutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info(`${signal} received, draining in-flight requests...`);

    const forceExitTimer = setTimeout(() => {
      logger.error("Graceful shutdown timed out after 10s — forcing exit");
      process.exit(1);
    }, 10000);

    server.close(async () => {
      try {
        await disconnectDB();
        logger.info("MongoDB connection closed");
      } catch (err) {
        logger.error({ err }, "Error closing MongoDB connection");
      }

      clearTimeout(forceExitTimer);
      logger.info("Shutdown complete");
      process.exit(0);
    });
  }

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  return server;
}

if (require.main === module) {
  start().catch((err) => {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  });
}

module.exports = { createApp, start };
