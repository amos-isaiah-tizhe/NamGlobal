const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // Optional — a null sender paired with the parent ticket's guestEmail
    // means "the guest who opened this ticket" (e.g. an unauthenticated
    // data-subject request, Section 2.23). Staff replies always have a
    // sender (Stage 8's admin ticket controller requires req.user).
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    body: { type: String, required: true, trim: true, maxlength: 5000 }, // sanitized server-side (Section 2.7)
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    guestEmail: { type: String, trim: true, lowercase: true },

    subject: { type: String, required: true, trim: true },

    // Section 2.23 — data-subject-request workflow shares this model as a ticket type
    type: {
      type: String,
      enum: ["general", "order_issue", "return_request", "data_access", "data_correction", "data_deletion"],
      default: "general",
      index: true,
    },

    status: { type: String, enum: ["open", "in_progress", "resolved", "closed"], default: "open", index: true },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },

    relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    messages: [messageSchema],

    // Section 2.23 — data-subject requests need a defined response timeframe
    dueBy: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
