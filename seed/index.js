/**
 * seed/index.js
 *
 * Runs all dev/demo seed scripts. Gated behind an explicit NODE_ENV check
 * (Section 2.24 — "seed scripts must never be runnable against production
 * by accident"). Run with: `node seed/index.js`
 *
 * A --force flag is intentionally NOT provided for production — if this
 * ever needs to run against a production-like environment for a legitimate
 * reason (e.g. seeding real categories on first launch), do that as a
 * one-off reviewed script, not by bypassing this guard.
 */

require("../config/env");
const { connectDB, disconnectDB } = require("../config/database");

const seedCategories = require("./categories");
const seedBrands = require("./brands");
const seedProducts = require("./products");
const seedAdmin = require("./admin");

async function run() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to run seed scripts with NODE_ENV=production. Aborting.");
    process.exit(1);
  }

  await connectDB();

  await seedCategories();
  await seedBrands();
  await seedProducts();
  await seedAdmin();

  await disconnectDB();
  console.log("Seeding complete.");
}

run().catch((err) => {
  console.error("Seed run failed:", err);
  process.exit(1);
});
