const mongoose = require("mongoose");

/**
 * Singleton settings document (always _id: "singleton") — Section 1.8:
 * "Admin should be able to enable/disable each payment provider from the
 * dashboard." The underlying capability check (are the provider's API keys
 * actually configured) still lives in config/paymentProviders.js from
 * Stage 7 — this adds the admin-controlled on/off switch on top of that;
 * a provider is only actually offered at checkout if BOTH are true.
 */
const siteSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "singleton" },

    paymentProvidersEnabled: {
      stripe: { type: Boolean, default: true },
      paystack: { type: Boolean, default: true },
      flutterwave: { type: Boolean, default: true },
    },

    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: "We'll be back shortly — thanks for your patience." },
  },
  { timestamps: true }
);

siteSettingsSchema.statics.getSingleton = async function getSingleton() {
  let settings = await this.findById("singleton");
  if (!settings) settings = await this.create({ _id: "singleton" });
  return settings;
};

module.exports = mongoose.model("SiteSettings", siteSettingsSchema);
