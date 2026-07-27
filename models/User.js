const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: "Home" },
    recipientName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: "Nigeria" },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true }
);

// Section 2.7a — granular RBAC roles, not just "admin vs customer"
const ROLES = ["customer", "content_editor", "support_staff", "store_manager", "super_admin"];

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },

    // Null when the account was created via OAuth-only (Section 2.7b)
    passwordHash: { type: String, default: null },

    role: { type: String, enum: ROLES, default: "customer", index: true },

    // Section 2.7b — OAuth provider tracking
    authProvider: { type: String, enum: ["local", "google", "github"], default: "local" },
    googleId: { type: String, default: null, index: true, sparse: true },
    githubId: { type: String, default: null, index: true, sparse: true },

    // Section 2.7 — 2FA (mandatory for admin/staff, optional for customers). Populated in Stage 4.
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: null, select: false },

    // Section 2.7 — account lockout tracking
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },

    isActive: { type: Boolean, default: true },

    addresses: [addressSchema],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

    // Section 1.12 — newsletter/marketing consent basis (Section 2.23 lawful basis)
    marketingConsent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.methods.fullName = function fullName() {
  return `${this.firstName} ${this.lastName}`;
};

module.exports = mongoose.model("User", userSchema);
module.exports.ROLES = ROLES;
