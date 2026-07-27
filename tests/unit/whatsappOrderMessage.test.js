const { buildWhatsAppOrderMessage, buildWhatsAppUrl } = require("../../utils/whatsappOrderMessage");

const sampleOrder = {
  orderNumber: "NG-000123",
  items: [
    { name: "iPhone 15 Pro Max", variant: "256GB", quantity: 1, unitPrice: 1750000, lineTotal: 1750000, productSlug: "iphone-15-pro-max" },
  ],
  subtotal: 1750000,
  discount: 0,
  shippingFee: 3000,
  tax: 131250,
  total: 1884250,
  shippingAddress: {
    recipientName: "Isaiah Amos Tizhe",
    phone: "+2348034567890",
    line1: "No. 25 Aminu Kano Crescent",
    city: "Keffi",
    state: "Nasarawa",
  },
};

describe("buildWhatsAppOrderMessage (Section 2.3)", () => {
  test("includes the order ID", () => {
    const msg = buildWhatsAppOrderMessage(sampleOrder, { baseUrl: "https://namsglobal.com" });
    expect(msg).toContain("NG-000123");
  });

  test("includes product name, quantity, and a direct product URL", () => {
    const msg = buildWhatsAppOrderMessage(sampleOrder, { baseUrl: "https://namsglobal.com" });
    expect(msg).toContain("iPhone 15 Pro Max");
    expect(msg).toContain("x1");
    expect(msg).toContain("https://namsglobal.com/product/iphone-15-pro-max");
  });

  test("includes unit price, line total, and the full order total", () => {
    const msg = buildWhatsAppOrderMessage(sampleOrder, { baseUrl: "https://namsglobal.com" });
    expect(msg).toContain("1,750,000");
    expect(msg).toContain("1,884,250");
  });

  test("includes customer name, phone, and delivery address", () => {
    const msg = buildWhatsAppOrderMessage(sampleOrder, { baseUrl: "https://namsglobal.com" });
    expect(msg).toContain("Isaiah Amos Tizhe");
    expect(msg).toContain("+2348034567890");
    expect(msg).toContain("Keffi");
  });

  test("omits discount/shipping/tax lines when they're zero", () => {
    const msg = buildWhatsAppOrderMessage({ ...sampleOrder, discount: 0, shippingFee: 0, tax: 0 }, { baseUrl: "https://namsglobal.com" });
    expect(msg).not.toContain("Discount:");
    expect(msg).not.toContain("Shipping:");
    expect(msg).not.toContain("Tax:");
  });
});

describe("buildWhatsAppUrl", () => {
  test("produces a valid wa.me URL with the message URL-encoded and decodable", () => {
    const msg = buildWhatsAppOrderMessage(sampleOrder, { baseUrl: "https://namsglobal.com" });
    const url = buildWhatsAppUrl("+2347044050277", msg);
    expect(url).toMatch(/^https:\/\/wa\.me\/2347044050277\?text=/);
    const decoded = decodeURIComponent(url.split("?text=")[1]);
    expect(decoded).toContain("NG-000123");
  });

  test("strips a leading + from the phone number for the wa.me path segment", () => {
    const url = buildWhatsAppUrl("+2347044050277", "hello");
    expect(url).not.toContain("wa.me/+");
  });
});
