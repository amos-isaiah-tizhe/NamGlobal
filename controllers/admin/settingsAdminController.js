const SiteSettings = require("../../models/SiteSettings");
const AuditLog = require("../../models/AuditLog");

exports.show = async (req, res, next) => {
  try {
    const settings = await SiteSettings.getSingleton();
    res.render("admin/settings", { title: "Site Settings", layout: "layouts/admin", settings });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const settings = await SiteSettings.getSingleton();

    settings.paymentProvidersEnabled.stripe = req.body.stripe === "on";
    settings.paymentProvidersEnabled.paystack = req.body.paystack === "on";
    settings.paymentProvidersEnabled.flutterwave = req.body.flutterwave === "on";
    settings.maintenanceMode = req.body.maintenanceMode === "on";
    settings.maintenanceMessage = req.body.maintenanceMessage || settings.maintenanceMessage;

    await settings.save();

    await AuditLog.create({
      actor: req.user._id,
      action: "settings.updated",
      targetType: "SiteSettings",
      targetId: null,
      metadata: {
        paymentProvidersEnabled: settings.paymentProvidersEnabled,
        maintenanceMode: settings.maintenanceMode,
      },
    });

    res.redirect("/admin/settings");
  } catch (err) {
    next(err);
  }
};
