const AuditLog = require("../../models/AuditLog");

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 50;

    const [logs, totalCount] = await Promise.all([
      AuditLog.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("actor", "firstName lastName email"),
      AuditLog.countDocuments(),
    ]);

    res.render("admin/audit-logs/list", {
      title: "Audit Logs",
      layout: "layouts/admin",
      logs,
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    });
  } catch (err) {
    next(err);
  }
};

/** Section 2.7 — audit logs are exportable but never editable/deletable via the app. */
exports.exportCsv = async (req, res, next) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(5000).populate("actor", "email");

    const header = "timestamp,actor,action,targetType,targetId,metadata\n";
    const rows = logs
      .map((log) =>
        [
          log.createdAt.toISOString(),
          log.actor?.email || "unknown",
          log.action,
          log.targetType || "",
          log.targetId || "",
          JSON.stringify(log.metadata || {}).replace(/"/g, '""'),
        ]
          .map((field) => `"${field}"`)
          .join(",")
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=audit-logs.csv");
    res.send(header + rows);
  } catch (err) {
    next(err);
  }
};
