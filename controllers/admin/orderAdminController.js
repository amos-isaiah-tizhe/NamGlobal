const Order = require("../../models/Order");
const AuditLog = require("../../models/AuditLog");
const { issueRefund, HIGH_VALUE_REFUND_THRESHOLD_NGN } = require("../../services/paymentService");

const { ORDER_STATUSES } = require("../../models/Order");

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 25;
    const filter = req.query.status ? { status: req.query.status } : {};

    const [orders, totalCount] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Order.countDocuments(filter),
    ]);

    res.render("admin/orders/list", {
      title: "Orders",
      layout: "layouts/admin",
      orders,
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      activeStatus: req.query.status || "",
      statuses: ORDER_STATUSES,
    });
  } catch (err) {
    next(err);
  }
};

exports.showDetail = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "firstName lastName email");
    if (!order) return res.status(404).render("errors/404", { title: "Order not found" });

    res.render("admin/orders/detail", {
      title: `Order ${order.orderNumber}`,
      layout: "layouts/admin",
      order,
      statuses: ORDER_STATUSES,
      refundThreshold: HIGH_VALUE_REFUND_THRESHOLD_NGN,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });

    const previousStatus = order.status;
    order.status = status;
    await order.save();

    await AuditLog.create({
      actor: req.user._id,
      action: "order.status_changed",
      targetType: "Order",
      targetId: order._id,
      metadata: { from: previousStatus, to: status },
    });

    res.json({ success: true, status: order.status });
  } catch (err) {
    next(err);
  }
};

/**
 * Section 2.7a — refunds at/above the threshold require a second, distinct
 * admin's ID. The full "second admin logs in separately to approve" UX is
 * left as a follow-up; what matters here is the service layer (Stage 7)
 * refuses to proceed without one, and this route just passes it through.
 */
exports.refund = async (req, res, next) => {
  try {
    const { amount, reason, approvedByUserId } = req.body;

    const result = await issueRefund(req.params.id, {
      amount: amount ? Number(amount) : undefined,
      reason,
      actorUserId: req.user._id.toString(),
      approvedByUserId: approvedByUserId || undefined,
    });

    res.json({ success: true, status: result.order.status, refundReference: result.order.refundReference });
  } catch (err) {
    // issueRefund throws plain Errors with user-facing messages for expected
    // failure modes (missing reason, threshold not met, provider decline) —
    // surface those directly rather than a generic 500.
    res.status(400).json({ error: err.message });
  }
};
