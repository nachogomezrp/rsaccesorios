// render.js — Visual layer only. Business logic untouched.

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ─── SVG icons ────────────────────────────────────────────────────
const IconCart = `<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"/>
</svg>`;

const IconEye = `<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
</svg>`;

const IconChevLeft = `<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
</svg>`;

const IconChevRight = `<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
</svg>`;

// ─── Card template ────────────────────────────────────────────────
function cardTemplate(p) {
  const images =
    Array.isArray(p.image_urls) && p.image_urls.length
      ? p.image_urls
      : p.image_url
        ? [p.image_url]
        : ["./assets/img/placeholder.jpg"];

  const price = p.active ? money.format(p.price) : "Consultar precio";
  const hasSlider = images.length > 1;
  const detailHref = `./product.html?code=${encodeURIComponent(p.code)}`;
  const isConsult = !p.active;

  return `
<article class="card" data-code="${escapeHtml(p.code)}">

  <div class="card__img-slider" data-slider>

    <a class="card__detail-link" href="${escapeHtml(detailHref)}" tabindex="-1" aria-hidden="true">
      <div class="card__img">
        <img
          src="${escapeHtml(images[0])}"
          alt="${escapeHtml(p.description)}"
          loading="lazy"
          data-slider-image
        />
      </div>
    </a>

    ${
      hasSlider
        ? `
    <button class="card__slider-btn card__slider-btn--prev" type="button" aria-label="Imagen anterior" data-slider-prev>
      ${IconChevLeft}
    </button>
    <button class="card__slider-btn card__slider-btn--next" type="button" aria-label="Imagen siguiente" data-slider-next>
      ${IconChevRight}
    </button>
    <div class="card__slider-dots">
      ${images
        .map(
          (_, i) => `
        <button
          class="card__slider-dot ${i === 0 ? "is-active" : ""}"
          type="button"
          aria-label="Ver imagen ${i + 1}"
          data-slider-dot
          data-index="${i}"
        ></button>
      `,
        )
        .join("")}
    </div>
    `
        : ""
    }

    <script type="application/json" class="card__slider-data">${JSON.stringify(images)}</script>

    <!-- Quick add overlay (shown on hover via CSS) -->
    <div class="card__quick-add">
      <button
        class="btn-card btn-card--overlay"
        type="button"
        data-add-to-cart="${escapeHtml(p.code)}"
        ${isConsult ? "disabled" : ""}
        aria-label="Agregar al carrito"
      >
        ${IconCart}
        ${isConsult ? "Consultar" : "Agregar al carrito"}
      </button>
    </div>

  </div>

  <div class="card__body">

    <div class="badges">
      <span class="badge badge--brand">${escapeHtml(p.category)}</span>
      <span class="badge">${escapeHtml(p.brand)}</span>
      ${p.rim ? `<span class="badge">${escapeHtml(p.rim)}</span>` : ""}
    </div>

    <a class="card__detail-link" href="${escapeHtml(detailHref)}">
      <h3 class="card__title">${escapeHtml(p.description)}</h3>
    </a>

    <p class="card__meta">Cód. ${escapeHtml(p.code)}</p>

    <div class="price">
      <span class="price__value ${isConsult ? "price__value--muted" : ""}">${escapeHtml(price)}</span>
    </div>

    <div class="card__actions">
      <button
        class="btn-card"
        type="button"
        data-add-to-cart="${escapeHtml(p.code)}"
        ${isConsult ? "disabled" : ""}
      >
        ${IconCart}
        ${isConsult ? "Consultar precio" : "Agregar al carrito"}
      </button>
    </div>

  </div>
</article>`;
}

// ─── Polyfill ─────────────────────────────────────────────────────
window.requestIdleCallback =
  window.requestIdleCallback ||
  function (cb) {
    const start = Date.now();
    return setTimeout(
      () =>
        cb({
          didTimeout: false,
          timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
        }),
      1,
    );
  };

// ─── Image slider per card ────────────────────────────────────────
function setupCardSliders(root) {
  root.querySelectorAll("[data-slider]").forEach((slider) => {
    const dataEl = slider.querySelector(".card__slider-data");
    const imgEl = slider.querySelector("[data-slider-image]");
    const prevBtn = slider.querySelector("[data-slider-prev]");
    const nextBtn = slider.querySelector("[data-slider-next]");
    const dotEls = Array.from(slider.querySelectorAll("[data-slider-dot]"));

    if (!dataEl || !imgEl) return;

    let images = [];
    try {
      images = JSON.parse(dataEl.textContent.trim());
    } catch {
      images = [];
    }
    if (!Array.isArray(images) || images.length <= 1) return;

    // Preload in background
    requestIdleCallback(() => {
      images.forEach((src, i) => {
        if (i === 0) return;
        const img = new Image();
        img.src = src;
      });
    });

    let current = 0;
    let isAnimating = false;

    const go = (index) => {
      if (isAnimating || index === current) return;
      isAnimating = true;
      current = (index + images.length) % images.length;

      imgEl.style.opacity = "0";
      imgEl.style.transform = "scale(1.03)";

      setTimeout(() => {
        imgEl.src = images[current];
        imgEl.onload = () => {
          requestAnimationFrame(() => {
            imgEl.style.opacity = "1";
            imgEl.style.transform = "scale(1)";
            isAnimating = false;
          });
        };
        imgEl.onerror = () => {
          isAnimating = false;
        };
      }, 140);

      dotEls.forEach((dot, i) =>
        dot.classList.toggle("is-active", i === current),
      );
    };

    // Apply transition style
    imgEl.style.transition =
      "opacity 0.25s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1)";

    prevBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      go(current - 1);
    });
    nextBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      go(current + 1);
    });
    dotEls.forEach((dot) => {
      dot.addEventListener("click", (e) => {
        e.preventDefault();
        go(Number(dot.dataset.index) || 0);
      });
    });
  });
}

