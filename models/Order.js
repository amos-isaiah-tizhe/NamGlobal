const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true }, // snapshot at time of order
    productSlug: { type: String, required: true }, // snapshot — used to build product URLs (e.g. WhatsApp checkout message) without a lookup
    sku: { type: String, required: true },
    variant: { type: String, trim: true }, // e.g. "256GB / Space Black"
    unitPrice: { type: Number, required: true, min: 0 }, // server-recomputed, never trust client (Section 2.7)
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// Section 2.3 Dispute & Refund Handling — full lifecycle including dispute/chargeback states
const ORDER_STATUSES = [
  "pending",
  "pending_whatsapp", // Section 2.3 WhatsApp checkout — created before redirect, never auto-confirmed
  "paid",
  "fulfilled",
  "refund_requested",
  "refunded",
  "disputed",
  "cancelled",
];

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },

    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // null for guest checkout
    guestEmail: { type: String, trim: true, lowercase: true },
    guestPhone: { type: String, trim: true },

    items: [orderItemSchema],

    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0, default: 0 },
    tax: { type: Number, required: true, min: 0, default: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 }, // always recomputed server-side before charging (Section 2.7)

    couponCode: { type: String, trim: true, default: null },

    shippingAddress: {
      recipientName: String,
      phone: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      country: String,
    },

    status: { type: String, enum: ORDER_STATUSES, default: "pending", index: true },

    // Distinguishing tag for orders created via the WhatsApp path (Section 2.3)
    channel: { type: String, enum: ["storefront", "whatsapp"], default: "storefront", index: true },

    paymentProvider: { type: String, enum: ["stripe", "paystack", "flutterwave", "manual", null], default: null },
    paymentReference: { type: String, default: null }, // provider transaction ID only — never raw card data (Section 2.7)

    // Section 2.3 Dispute & Refund Handling — reconciliation references
    disputeReference: { type: String, default: null },
    refundReference: { type: String, default: null },
    refundReason: { type: String, trim: true },
    refundIssuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // audit trail (Section 2.7)

    // Section 2.7a — high-value refunds require a second, distinct approver
    // (segregation of duties) before the provider refund API is actually called.
    refundRequestedAmount: { type: Number, default: null },
    refundRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    refundApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
