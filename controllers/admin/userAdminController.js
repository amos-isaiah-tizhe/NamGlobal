const User = require("../../models/User");
const AuditLog = require("../../models/AuditLog");

exports.list = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(100);
    res.render("admin/users/list", { title: "Users", layout: "layouts/admin", users, roles: User.ROLES });
  } catch (err) {
    next(err);
  }
};

/**
 * Section 2.7a — "admin account creation" is explicitly named as a
 * high-impact action requiring a second approver. Promoting an existing
 * user to super_admin gets the same treatment here; other role changes
 * (support_staff, store_manager, content_editor) don't carry the same
 * blast radius and proceed with single-admin approval.
 */
exports.updateRole = async (req, res, next) => {
  try {
    const { role, approvedByUserId } = req.body;
    if (!User.ROLES.includes(role)) return res.status(400).json({ error: "Invalid role" });

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    if (role === "super_admin" && targetUser.role !== "super_admin") {
      if (!approvedByUserId) {
        return res.status(400).json({ error: "Granting super_admin requires a second admin's approval." });
      }
      if (approvedByUserId === req.user._id.toString()) {
        return res.status(400).json({ error: "The second approver must be a different admin (segregation of duties)." });
      }
      const approver = await User.findById(approvedByUserId);
      if (!approver || approver.role !== "super_admin") {
        return res.status(400).json({ error: "The second approver must be an existing super_admin." });
      }
    }

    const previousRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();

    await AuditLog.create({
      actor: req.user._id,
      action: "user.role_changed",
      targetType: "User",
      targetId: targetUser._id,
      metadata: { from: previousRole, to: role, approvedBy: approvedByUserId || null },
    });

    res.json({ success: true, role: targetUser.role });
  } catch (err) {
    next(err);
  }
};

exports.toggleActive = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    targetUser.isActive = !targetUser.isActive;
    await targetUser.save();

    await AuditLog.create({
      actor: req.user._id,
      action: targetUser.isActive ? "user.reactivated" : "user.deactivated",
      targetType: "User",
      targetId: targetUser._id,
      metadata: {},
    });

    res.json({ success: true, isActive: targetUser.isActive });
  } catch (err) {
    next(err);
  }
};
