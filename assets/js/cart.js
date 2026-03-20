// cart.js — Business logic INTACT. Visual layer upgraded.

let productsIndex = new Map();
let cart = new Map();

const STORAGE_KEY = "rs_cart_v1";

const els = {
  openBtn: document.getElementById("cartOpenBtn"),
  closeBtn: document.getElementById("cartCloseBtn"),
  overlay: document.getElementById("cartOverlay"),
  drawer: document.getElementById("cartDrawer"),
  items: document.getElementById("cartItems"),
  count: document.getElementById("cartCount"),
  total: document.getElementById("cartTotal"),
  checkoutBtn: document.getElementById("checkoutBtn"),
};

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

// ─── Exports (API — unchanged) ────────────────────────────────────
export function setProductsIndex(products) {
  productsIndex = new Map((products || []).map((p) => [String(p.code), p]));
}

export function initCartUI() {
  loadCart();
  renderCart();
  bindDrawerControls();
  bindDelegatedClicks();
}

export function getCart() {
  return new Map(cart);
}
export function clearCart() {
  clear();
}

// ─── Drawer ───────────────────────────────────────────────────────
function openDrawer(open) {
  if (!els.drawer) return;
  requestAnimationFrame(() => {
    els.drawer.classList.toggle("is-open", !!open);
    els.drawer.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      setTimeout(() => els.closeBtn?.focus(), 120);
    } else {
      els.openBtn?.focus();
    }
  });
}

function bindDrawerControls() {
  els.openBtn?.addEventListener("click", () => openDrawer(true));
  els.closeBtn?.addEventListener("click", () => openDrawer(false));
  els.overlay?.addEventListener("click", () => openDrawer(false));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && els.drawer?.classList.contains("is-open")) {
      openDrawer(false);
    }
  });

  els.checkoutBtn?.addEventListener("click", (e) => {
    const btn = e.currentTarget;
    const originalHTML = btn.innerHTML;

    btn.style.width = `${btn.offsetWidth}px`;
    btn.innerHTML = `<span style="opacity:.75">Preparando pedido…</span>`;
    btn.disabled = true;

    setTimeout(() => {
      const url = buildWhatsAppUrl(btn.dataset.phone);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      btn.innerHTML = originalHTML;
      btn.style.width = "";
      btn.disabled = false;
    }, 560);
  });
}

function bindDelegatedClicks() {
  document.addEventListener("click", (e) => {
    // ── Add to cart (from product cards)
    const addBtn = e.target.closest("[data-add-to-cart]");
    if (addBtn) {
      const code = String(addBtn.getAttribute("data-add-to-cart") || "");
      if (!code || !productsIndex.has(code)) return;

      add(code, 1);

      // Visual feedback on button
      const originalHTML = addBtn.innerHTML;
      const w = addBtn.offsetWidth;
      addBtn.style.width = `${w}px`;
      addBtn.innerHTML = `<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" style="vertical-align:middle;margin-right:4px"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>¡Agregado!`;
      addBtn.style.background = "var(--color-success)";

      if (navigator?.vibrate) navigator.vibrate(45);

      setTimeout(() => {
        addBtn.innerHTML = originalHTML;
        addBtn.style.width = "";
        addBtn.style.background = "";
      }, 1100);
      return;
    }

    // ── Cart controls (inside drawer)
    const cartBtn = e.target.closest("[data-cart-action]");
    if (!cartBtn) return;

    const action = cartBtn.dataset.cartAction;
    const code = String(cartBtn.dataset.code || "");

    if (action === "inc") {
      add(code, 1);
      return;
    }
    if (action === "dec") {
      add(code, -1);
      return;
    }

    if (action === "rm") {
      const row = cartBtn.closest(".cart-item");
      if (row) {
        row.style.transition = "transform 0.28s ease, opacity 0.28s ease";
        row.style.transform = "translateX(32px)";
        row.style.opacity = "0";
        row.addEventListener("transitionend", () => remove(code), {
          once: true,
        });
      } else {
        remove(code);
      }
      return;
    }

    if (action === "clear") {
      if (els.items) {
        els.items.style.transition = "opacity 0.25s ease";
        els.items.style.opacity = "0";
        setTimeout(() => {
          clear();
          els.items.style.opacity = "1";
        }, 260);
      } else {
        clear();
      }
    }
  });
}

