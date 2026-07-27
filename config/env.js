/**
 * config/env.js
 *
 * Central environment loader.
 *
 * - development/staging: loads variables from a local .env file (via dotenv).
 * - production: does NOT read a .env file. Section 2.7 requires production
 *   secrets to come from a secrets manager (AWS Secrets Manager, Doppler, Vault,
 *   or the hosting platform's own env-var injection e.g. Render/Railway/Fly).
 *   Those platforms already inject variables into process.env before the app
 *   boots, so this loader simply skips dotenv in that case.
 *
 * Every other module should read config through config/siteConfig.js rather
 * than touching process.env directly, so there is one place that knows where
 * values come from.
 */

const path = require("path");

const NODE_ENV = process.env.NODE_ENV || "development";

if (NODE_ENV !== "production") {
  require("dotenv").config({
    path: path.resolve(process.cwd(), ".env"),
  });
}

/**
 * Fields that must be present for the app to boot at all, in every environment.
 * Stage 1 keeps this list intentionally short (just enough for a bootable app);
 * later stages (Data Layer, Payments, Auth) will extend REQUIRED_IN_PRODUCTION
 * as those subsystems come online, rather than demanding secrets before
 * anything actually uses them.
 */
const REQUIRED_ALWAYS = ["SITE_NAME", "SITE_URL", "CONTACT_EMAIL"];

const REQUIRED_IN_PRODUCTION = [
  // Stage 2+ will add MONGODB_URI, SESSION_SECRET, REDIS_URL, etc. here as
  // each subsystem is actually wired up — see the Stage report for what's
  // deliberately deferred.
];

function assertRequiredVars() {
  const missing = REQUIRED_ALWAYS.filter((key) => !process.env[key]);

  if (NODE_ENV === "production") {
    missing.push(...REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]));
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Check .env.example for the full list.`
    );
  }
}

assertRequiredVars();

module.exports = {
  NODE_ENV,
  isProduction: NODE_ENV === "production",
  isStaging: NODE_ENV === "staging",
  isDevelopment: NODE_ENV === "development",
};
