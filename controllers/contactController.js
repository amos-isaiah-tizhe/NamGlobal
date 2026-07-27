const { stripHtml } = require("../utils/sanitizeHtml");

exports.showForm = (req, res) => {
  res.render("contact", { title: "Contact Us" });
};

exports.submit = (req, res) => {
  // express-validator already ran (middleware/validate.js); this is a Stage 3
  // wiring demo, so it just echoes the sanitized input back rather than
  // persisting anything — Stage 6/Support-ticket wiring happens later.
  const clean = {
    fullName: stripHtml(req.body.fullName),
    email: stripHtml(req.body.email),
    phone: stripHtml(req.body.phone || ""),
    subject: stripHtml(req.body.subject),
    message: stripHtml(req.body.message),
  };

  res.status(200).json({
    received: true,
    note: "Stage 3 demo endpoint — validated, sanitized, CSRF-checked, rate-limited. Not yet persisted to a SupportTicket.",
    data: clean,
  });
};
