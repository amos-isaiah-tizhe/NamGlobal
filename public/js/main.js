// CSP-compliant: no inline scripts/handlers, everything wired via addEventListener.

function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

document.addEventListener("click", function (event) {
  const button = event.target.closest("[data-wishlist-product]");
  if (!button) return;

  const productId = button.getAttribute("data-wishlist-product");

  fetch("/wishlist/" + productId + "/toggle", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": getCsrfToken(),
    },
  })
    .then(function (res) {
      if (res.status === 401) {
        window.location.href = "/login";
        return null;
      }
      return res.json();
    })
    .then(function (data) {
      if (!data) return;
      button.innerHTML = data.wishlisted ? "&#9829; Wishlisted" : "&#9825; Add to wishlist";
    })
    .catch(function (err) {
      console.error("Wishlist toggle failed:", err);
    });
});

// ---- Cart: add to cart / buy now ----
document.addEventListener("click", function (event) {
  const addBtn = event.target.closest("[data-add-to-cart]");
  const buyBtn = event.target.closest("[data-buy-now]");
  const target = addBtn || buyBtn;
  if (!target) return;

  const productId = target.getAttribute("data-add-to-cart") || target.getAttribute("data-buy-now");

  fetch("/cart/add", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
    body: JSON.stringify({ productId: productId, quantity: 1 }),
  })
    .then(function (res) { return res.json(); })
    .then(function () {
      if (buyBtn) {
        window.location.href = "/checkout";
      } else {
        target.textContent = "Added \u2713";
        setTimeout(function () { target.textContent = "Add to cart"; }, 1500);
      }
    })
    .catch(function (err) { console.error("Add to cart failed:", err); });
});

// ---- Cart page: quantity change / remove / coupon ----
document.addEventListener("change", function (event) {
  const qtyInput = event.target.closest("[data-cart-qty]");
  if (!qtyInput) return;

  const productId = qtyInput.getAttribute("data-cart-qty");
  fetch("/cart/item/" + productId, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
    body: JSON.stringify({ quantity: qtyInput.value }),
  }).then(function () { window.location.reload(); });
});

document.addEventListener("click", function (event) {
  const removeBtn = event.target.closest("[data-cart-remove]");
  if (!removeBtn) return;

  const productId = removeBtn.getAttribute("data-cart-remove");
  fetch("/cart/item/" + productId, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
    body: JSON.stringify({}),
  }).then(function () { window.location.reload(); });
});

document.addEventListener("submit", function (event) {
  const couponForm = event.target.closest("[data-coupon-form]");
  if (!couponForm) return;
  event.preventDefault();

  const code = couponForm.querySelector('input[name="code"]').value;
  fetch("/cart/coupon", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
    body: JSON.stringify({ code: code }),
  })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.error) { alert(data.error); return; }
      window.location.reload();
    });
});

// ---- Checkout: place order / WhatsApp order ----
document.addEventListener("submit", function (event) {
  const form = event.target.closest("#checkout-form");
  if (!form) return;
  event.preventDefault();

  const submitter = event.submitter;
  const isWhatsApp = submitter && submitter.id === "whatsapp-order-btn";
  const url = isWhatsApp ? "/checkout/whatsapp" : "/checkout";

  const formData = new FormData(form);
  const payload = {};
  formData.forEach(function (value, key) { payload[key] = value; });

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
    body: JSON.stringify(payload),
  })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.error) {
        alert(data.error);
        return;
      }
      if (data.whatsappUrl) {
        window.location.href = data.whatsappUrl;
      } else if (data.redirectTo) {
        window.location.href = data.redirectTo;
      }
    })
    .catch(function (err) { console.error("Checkout failed:", err); });
});

document.addEventListener("click", function (event) {
  const whatsappBtn = event.target.closest("#whatsapp-order-btn");
  if (!whatsappBtn) return;
  // Triggers the form's submit handler above with the correct submitter recorded
  const form = document.getElementById("checkout-form");
  if (form && form.requestSubmit) form.requestSubmit(whatsappBtn);
});

document.addEventListener("submit", function (event) {
  const dsrForm = event.target.closest("[data-dsr-form]");
  if (!dsrForm) return;

  event.preventDefault();
  const formData = new FormData(dsrForm);

  fetch("/privacy/data-request", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
    body: JSON.stringify(Object.fromEntries(formData)),
  })
    .then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, data: data }; });
    })
    .then(function (result) {
      const confirmationEl = document.querySelector("[data-dsr-confirmation]");
      if (!confirmationEl) return;

      if (!result.ok) {
        confirmationEl.hidden = false;
        confirmationEl.textContent = result.data.error || "Could not submit your request. Please try again.";
        return;
      }

      dsrForm.reset();
      const respondByDate = new Date(result.data.respondBy).toLocaleDateString();
      confirmationEl.hidden = false;
      confirmationEl.textContent = "Request submitted. We aim to respond by " + respondByDate + ".";
    })
    .catch(function () {
      console.error("Data subject request submission failed");
    });
});
