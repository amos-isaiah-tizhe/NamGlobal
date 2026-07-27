const SupportTicket = require("../models/SupportTicket");
const { stripHtml } = require("../utils/sanitizeHtml");

const DSR_RESPONSE_DAYS = 30; // Section 2.23 — "a defined response timeframe"

exports.showPrivacyPolicy = (req, res) => res.render("legal/privacy-policy", { title: "Privacy Policy" });

exports.showTerms = (req, res) => res.render("legal/terms", { title: "Terms of Service" });

exports.showCookiePolicy = (req, res) => res.render("legal/cookie-policy", { title: "Cookie Policy" });

/**
 * Section 2.23 — "Build a data-subject-request workflow into the admin
 * dashboard: a customer requesting access to, correction of, or deletion of
 * their personal data should be trackable as a ticket type, with a defined
 * response timeframe." Reuses the SupportTicket model (Stage 2 modeled the
 * data_access/data_correction/data_deletion ticket types for exactly this),
 * and works for both logged-in and guest requesters.
 */
exports.submitDataRequest = async (req, res, next) => {
  try {
    const { requestType, email, details } = req.body;

    const validTypes = ["data_access", "data_correction", "data_deletion"];
    if (!validTypes.includes(requestType)) {
      return res.status(400).json({ error: "Invalid request type" });
    }

    if (!req.user && !email) {
      return res.status(400).json({ error: "Email is required for a guest request" });
    }

    const dueBy = new Date(Date.now() + DSR_RESPONSE_DAYS * 24 * 60 * 60 * 1000);

    await SupportTicket.create({
      user: req.user ? req.user._id : null,
      guestEmail: req.user ? undefined : stripHtml((email || "").toLowerCase().trim()),
      subject: `Data subject request: ${requestType.replace("data_", "")}`,
      type: requestType,
      priority: "high",
      dueBy,
      messages: [
        {
          sender: req.user ? req.user._id : null, // null = the guest who opened this ticket
          body: stripHtml(details || "No additional details provided."),
        },
      ],
    });

    res.status(201).json({ success: true, respondBy: dueBy.toISOString() });
  } catch (err) {
    next(err);
  }
};
