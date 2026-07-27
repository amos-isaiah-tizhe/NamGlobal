const User = require("../../models/User");
const AuditLog = require("../../models/AuditLog");
const { killUserSessions, killAllSessions } = require("../../services/sessionKillSwitch");

exports.show = (req, res) => {
  res.render("admin/incident-response", { title: "Incident Response" });
};

/** Kill every active session for one account — e.g. a compromised customer or staff login. */
exports.killUser = async (req, res, next) => {
  try {
    const { email } = req.body;
    const targetUser = await User.findOne({ email: (email || "").toLowerCase().trim() });
    if (!targetUser) return res.status(404).json({ error: "No user found with that email" });

    const count = await killUserSessions(targetUser._id.toString());

    await AuditLog.create({
      actor: req.user._id,
      action: "security.session_kill_user",
      targetType: "User",
      targetId: targetUser._id,
      metadata: { sessionsInvalidated: count },
    });

    res.json({ success: true, sessionsInvalidated: count });
  } catch (err) {
    next(err);
  }
};

/**
 * Global kill-switch — Section 2.23: "...or globally (suspected
 * system-wide breach)." Deliberately requires typing a literal confirmation
 * phrase in the request body, since this logs out every user on the site
 * at once — the kind of action that shouldn't be triggerable by an
 * accidental double-click.
 */
exports.killAll = async (req, res, next) => {
  try {
    if (req.body.confirmation !== "INVALIDATE ALL SESSIONS") {
      return res.status(400).json({ error: 'Type "INVALIDATE ALL SESSIONS" exactly to confirm this action.' });
    }

    const count = await killAllSessions();

    await AuditLog.create({
      actor: req.user._id,
      action: "security.session_kill_all",
      targetType: null,
      targetId: null,
      metadata: { sessionsInvalidated: count },
    });

    res.json({ success: true, sessionsInvalidated: count });
  } catch (err) {
    next(err);
  }
};
