// Loaded once per test file via jest.config.js's setupFilesAfterEnv.
// Section 2.24 — tests run against a dedicated test environment, never
// staging/production credentials or live payment-provider keys.
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env.test") });

// Fallbacks so unit tests that don't touch the DB/Redis at all still have
// the bare minimum config/env.js requires to load without throwing.
process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.SITE_NAME = process.env.SITE_NAME || "Nam Global";
process.env.SITE_URL = process.env.SITE_URL || "https://namsglobal.com";
process.env.CONTACT_EMAIL = process.env.CONTACT_EMAIL || "hello@namsglobal.com";
process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test-only-secret-do-not-use-elsewhere";
