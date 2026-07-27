const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // null = system-triggered (e.g. a webhook), not a manual admin action
    action: { type: String, required: true, trim: true }, // e.g. "order.refund_issued", "product.price_updated"
    targetType: { type: String, trim: true }, // e.g. "Order", "Product"
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }, // e.g. { reason, previousValue, newValue }
    ipAddress: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

// No pre("findOneAndUpdate")/pre("deleteOne") escape hatch is exposed via a
// service layer in later stages — this collection is intended to be
// insert-only. Regular admin roles will not be granted update/delete
// permissions on it (Section 2.7a); only export is allowed.

module.exports = mongoose.model("AuditLog", auditLogSchema);
