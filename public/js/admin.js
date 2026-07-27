function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

function postJson(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
    body: JSON.stringify(body),
  }).then((res) => res.json().then((data) => ({ ok: res.ok, data })));
}

document.addEventListener("click", function (event) {
  const categoryBtn = event.target.closest("[data-toggle-category]");
  if (categoryBtn) {
    postJson("/admin/categories/" + categoryBtn.getAttribute("data-toggle-category") + "/toggle", {}).then(() => location.reload());
    return;
  }

  const couponBtn = event.target.closest("[data-toggle-coupon]");
  if (couponBtn) {
    postJson("/admin/coupons/" + couponBtn.getAttribute("data-toggle-coupon") + "/toggle", {}).then(() => location.reload());
    return;
  }

  const userToggleBtn = event.target.closest("[data-toggle-user]");
  if (userToggleBtn) {
    postJson("/admin/users/" + userToggleBtn.getAttribute("data-toggle-user") + "/toggle-active", {}).then(() => location.reload());
    return;
  }

  const deleteAddressBtn = event.target.closest("[data-delete-address]");
  if (deleteAddressBtn) {
    postJson("/account/addresses/" + deleteAddressBtn.getAttribute("data-delete-address") + "/delete", {}).then(() => location.reload());
    return;
  }
});

document.addEventListener("submit", function (event) {
  const roleForm = event.target.closest("[data-role-form]");
  if (roleForm) {
    event.preventDefault();
    const userId = roleForm.getAttribute("data-role-form");
    const role = roleForm.querySelector('[name="role"]').value;
    const approvedByUserId = roleForm.querySelector('[name="approvedByUserId"]').value;
    postJson("/admin/users/" + userId + "/role", { role, approvedByUserId }).then(function (result) {
      if (!result.ok) return alert(result.data.error || "Could not update role");
      location.reload();
    });
    return;
  }

  const statusForm = event.target.closest("[data-order-status-form]");
  if (statusForm) {
    event.preventDefault();
    const orderId = statusForm.getAttribute("data-order-status-form");
    const status = statusForm.querySelector('[name="status"]').value;
    postJson("/admin/orders/" + orderId + "/status", { status }).then(function (result) {
      if (!result.ok) return alert(result.data.error || "Could not update status");
      location.reload();
    });
    return;
  }

  const refundForm = event.target.closest("[data-refund-form]");
  if (refundForm) {
    event.preventDefault();
    const orderId = refundForm.getAttribute("data-refund-form");
    const amount = refundForm.querySelector('[name="amount"]').value;
    const reason = refundForm.querySelector('[name="reason"]').value;
    const approvedByUserId = refundForm.querySelector('[name="approvedByUserId"]').value;
    postJson("/admin/orders/" + orderId + "/refund", { amount, reason, approvedByUserId }).then(function (result) {
      if (!result.ok) return alert(result.data.error || "Refund failed");
      alert("Refund issued.");
      location.reload();
    });
    return;
  }

  const ticketReplyForm = event.target.closest("[data-ticket-reply-form]");
  if (ticketReplyForm) {
    event.preventDefault();
    const ticketId = ticketReplyForm.getAttribute("data-ticket-reply-form");
    const message = ticketReplyForm.querySelector('[name="message"]').value;
    const status = ticketReplyForm.querySelector('[name="status"]').value;
    postJson("/admin/tickets/" + ticketId + "/reply", { message, status }).then(function (result) {
      if (!result.ok) return alert(result.data.error || "Could not send reply");
      location.reload();
    });
    return;
  }

  const profileForm = event.target.closest("[data-profile-form]");
  if (profileForm) {
    event.preventDefault();
    const formData = new FormData(profileForm);
    postJson("/account/profile", Object.fromEntries(formData)).then(function (result) {
      if (!result.ok) return alert(result.data.error || "Could not save profile");
      alert("Profile saved.");
    });
    return;
  }

  const killUserForm = event.target.closest("[data-kill-user-form]");
  if (killUserForm) {
    event.preventDefault();
    const formData = new FormData(killUserForm);
    postJson("/admin/incident-response/kill-user", Object.fromEntries(formData)).then(function (result) {
      if (!result.ok) return alert(result.data.error || "Could not invalidate sessions");
      alert("Invalidated " + result.data.sessionsInvalidated + " session(s) for that account.");
      killUserForm.reset();
    });
    return;
  }

  const killAllForm = event.target.closest("[data-kill-all-form]");
  if (killAllForm) {
    event.preventDefault();
    const formData = new FormData(killAllForm);
    postJson("/admin/incident-response/kill-all", Object.fromEntries(formData)).then(function (result) {
      if (!result.ok) return alert(result.data.error || "Could not invalidate sessions");
      alert("Invalidated " + result.data.sessionsInvalidated + " session(s) site-wide.");
      killAllForm.reset();
    });
    return;
  }

  const passwordForm = event.target.closest("[data-password-form]");
  if (passwordForm) {
    event.preventDefault();
    const formData = new FormData(passwordForm);
    postJson("/account/password", Object.fromEntries(formData)).then(function (result) {
      if (!result.ok) return alert(result.data.error || "Could not change password");
      alert("Password changed.");
      passwordForm.reset();
    });
  }
});
