module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  // Section 2.19 — isomorphic-dompurify's dependency chain (jsdom ->
  // html-encoding-sniffer -> whatwg-encoding -> @exodus/bytes) ships an
  // ESM-only file Jest can't transform under CommonJS by default. This
  // broke every integration test that boots the full app (confirmed by
  // running the suite — three suites failed at module-load time, not from
  // any real assertion). See tests/__mocks__/isomorphic-dompurify.js for
  // the substitute used in tests only; production still uses the real package.
  moduleNameMapper: {
    "^isomorphic-dompurify$": "<rootDir>/tests/__mocks__/isomorphic-dompurify.js",
  },
  collectCoverageFrom: [
    "controllers/**/*.js",
    "services/**/*.js",
    "models/**/*.js",
    "middleware/**/*.js",
    "utils/**/*.js",
    "!**/node_modules/**",
  ],
  // Section 2.19 — "aim for 80%+ coverage on controllers/, services/, and
  // models/ related to orders, payments, and auth." Enforced narrowly on
  // those specific files rather than as a blanket global threshold, since a
  // 100%-covered contact form is worth less than a well-tested checkout flow.
  // These thresholds apply to `npm run test:coverage` (the FULL suite,
  // including the MongoDB-dependent integration tests in tests/integration/)
  // — running only the DB-less subset (e.g. in an environment with no
  // MongoDB) will under-report coverage on paymentService.js specifically,
  // since processPaymentEvent/issueRefund need a real Order document.
  coverageThreshold: {
    // Conservative number — the exact achievable percentage couldn't be
    // verified without a live MongoDB (not available in the environment
    // this test suite was originally written in). Adjust upward once a
    // real CI run reports the actual number; treat this as a floor that
    // should visibly increase over time, not a precisely-tuned target.
    "./services/paymentService.js": { statements: 40 },
    "./services/sessionKillSwitch.js": { statements: 60 },
    "./utils/passwordPolicy.js": { statements: 80 },
    "./utils/pagination.js": { statements: 80 },
  },
  testTimeout: 15000, // integration tests hitting a real (if slow) test DB get more headroom
  setupFilesAfterEnv: ["<rootDir>/tests/helpers/setup.js"],
};
