const { roleHasPermission } = require("../../config/permissions");

describe("RBAC permission matrix (Section 2.7a)", () => {
  test("super_admin has every permission via the wildcard", () => {
    expect(roleHasPermission("super_admin", "user:manage")).toBe(true);
    expect(roleHasPermission("super_admin", "settings:edit")).toBe(true);
    expect(roleHasPermission("super_admin", "audit:view")).toBe(true);
    expect(roleHasPermission("super_admin", "anything:whatsoever")).toBe(true);
  });

  test("store_manager can issue refunds and edit prices, but not manage users/settings", () => {
    expect(roleHasPermission("store_manager", "order:refund_issue")).toBe(true);
    expect(roleHasPermission("store_manager", "product:price_edit")).toBe(true);
    expect(roleHasPermission("store_manager", "user:manage")).toBe(false);
    expect(roleHasPermission("store_manager", "settings:edit")).toBe(false);
    expect(roleHasPermission("store_manager", "audit:view")).toBe(false);
  });

  test("support_staff can update order status but cannot issue refunds or edit prices", () => {
    expect(roleHasPermission("support_staff", "order:update_status")).toBe(true);
    expect(roleHasPermission("support_staff", "order:refund_issue")).toBe(false);
    expect(roleHasPermission("support_staff", "product:price_edit")).toBe(false);
  });

  test("content_editor can edit content but not prices", () => {
    expect(roleHasPermission("content_editor", "content:edit")).toBe(true);
    expect(roleHasPermission("content_editor", "product:price_edit")).toBe(false);
  });

  test("customer has no admin permissions at all", () => {
    expect(roleHasPermission("customer", "product:view")).toBe(false);
    expect(roleHasPermission("customer", "order:view")).toBe(false);
  });

  test("an unknown/undefined role has no permissions (fails closed, not open)", () => {
    expect(roleHasPermission("not_a_real_role", "order:view")).toBe(false);
    expect(roleHasPermission(undefined, "order:view")).toBe(false);
  });
});
