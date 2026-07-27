const bcrypt = require("bcrypt");
const User = require("../models/User");

/**
 * Seeds the Section 1.10 development admin account.
 *
 * IMPORTANT: this is a dev-only seed value. The password is bcrypt-hashed
 * here (never stored in plaintext even in dev), but it's still a known
 * value from a document — Stage 4 (Auth) must force a password change on
 * this account's first real login, and production deployments should
 * rotate it immediately per Section 1.10's warning.
 */
async function seedAdmin() {
  const email = process.env.ADMIN_DEFAULT_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_DEFAULT_PASSWORD;
  const name = process.env.ADMIN_DEFAULT_NAME || "Admin";

  if (!email || !password) {
    console.warn("ADMIN_DEFAULT_EMAIL / ADMIN_DEFAULT_PASSWORD not set — skipping admin seed.");
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    console.log("Admin account already exists — skipping.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [firstName, ...rest] = name.split(" ");

  await User.create({
    firstName: firstName || "Admin",
    lastName: rest.join(" ") || "User",
    email,
    passwordHash,
    role: "super_admin",
    authProvider: "local",
    isActive: true,
  });

  console.log(`Admin account seeded: ${email} (role: super_admin)`);
}

module.exports = seedAdmin;
