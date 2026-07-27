const Sentry = require("@sentry/node");
const env = require("./env");

let initialized = false;

function initSentry() {
  if (!process.env.SENTRY_DSN) return; // optional — Section 2.21 free tier, but genuinely optional locally too

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.isProduction ? 0.1 : 0,
  });
  initialized = true;
}

function captureException(err) {
  if (initialized) Sentry.captureException(err);
}

module.exports = { initSentry, captureException };