// ─── Operations (business logic — unchanged) ─────────────────────
function add(code, delta) {
  const prev = cart.get(code) || 0;
  const next = prev + delta;
  if (next <= 0) cart.delete(code);
  else cart.set(code, next);
  saveCart();
  renderCart();
}

function remove(code) {
  cart.delete(code);
  saveCart();
  renderCart();
}

function clear() {
  cart.clear();
  saveCart();
  renderCart();
}

// ─── Persistence (unchanged) ─────────────────────────────────────
function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    cart = new Map(
      items
        .filter((it) => it && it.code != null && Number(it.qty) > 0)
        .map((it) => [String(it.code), Number(it.qty)]),
    );
  } catch {
    cart = new Map();
  }
}

function saveCart() {
  const payload = {
    v: 1,
    items: Array.from(cart.entries()).map(([code, qty]) => ({ code, qty })),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

// ─── Render ───────────────────────────────────────────────────────
function renderCart() {
  const { count, total } = computeTotals();

  // Badge count with bump animation
  if (els.count) {
    const prev = els.count.textContent;
    if (prev !== String(count)) {
      els.count.textContent = count;
      els.count.classList.remove("bump");
      void els.count.offsetWidth;
      els.count.classList.add("bump");
    }
  }

  // Total
  if (els.total) els.total.textContent = money.format(total);

  if (!els.items) return;

  const entries = Array.from(cart.entries());

  if (!entries.length) {
    els.items.innerHTML = renderEmptyCart();
    return;
  }

  const rows = entries
    .map(([code, qty], i) => renderRow(code, qty, i))
    .join("");

  els.items.innerHTML = `
    ${rows}
    <div class="cart__clear-wrap" style="margin-top:var(--space-4)">
      <button
        class="cart__clear-btn"
        type="button"
        data-cart-action="clear"
        aria-label="Vaciar todo el carrito"
      >
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
        </svg>
        Vaciar carrito
      </button>
    </div>
  `;

  // Stagger animation on newly rendered items
  els.items.querySelectorAll(".cart-item").forEach((item, i) => {
    item.style.opacity = "0";
    item.style.transform = "translateY(12px)";
    item.style.transition = `opacity 0.28s ease ${i * 50}ms, transform 0.28s ease ${i * 50}ms`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        item.style.opacity = "1";
        item.style.transform = "translateY(0)";
      });
    });
  });
}

function renderEmptyCart() {
  return `
<div class="cart-empty" role="status" aria-live="polite">
  <div class="cart-empty__icon">
    <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.4">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"/>
    </svg>
  </div>
  <p class="cart-empty__text">Tu carrito está vacío</p>
  <p class="cart-empty__sub">Explorá el catálogo y agregá productos</p>
</div>`;
}

