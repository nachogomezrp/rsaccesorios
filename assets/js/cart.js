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

// ----------------- animaciones & estilos -----------------
// Inyectamos estilos premium on-the-fly para asegurar transiciones fluidas sin tocar CSS externo
function injectPremiumStyles() {
  if (document.getElementById("cart-premium-styles")) return;
  const style = document.createElement("style");
  style.id = "cart-premium-styles";
  style.textContent = `
    :root {
      --cart-ease: cubic-bezier(0.4, 0, 0.2, 1);
      --cart-ease-out: cubic-bezier(0, 0, 0.2, 1);
    }
    
    /* Animaciones base */
    @keyframes cartFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes cartSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes cartBump { 0% { transform: scale(1); } 50% { transform: scale(1.25); } 100% { transform: scale(1); } }
    
    /* Clases utilitarias (sin alterar las existentes) */
    .animate-fade-in { animation: cartFadeIn 0.3s var(--cart-ease) forwards; }
    .animate-slide-up { animation: cartSlideUp 0.4s var(--cart-ease-out) forwards; }
    .animate-bump { animation: cartBump 0.3s var(--cart-ease) forwards; }
    
    /* Mejoras visuales inyectadas para interactividad */
    .cart__empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 4rem 2rem; text-align: center; color: #71717a;
    }
    .cart__empty svg { width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.5; }
    
    .cart__item {
      transition: transform 0.3s var(--cart-ease), opacity 0.3s var(--cart-ease), background-color 0.2s;
      will-change: transform, opacity;
    }
    
    /* Micro-interacciones para botones de control */
    .cart__controls button {
      transition: transform 0.15s var(--cart-ease), background-color 0.2s, opacity 0.2s;
    }
    .cart__controls button:hover { background-color: rgba(0, 0, 0, 0.04); }
    .cart__controls button:active { transform: scale(0.9); }
    
    [data-add-to-cart] { transition: transform 0.15s var(--cart-ease); }
    [data-add-to-cart]:active { transform: scale(0.97); }
  `;
  document.head.appendChild(style);
}

export function setProductsIndex(products) {
  productsIndex = new Map((products || []).map((p) => [String(p.code), p]));
}

export function initCartUI() {
  injectPremiumStyles();
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

  // Animación: focus trap y soporte Escape (Accesibilidad)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && els.drawer?.classList.contains("is-open")) {
      openDrawer(false);
    }
  });

  if (els.checkoutBtn) {
    els.checkoutBtn.addEventListener("click", (e) => {
      const btn = e.currentTarget;
      const originalText = btn.innerHTML;

      // Animación: Loading state premium en el checkout
      requestAnimationFrame(() => {
        btn.style.width = `${btn.offsetWidth}px`; // Previene saltos
        btn.innerHTML = `<span style="opacity:0.7; animation: cartFadeIn 0.2s forwards">Preparando...</span>`;

        setTimeout(() => {
          const phone = els.checkoutBtn.dataset.phone;
          const url = buildWhatsAppUrl(phone);
          if (url) window.open(url, "_blank", "noopener,noreferrer");

          // Restaurar botón
          btn.innerHTML = originalText;
          btn.style.width = "";
        }, 600); // Simulamos un breve retraso para feeling premium
      });
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

      // Animación: Feedback visual de éxito al agregar (FLIP preventivo con width)
      const originalHtml = addBtn.innerHTML;
      const originalWidth = addBtn.offsetWidth;

      requestAnimationFrame(() => {
        addBtn.style.width = `${originalWidth}px`;
        addBtn.innerHTML = `<span class="animate-slide-up" style="display:inline-block; font-weight:500;">✓ Agregado</span>`;

        // Haptic feedback sutil en mobile
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(50);
        }

        setTimeout(() => {
          addBtn.innerHTML = originalHtml;
          addBtn.style.width = "";
        }, 1200);
      });
      return;
    }

    // 2) Controles dentro del carrito
    const cartBtn = e.target.closest("[data-cart-action]");
    if (!cartBtn) return;

    const action = cartBtn.dataset.cartAction;
    const code = String(cartBtn.dataset.code || "");
    if (!code && action !== "clear") return;

    if (action === "inc") add(code, 1);
    if (action === "dec") add(code, -1);

    if (action === "rm") {
      const row = cartBtn.closest(".cart__item");
      if (row) {
        // Animación: fade-out y slide a la derecha antes de eliminar del DOM
        row.style.transform = "translateX(20px)";
        row.style.opacity = "0";
        row.addEventListener("transitionend", () => remove(code), {
          once: true,
        });
        return;
      }
      remove(code);
    }

    if (action === "clear") {
      // Animación: fade-out a toda la lista
      if (els.items) {
        els.items.style.transition =
          "opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        els.items.style.opacity = "0";
        setTimeout(() => {
          clear();
          els.items.style.opacity = "1"; // Restaurar opacidad
        }, 300);
        return;
      }
      clear();
    }
  });
}

