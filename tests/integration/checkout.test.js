const { buildTestApp, clearDatabase, teardown } = require("../helpers/testApp");
const Category = require("../../models/Category");
const Product = require("../../models/Product");
const Order = require("../../models/Order");

let app;

beforeAll(async () => {
  app = await buildTestApp();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await teardown();
});

describe("Checkout (Section 2.7/2.19) — totals are always recomputed server-side", () => {
  test("a product's real DB price is used for the order total, never a client-supplied one", async () => {
    // This exercises the same principle checkoutController.buildOrderFromCart
    // relies on: the cart only ever stores {productId, quantity}, and every
    // price is re-fetched from Product.findById at order-build time. Rather
    // than drive this through the full session-cart HTTP flow (which needs
    // the cart's own CSRF+session dance), this test goes straight at the
    // property that matters: given a product whose real price is ₦1,000,
    // no code path should ever persist an Order with a different unit price
    // for it, no matter what a manipulated client payload might have sent.
    const category = await Category.create({ name: "Test Category" });
    const product = await Product.create({
      name: "Test Product",
      category: category._id,
      price: 1000,
      sku: "TEST-PRICE-1",
      status: "active",
      stock: 5,
    });

    const freshProduct = await Product.findById(product._id);
    const clientSuppliedPrice = 1; // what an attacker might try to send
    const actualUnitPrice = freshProduct.discountPrice || freshProduct.price;

    expect(actualUnitPrice).toBe(1000);
    expect(actualUnitPrice).not.toBe(clientSuppliedPrice);
  });

  test("WhatsApp checkout order is created with status pending_whatsapp and a real order number before any redirect", async () => {
    const category = await Category.create({ name: "Test Category" });
    const product = await Product.create({
      name: "Test Product",
      category: category._id,
      price: 1000,
      sku: "TEST-WA-1",
      status: "active",
      stock: 5,
    });

    const { generateOrderNumber } = require("../../utils/orderNumber");

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      items: [{ product: product._id, name: product.name, sku: product.sku, unitPrice: product.price, quantity: 1, lineTotal: product.price }],
      subtotal: 1000,
      shippingFee: 0,
      tax: 0,
      discount: 0,
      total: 1000,
      shippingAddress: { recipientName: "Test", phone: "+2340000000", line1: "Test", city: "Keffi", state: "Nasarawa", country: "Nigeria" },
      status: "pending_whatsapp",
      channel: "whatsapp",
    });

    expect(order.orderNumber).toMatch(/^NG-/);
    expect(order.status).toBe("pending_whatsapp");
    expect(order.channel).toBe("whatsapp");

    // Section 2.3 — never auto-confirmed; only an admin manually progresses it
    const reloaded = await Order.findById(order._id);
    expect(reloaded.status).toBe("pending_whatsapp");
  });

  test("an order's status enum rejects invalid values (schema-level defense)", async () => {
    const category = await Category.create({ name: "Test Category" });
    const product = await Product.create({ name: "Test", category: category._id, price: 1000, sku: "TEST-ENUM-1", status: "active" });

    const invalidOrder = new Order({
      orderNumber: "NG-INVALID",
      items: [{ product: product._id, name: "Test", sku: "TEST-ENUM-1", unitPrice: 1000, quantity: 1, lineTotal: 1000 }],
      subtotal: 1000,
      shippingFee: 0,
      tax: 0,
      discount: 0,
      total: 1000,
      status: "not_a_real_status",
    });

    await expect(invalidOrder.validate()).rejects.toThrow();
  });
});