function renderRow(code, qty, index = 0) {
  const p = productsIndex.get(code);
  const desc = escapeHtml(p?.description ?? `Producto ${code}`);
  const brand = p?.brand ? escapeHtml(p.brand) : "";
  const rimText = p?.rim ? ` · Rod. ${escapeHtml(p.rim)}` : "";
  const priceUnit = p?.active
    ? money.format(Number(p.price || 0))
    : "Consultar";
  const priceTotal = p?.active ? money.format(Number(p.price || 0) * qty) : "—";
  const imgSrc = escapeHtml(
    p?.image_url || p?.image_urls?.[0] || "./assets/img/placeholder.jpg",
  );

  return `
<div class="cart-item" data-code="${escapeHtml(code)}">
  <div class="cart-item__img">
    <img src="${imgSrc}" alt="${desc}" loading="lazy" />
  </div>
  <div class="cart-item__top">
    <p class="cart-item__name">${desc}</p>
    <p class="cart-item__meta">${brand}${rimText} · Cód. ${escapeHtml(code)}</p>
    <p class="cart-item__meta" style="color:var(--color-text-secondary);font-size:var(--font-size-xs)">
      ${priceUnit} c/u
    </p>
    <div class="cart-item__bottom">
      <div class="qty" role="group" aria-label="Cantidad">
        <button
          class="qty__btn"
          type="button"
          data-cart-action="dec"
          data-code="${escapeHtml(code)}"
          aria-label="Quitar uno"
        >
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15"/>
          </svg>
        </button>
        <span class="qty__value" aria-live="polite">${qty}</span>
        <button
          class="qty__btn"
          type="button"
          data-cart-action="inc"
          data-code="${escapeHtml(code)}"
          aria-label="Agregar uno"
        >
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
        </button>
      </div>
      <span class="cart-item__price">${priceTotal}</span>
      <button
        class="cart-item__remove"
        type="button"
        data-cart-action="rm"
        data-code="${escapeHtml(code)}"
        aria-label="Eliminar ${desc}"
      >
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
        </svg>
      </button>
    </div>
  </div>
</div>`;
}

// ─── Totals (business logic — unchanged) ─────────────────────────
function computeTotals() {
  let count = 0;
  let total = 0;
  for (const [code, qty] of cart.entries()) {
    count += qty;
    const p = productsIndex.get(code);
    if (p?.active) total += Number(p.price || 0) * qty;
  }
  return { count, total };
}

// ─── WhatsApp (business logic — unchanged) ───────────────────────
function buildWhatsAppUrl(phoneRaw) {
  const phone = String(phoneRaw || "").replace(/[^\d]/g, "");
  if (!phone) {
    alert("Falta configurar el número de WhatsApp (data-phone).");
    return null;
  }
  if (!cart.size) {
    alert("El carrito está vacío.");
    return null;
  }

  const lines = [];
  for (const [code, qty] of cart.entries()) {
    const p = productsIndex.get(code);
    const desc = p?.description ?? `Producto ${code}`;
    const priceText = p?.active
      ? money.format(Number(p.price || 0))
      : "Consultar";
    lines.push(`• ${desc} (Cód: ${code}) x${qty} — ${priceText}`);
  }

  const { total } = computeTotals();
  const msg =
    `¡Hola! Me gustaría hacer el siguiente pedido:\n\n` +
    lines.join("\n") +
    `\n\n*Total aprox. (ítems con precio):* ${money.format(total)}\n\n¡Quedo a la espera, gracias!`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

// ─── Inline styles for cart-specific elements ────────────────────
(function injectCartStyles() {
  if (document.getElementById("cart-ui-styles")) return;
  const s = document.createElement("style");
  s.id = "cart-ui-styles";
  s.textContent = `
    .cart-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-16) var(--space-8);
      text-align: center;
      gap: var(--space-2);
    }
    .cart-empty__icon {
      width: 64px; height: 64px;
      border-radius: var(--radius-full);
      background: var(--color-surface-2);
      display: grid; place-items: center;
      color: var(--color-text-muted);
      margin-bottom: var(--space-3);
    }
    .cart-empty__text {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
    }
    .cart-empty__sub {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
    .cart__clear-wrap {
      display: flex;
      justify-content: center;
      padding-top: var(--space-2);
      border-top: 1px solid var(--color-border-subtle);
    }
    .cart__clear-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-muted);
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-full);
      transition: background var(--duration-fast) var(--ease-out),
                  color var(--duration-fast) var(--ease-out);
    }
    .cart__clear-btn:hover {
      background: #fee2e2;
      color: var(--color-danger);
    }
  `;
  document.head.appendChild(s);
})();

// ─── Utils ───────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
