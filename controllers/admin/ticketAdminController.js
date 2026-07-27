const SupportTicket = require("../../models/SupportTicket");
const { stripHtml } = require("../../utils/sanitizeHtml");

exports.list = async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const tickets = await SupportTicket.find(filter).sort({ createdAt: -1 }).limit(100).populate("user", "firstName lastName email");

    res.render("admin/tickets/list", { title: "Support Tickets", layout: "layouts/admin", tickets, activeStatus: req.query.status || "" });
  } catch (err) {
    next(err);
  }
};

exports.showDetail = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate("user", "firstName lastName email")
      .populate("messages.sender", "firstName lastName role");
    if (!ticket) return res.status(404).render("errors/404", { title: "Ticket not found" });

    res.render("admin/tickets/detail", { title: `Ticket: ${ticket.subject}`, layout: "layouts/admin", ticket });
  } catch (err) {
    next(err);
  }
};

exports.reply = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    ticket.messages.push({ sender: req.user._id, body: stripHtml(req.body.message) });
    if (req.body.status) ticket.status = req.body.status;
    await ticket.save();

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
