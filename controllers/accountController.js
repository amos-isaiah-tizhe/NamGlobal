const bcrypt = require("bcrypt");

const User = require("../models/User");
const Order = require("../models/Order");
const SupportTicket = require("../models/SupportTicket");
const { checkPasswordComplexity, checkBreachedPassword } = require("../utils/passwordPolicy");
const { stripHtml } = require("../utils/sanitizeHtml");
const { trackUserSession, killUserSessions } = require("../services/sessionKillSwitch");

// ---- Overview ----

exports.showOverview = async (req, res, next) => {
  try {
    const recentOrders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5);
    res.render("account/overview", { title: "My Account", recentOrders });
  } catch (err) {
    next(err);
  }
};

// ---- Orders ----

exports.listOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.render("account/orders", { title: "My Orders", orders });
  } catch (err) {
    next(err);
  }
};

exports.showOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber, user: req.user._id });
    if (!order) return res.status(404).render("errors/404", { title: "Order not found" });
    res.render("account/order-detail", { title: `Order ${order.orderNumber}`, order });
  } catch (err) {
    next(err);
  }
};

// ---- Profile & password ----

exports.showProfile = (req, res) => res.render("account/profile", { title: "My Profile" });

exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.firstName = stripHtml(req.body.firstName);
    user.lastName = stripHtml(req.body.lastName);
    user.phone = stripHtml(req.body.phone || "");
    await user.save();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+passwordHash");

    if (!user.passwordHash) {
      return res.status(400).json({ error: "This account signs in via OAuth and has no password to change." });
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) return res.status(401).json({ error: "Current password is incorrect" });

    const complexityIssues = checkPasswordComplexity(newPassword);
    if (complexityIssues.length > 0) return res.status(400).json({ error: "Weak password", details: complexityIssues });

    const breach = await checkBreachedPassword(newPassword);
    if (breach.breached) return res.status(400).json({ error: "This password has appeared in a known data breach." });

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    // Defense-in-depth: if this password was changed because the account was
    // compromised, any other active session (the attacker's included) should
    // not survive the change — this is the per-user kill-switch from
    // Section 2.23, triggered automatically rather than only via an admin
    // action.
    const userId = user._id.toString();
    await killUserSessions(userId);

    // Section 2.7 — regenerate session on any privilege/credential change
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: "Password changed, but session refresh failed — please log in again." });
      req.session.userId = userId;
      trackUserSession(userId, req.session.id).catch((e) => console.error("trackUserSession failed:", e));
      res.json({ success: true });
    });
  } catch (err) {
    next(err);
  }
};

// ---- Addresses ----

exports.listAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.render("account/addresses", { title: "Saved Addresses", addresses: user.addresses });
  } catch (err) {
    next(err);
  }
};

exports.addAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const address = {
      label: stripHtml(req.body.label || "Home"),
      recipientName: stripHtml(req.body.recipientName),
      phone: stripHtml(req.body.phone),
      line1: stripHtml(req.body.line1),
      line2: stripHtml(req.body.line2 || ""),
      city: stripHtml(req.body.city),
      state: stripHtml(req.body.state),
      country: stripHtml(req.body.country || "Nigeria"),
      isDefault: user.addresses.length === 0,
    };
    user.addresses.push(address);
    await user.save();
    res.redirect("/account/addresses");
  } catch (err) {
    next(err);
  }
};

exports.deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses = user.addresses.filter((a) => a._id.toString() !== req.params.addressId);
    await user.save();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ---- Wishlist ----

exports.showWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate("wishlist");
    res.render("account/wishlist", { title: "My Wishlist", products: user.wishlist });
  } catch (err) {
    next(err);
  }
};

// ---- Support tickets ----

exports.listTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.render("account/tickets", { title: "My Support Tickets", tickets });
  } catch (err) {
    next(err);
  }
};

exports.createTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.create({
      user: req.user._id,
      subject: stripHtml(req.body.subject),
      type: "general",
      messages: [{ sender: req.user._id, body: stripHtml(req.body.message) }],
    });
    res.redirect(`/account/tickets/${ticket._id}`);
  } catch (err) {
    next(err);
  }
};

exports.showTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findOne({ _id: req.params.id, user: req.user._id }).populate("messages.sender", "firstName role");
    if (!ticket) return res.status(404).render("errors/404", { title: "Ticket not found" });
    res.render("account/ticket-detail", { title: ticket.subject, ticket });
  } catch (err) {
    next(err);
  }
};