// ─── Scroll reveal with stagger ──────────────────────────────────
function setupCardScrollReveal(gridEl) {
  const cards = gridEl.querySelectorAll(".card");
  if (!cards.length) return;

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        // Stagger by column position
        const rect = entry.target.getBoundingClientRect();
        const col = Math.max(0, Math.round(rect.left / (rect.width + 20)));
        const delay = col * 55;
        entry.target.style.transitionDelay = `${delay}ms`;
        requestAnimationFrame(() => {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
        });
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
  );

  cards.forEach((card) => obs.observe(card));
}

// ─── Ripple effect on add button ─────────────────────────────────
function setupRipples(root) {
  root.querySelectorAll(".btn-card[data-add-to-cart]").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      if (this.disabled) return;

      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2.2;

      const ripple = document.createElement("span");
      Object.assign(ripple.style, {
        position: "absolute",
        left: `${x - size / 2}px`,
        top: `${y - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.28)",
        transform: "scale(0)",
        transition:
          "transform 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.5s ease",
        pointerEvents: "none",
      });

      this.style.position = "relative";
      this.style.overflow = "hidden";
      this.appendChild(ripple);

      requestAnimationFrame(() => {
        ripple.style.transform = "scale(1)";
        ripple.style.opacity = "0";
      });

      setTimeout(() => ripple.remove(), 520);
    });
  });
}

// ─── Fly-to-cart trigger ──────────────────────────────────────────
function setupFlyToCart(root) {
  root.querySelectorAll(".btn-card[data-add-to-cart]").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      if (this.disabled) return;
      // Dispatch custom event so main.js can handle the animation
      document.dispatchEvent(
        new CustomEvent("fly-to-cart", {
          detail: { sourceEl: this },
        }),
      );
    });
  });
}

// ─── Cart item template ───────────────────────────────────────────
export function cartItemTemplate(item) {
  const img =
    item.image_url || item.image_urls?.[0] || "./assets/img/placeholder.jpg";
  const price = item.active ? money.format(item.price * item.qty) : "A cotizar";

  return `
<div class="cart-item" data-code="${escapeHtml(item.code)}">
  <div class="cart-item__img">
    <img src="${escapeHtml(img)}" alt="${escapeHtml(item.description)}" loading="lazy" />
  </div>
  <div class="cart-item__top">
    <p class="cart-item__name">${escapeHtml(item.description)}</p>
    <p class="cart-item__meta">
      ${escapeHtml(item.brand)}${item.rim ? ` · Rodado ${escapeHtml(item.rim)}` : ""}
    </p>
    <div class="cart-item__bottom">
      <div class="qty">
        <button class="qty__btn" type="button" data-qty-dec="${escapeHtml(item.code)}" aria-label="Quitar uno">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15"/>
          </svg>
        </button>
        <span class="qty__value">${item.qty}</span>
        <button class="qty__btn" type="button" data-qty-inc="${escapeHtml(item.code)}" aria-label="Agregar uno">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
        </button>
      </div>
      <span class="cart-item__price">${escapeHtml(price)}</span>
      <button class="cart-item__remove" type="button" data-remove="${escapeHtml(item.code)}" aria-label="Eliminar">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
        </svg>
      </button>
    </div>
  </div>
</div>`;
}

// ─── Empty cart template ──────────────────────────────────────────
export function emptyCartTemplate() {
  return `
<div class="cart-empty">
  <div class="cart-empty__icon">
    <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.4">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"/>
    </svg>
  </div>
  <p class="cart-empty__text">Tu carrito está vacío</p>
  <p class="cart-empty__sub">Agregá productos para continuar</p>
</div>`;
}

// ─── Main export ──────────────────────────────────────────────────
export function renderProducts(products, els) {
  if (els.emptyState && els.emptyState.hidden !== undefined) {
    els.emptyState.hidden = true;
  }

  if (!products.length) {
    if (els.productsGrid) els.productsGrid.innerHTML = "";
    return;
  }

  // Sacar el requestAnimationFrame — renderizar directo
  if (els.productsGrid) {
    els.productsGrid.innerHTML = products.map(cardTemplate).join("");
    setupCardSliders(els.productsGrid);
    setupCardScrollReveal(els.productsGrid);
    setupRipples(els.productsGrid);
    setupFlyToCart(els.productsGrid);
  }
}