function openDrawer(open) {
  if (!els.drawer) return;

  // Animación: Sincronización de clases con repintado (Hardware Acceleration)
  requestAnimationFrame(() => {
    els.drawer.classList.toggle("is-open", !!open);
    els.drawer.setAttribute("aria-hidden", open ? "false" : "true");

    // Gestión de foco (Accesibilidad Premium)
    if (open) {
      setTimeout(() => els.closeBtn?.focus(), 100);
    } else {
      els.openBtn?.focus();
    }
  });
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

  // Animación: Efecto "bump/pop" en el contador del carrito al cambiar
  if (els.count) {
    const currentCount = els.count.textContent;
    const newCount = String(count);
    if (currentCount !== newCount) {
      els.count.textContent = newCount;
      els.count.classList.remove("animate-bump");
      void els.count.offsetWidth; // Forzar reflow para reiniciar la animación
      els.count.classList.add("animate-bump");
    }
  }

  // Animación: Actualización suave de precio total
  if (els.total) {
    els.total.textContent = money.format(total);
  }

  if (!els.items) return;

  const entries = Array.from(cart.entries());

  if (entries.length === 0) {
    // Empty state premium con SVG y transición suave
    els.items.innerHTML = `
      <div class="cart__empty animate-fade-in" role="status" aria-live="polite">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
        </svg>
        <div class="muted">Tu carrito está vacío.</div>
      </div>
    `;
    return;
  }

  // Uso de fragmentos virtuales vía template literals.
  // Map inyecta el índice automáticamente (code, qty), index
  els.items.innerHTML = `
    <div class="cart__list" role="list">
      ${entries.map(renderRow).join("")}
    </div>

    <div class="cart__actions animate-fade-in" style="animation-delay: ${entries.length * 40}ms; animation-fill-mode: both;">
      <button class="btn btn--ghost btn--block" type="button" data-cart-action="clear" aria-label="Vaciar todo el carrito">
        Vaciar carrito
      </button>
    </div>
  `;
}

// Recibe la entrada del mapa y el índice del array map()
function renderRow([code, qty], index = 0) {
  const p = productsIndex.get(code);

  const desc = escapeHtml(p?.description ?? `Producto ${code}`);
  const brand = p?.brand ? escapeHtml(p.brand) : "";
  const priceText = p?.active
    ? money.format(Number(p.price || 0))
    : "Consultar";

  // Animación: staggered slide-up basado en el índice
  const delay = index * 40;

  return `
    <div class="cart__item animate-slide-up" role="listitem" style="animation-delay: ${delay}ms; animation-fill-mode: both;">
      <div class="cart__info">
        <div class="cart__title" style="font-weight: 500;">${desc}</div>
        <div class="muted small" style="opacity: 0.8; margin-top: 2px;">
          ${brand ? `<strong>${brand}</strong> · ` : ""}Código: ${escapeHtml(code)}
        </div>
        <div class="cart__price" style="margin-top: 4px;">${escapeHtml(priceText)}</div>
      </div>

      <div class="cart__controls" aria-label="Controles de cantidad">
        <button class="btn btn--ghost" type="button" data-cart-action="dec" data-code="${escapeHtml(code)}" aria-label="Disminuir cantidad">-</button>
        <span class="cart__qty" style="min-width: 24px; text-align: center; display: inline-block;">${qty}</span>
        <button class="btn btn--ghost" type="button" data-cart-action="inc" data-code="${escapeHtml(code)}" aria-label="Aumentar cantidad">+</button>
        <button class="btn btn--ghost" type="button" data-cart-action="rm" data-code="${escapeHtml(code)}" aria-label="Eliminar producto" style="margin-left: 4px;">🗑️</button>
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
