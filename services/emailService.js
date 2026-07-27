const { Resend } = require("resend");
const siteConfig = require("../config/siteConfig");
const logger = require("../config/logger");

let resendClient = null;

function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

async function sendOrderConfirmationEmail({ to, orderNumber, total, items }) {
  const client = getClient();

  if (!client) {
    // Dev-safe no-op — don't crash a queue worker just because email isn't
    // configured yet locally; log clearly so it's obvious why nothing sent.
    logger.warn({ to, orderNumber }, "RESEND_API_KEY not set — skipping order confirmation email (dev no-op)");
    return { sent: false, reason: "not_configured" };
  }

  const itemLines = items.map((item) => `${item.name} x${item.quantity} — ₦${item.lineTotal.toLocaleString()}`).join("\n");

  const result = await client.emails.send({
    from: siteConfig.contact.ordersEmail || siteConfig.contact.email,
    to,
    subject: `Your ${siteConfig.name} order ${orderNumber} is confirmed`,
    text: `Thank you for your order!\n\nOrder: ${orderNumber}\n\n${itemLines}\n\nTotal: ₦${total.toLocaleString()}\n\n— ${siteConfig.name}`,
  });

  return { sent: true, id: result.data?.id };
}

module.exports = { sendOrderConfirmationEmail };
