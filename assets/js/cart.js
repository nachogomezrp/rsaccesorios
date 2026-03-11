let productsIndex = new Map(); // code -> product
let cart = new Map(); // code -> qty

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

export function setProductsIndex(products) {
  productsIndex = new Map((products || []).map((p) => [String(p.code), p]));
}

export function initCartUI() {
  loadCart();
  renderCart();
  bindDrawerControls();
  bindDelegatedClicks();
}

function bindDrawerControls() {
  if (els.openBtn)
    els.openBtn.addEventListener("click", () => openDrawer(true));
  if (els.closeBtn)
    els.closeBtn.addEventListener("click", () => openDrawer(false));
  if (els.overlay)
    els.overlay.addEventListener("click", () => openDrawer(false));

  // Escape para cerrar
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") openDrawer(false);
  });

  if (els.checkoutBtn) {
    els.checkoutBtn.addEventListener("click", () => {
      const phone = els.checkoutBtn.dataset.phone; // viene del HTML
      const url = buildWhatsAppUrl(phone);
      if (!url) return;
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }
}

function bindDelegatedClicks() {
  document.addEventListener("click", (e) => {
    // 1) Agregar desde cards
    const addBtn = e.target.closest("[data-add-to-cart]");
    if (addBtn) {
      const code = String(addBtn.getAttribute("data-add-to-cart") || "");
      if (!code) return;
      if (!productsIndex.has(code)) return;

      add(code, 1);
      return;
    }

    // 2) Controles dentro del carrito
    const cartBtn = e.target.closest("[data-cart-action]");
    if (!cartBtn) return;

    const action = cartBtn.dataset.cartAction;
    const code = String(cartBtn.dataset.code || "");
    if (!code) return;

    if (action === "inc") add(code, 1);
    if (action === "dec") add(code, -1);
    if (action === "rm") remove(code);
    if (action === "clear") clear();
  });
}

function openDrawer(open) {
  if (!els.drawer) return;

  els.drawer.classList.toggle("is-open", !!open);
  els.drawer.setAttribute("aria-hidden", open ? "false" : "true");
}

// ----------------- operaciones -----------------

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

// ----------------- persistencia -----------------

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

// ----------------- render -----------------

function renderCart() {
  const { count, total } = computeTotals();

  if (els.count) els.count.textContent = String(count);
  if (els.total) els.total.textContent = money.format(total);

  if (!els.items) return;

  const entries = Array.from(cart.entries());
  if (entries.length === 0) {
    els.items.innerHTML = `
      <div class="cart__empty">
        <div class="muted">Tu carrito está vacío.</div>
      </div>
    `;
    return;
  }

  els.items.innerHTML = `
    <div class="cart__list">
      ${entries.map(renderRow).join("")}
    </div>

    <div class="cart__actions">
      <button class="btn btn--ghost btn--block" type="button" data-cart-action="clear">
        Vaciar carrito
      </button>
    </div>
  `;
}

function renderRow([code, qty]) {
  const p = productsIndex.get(code);

  const desc = escapeHtml(p?.description ?? `Producto ${code}`);
  const brand = p?.brand ? escapeHtml(p.brand) : "";
  const priceText = p?.active
    ? money.format(Number(p.price || 0))
    : "Consultar";

  return `
    <div class="cart__item">
      <div class="cart__info">
        <div class="cart__title">${desc}</div>
        <div class="muted small">
          ${brand ? `${brand} · ` : ""}Código: ${escapeHtml(code)}
        </div>
        <div class="cart__price">${escapeHtml(priceText)}</div>
      </div>

      <div class="cart__controls">
        <button class="btn btn--ghost" type="button" data-cart-action="dec" data-code="${escapeHtml(code)}">-</button>
        <span class="cart__qty">${qty}</span>
        <button class="btn btn--ghost" type="button" data-cart-action="inc" data-code="${escapeHtml(code)}">+</button>
        <button class="btn btn--ghost" type="button" data-cart-action="rm" data-code="${escapeHtml(code)}">🗑️</button>
      </div>
    </div>
  `;
}

function computeTotals() {
  let count = 0;
  let total = 0;

  for (const [code, qty] of cart.entries()) {
    count += qty;

    const p = productsIndex.get(code);
    if (p?.active) {
      total += Number(p.price || 0) * qty;
    }
  }

  return { count, total };
}

// ----------------- WhatsApp -----------------

function buildWhatsAppUrl(phoneRaw) {
  const phone = String(phoneRaw || "").replace(/[^\d]/g, "");
  if (!phone) {
    alert("Falta configurar el número de WhatsApp (data-phone).");
    return null;
  }

  if (cart.size === 0) {
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

    lines.push(`- ${desc} (Código: ${code}) x${qty} — ${priceText}`);
  }

  const { total } = computeTotals();

  const msg =
    `Hola! Quiero hacer un pedido:\n\n` +
    lines.join("\n") +
    `\n\nTotal aprox (solo ítems con precio): ${money.format(total)}\n`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

// ----------------- utils -----------------

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function getCart() {
  return new Map(cart);
}
export function clearCart() {
  clear();
}
