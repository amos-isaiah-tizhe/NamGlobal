const Order = require("../../models/Order");
const Product = require("../../models/Product");
const SupportTicket = require("../../models/SupportTicket");

exports.showDashboard = async (req, res, next) => {
  try {
    const [orderCounts, revenueAgg, productCount, lowStockCount, openTickets, recentOrders] = await Promise.all([
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Order.aggregate([{ $match: { status: { $in: ["paid", "fulfilled"] } } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
      Product.countDocuments({ status: "active" }),
      Product.countDocuments({ status: "active", stock: { $lte: 5 } }),
      SupportTicket.countDocuments({ status: { $in: ["open", "in_progress"] } }),
      Order.find().sort({ createdAt: -1 }).limit(10),
    ]);

    const statusMap = Object.fromEntries(orderCounts.map((s) => [s._id, s.count]));

    res.render("admin/dashboard", {
      title: "Admin Dashboard",
      layout: "layouts/admin",
      statusMap,
      revenue: revenueAgg[0]?.total || 0,
      productCount,
      lowStockCount,
      openTickets,
      recentOrders,
    });
  } catch (err) {
    next(err);
  }
};
