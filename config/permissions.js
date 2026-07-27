/**
 * config/permissions.js
 *
 * Section 2.7a: "Enforce permissions via middleware that checks a specific
 * permission (e.g. can('refund:issue')), not just a role name string — role
 * names change, permission checks shouldn't need to."
 *
 * Add new permissions here as later stages need them (e.g. Stage 7 Payments
 * will lean on 'order:refund_issue' and 'order:refund_issue_high_value').
 */

const PERMISSIONS = {
  customer: [],

  content_editor: ["content:edit", "product:view"],

  support_staff: ["order:view", "order:update_status", "product:view", "ticket:manage"],

  store_manager: [
    "order:view",
    "order:update_status",
    "order:refund_issue", // below the high-value threshold — Stage 7 wires the actual threshold check
    "product:view",
    "product:edit",
    "product:price_edit",
    "content:edit",
    "coupon:manage",
    "ticket:manage",
  ],

  // Super admin gets everything, including the high-impact actions that
  // require a second approver per Section 2.7a (bulk price changes, admin
  // account creation, high-value refunds) — the second-approval workflow
  // itself is implemented where those actions are built (Stage 7/8).
  super_admin: ["*"],
};

function roleHasPermission(role, permission) {
  const rolePermissions = PERMISSIONS[role] || [];
  return rolePermissions.includes("*") || rolePermissions.includes(permission);
}

module.exports = { PERMISSIONS, roleHasPermission };
