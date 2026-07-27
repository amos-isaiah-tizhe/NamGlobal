/**
 * Section 2.3 WhatsApp Checkout requires the message be built from "a single
 * reusable template... so its format stays consistent and easy to update in
 * one place — never hardcoded inline in a view." This is that one place.
 */
function buildWhatsAppOrderMessage(order, { baseUrl }) {
  const lines = [];

  lines.push(`Hello ${process.env.SITE_NAME || "Nam Global"}, I'd like to place this order:`);
  lines.push("");
  lines.push(`Order ID: ${order.orderNumber}`);
  lines.push("");

  order.items.forEach((item) => {
    const productUrl = `${baseUrl}/product/${item.productSlug || ""}`.replace(/\/$/, "");
    lines.push(`• ${item.name}${item.variant ? ` (${item.variant})` : ""} x${item.quantity}`);
    lines.push(`  ₦${item.unitPrice.toLocaleString()} each — line total ₦${item.lineTotal.toLocaleString()}`);
    lines.push(`  ${productUrl}`);
  });

  lines.push("");
  lines.push(`Subtotal: ₦${order.subtotal.toLocaleString()}`);
  if (order.discount > 0) lines.push(`Discount: -₦${order.discount.toLocaleString()}`);
  if (order.shippingFee > 0) lines.push(`Shipping: ₦${order.shippingFee.toLocaleString()}`);
  if (order.tax > 0) lines.push(`Tax: ₦${order.tax.toLocaleString()}`);
  lines.push(`Total: ₦${order.total.toLocaleString()}`);
  lines.push("");

  lines.push(`Name: ${order.shippingAddress.recipientName}`);
  lines.push(`Phone: ${order.shippingAddress.phone}`);
  lines.push(
    `Address: ${[order.shippingAddress.line1, order.shippingAddress.line2, order.shippingAddress.city, order.shippingAddress.state]
      .filter(Boolean)
      .join(", ")}`
  );

  if (order.notes) lines.push(`Preferred delivery/payment note: ${order.notes}`);

  return lines.join("\n");
}

function buildWhatsAppUrl(whatsappNumber, message) {
  const digitsOnly = (whatsappNumber || "").replace(/[^\d+]/g, "");
  return `https://wa.me/${digitsOnly.replace("+", "")}?text=${encodeURIComponent(message)}`;
}

module.exports = { buildWhatsAppOrderMessage, buildWhatsAppUrl };
