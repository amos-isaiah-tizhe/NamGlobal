const { buildTestApp, clearDatabase, teardown } = require("../helpers/testApp");
const Category = require("../../models/Category");
const Product = require("../../models/Product");
const Order = require("../../models/Order");
const { processPaymentEvent, issueRefund } = require("../../services/paymentService");
const { generateOrderNumber } = require("../../utils/orderNumber");

beforeAll(async () => {
  await buildTestApp();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await teardown();
});

async function createTestOrder(overrides = {}) {
  const category = await Category.create({ name: "Test Category" });
  const product = await Product.create({ name: "Test Product", category: category._id, price: 1000, sku: "TEST-PS-1", status: "active" });

  return Order.create({
    orderNumber: generateOrderNumber(),
    items: [{ product: product._id, name: product.name, sku: product.sku, unitPrice: 1000, quantity: 1, lineTotal: 1000 }],
    subtotal: 1000,
    shippingFee: 0,
    tax: 0,
    discount: 0,
    total: 1000,
    status: "pending",
    channel: "storefront",
    paymentProvider: "stripe",
    ...overrides,
  });
}

describe("processPaymentEvent (Section 2.19 — order only becomes paid via a verified webhook)", () => {
  test("a payment.succeeded event transitions the matching order from pending to paid", async () => {
    const order = await createTestOrder();

    const result = await processPaymentEvent({
      type: "payment.succeeded",
      orderNumber: order.orderNumber,
      providerReference: "cs_test_123",
    });

    expect(result.handled).toBe(true);
    const reloaded = await Order.findById(order._id);
    expect(reloaded.status).toBe("paid");
    expect(reloaded.paymentReference).toBe("cs_test_123");
  });

  test("a payment.succeeded event for an unknown order number is handled gracefully, not thrown", async () => {
    const result = await processPaymentEvent({ type: "payment.succeeded", orderNumber: "NG-DOES-NOT-EXIST", providerReference: "x" });
    expect(result.handled).toBe(false);
  });

  test("a dispute.created event flags the order as disputed, never auto-resolved", async () => {
    const order = await createTestOrder({ status: "paid", paymentReference: "pi_test_456" });

    const result = await processPaymentEvent({ type: "dispute.created", providerReference: "pi_test_456", disputeReference: "dp_test_1" });

    expect(result.handled).toBe(true);
    const reloaded = await Order.findById(order._id);
    expect(reloaded.status).toBe("disputed");
    expect(reloaded.disputeReference).toBe("dp_test_1");
  });

  test("an unrecognized event type is reported as unhandled, not silently ignored or erroring", async () => {
    const result = await processPaymentEvent({ type: "some.unknown.event" });
    expect(result.handled).toBe(false);
  });
});

describe("issueRefund (Section 2.3/2.7a — refund flow + segregation of duties)", () => {
  test("requires a reason", async () => {
    const order = await createTestOrder({ status: "paid", paymentReference: "pi_test_1" });
    await expect(issueRefund(order._id, { actorUserId: "someUserId" })).rejects.toThrow(/reason/i);
  });

  test("refuses a WhatsApp/manual order (no gateway payment to refund)", async () => {
    const order = await createTestOrder({ status: "paid", paymentProvider: "manual", paymentReference: null });
    await expect(issueRefund(order._id, { reason: "test", actorUserId: "someUserId" })).rejects.toThrow(/no gateway payment/i);
  });

  test("refuses a refund above the high-value threshold without a second approver", async () => {
    const order = await createTestOrder({ status: "paid", paymentReference: "pi_test_1", total: 600000 });
    await expect(
      issueRefund(order._id, { amount: 600000, reason: "test", actorUserId: "actorId" })
    ).rejects.toThrow(/second admin/i);
  });

  test("refuses when the approver is the same as the actor (no self-approval)", async () => {
    const order = await createTestOrder({ status: "paid", paymentReference: "pi_test_1", total: 600000 });
    const sameId = "sameUserId";
    await expect(
      issueRefund(order._id, { amount: 600000, reason: "test", actorUserId: sameId, approvedByUserId: sameId })
    ).rejects.toThrow(/different admin/i);
  });

  test("refuses to refund an order that was never paid", async () => {
    const order = await createTestOrder({ status: "pending" });
    await expect(issueRefund(order._id, { reason: "test", actorUserId: "actorId" })).rejects.toThrow(/Cannot refund/i);
  });
});
