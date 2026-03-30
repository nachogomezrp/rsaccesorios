// product.js — Visual layer upgraded. Business logic untouched.

import { loadProducts } from "./data.js";
import { renderProducts } from "./render.js";
import { initCartUI, setProductsIndex } from "./cart.js";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const els = {
  productDetail: document.getElementById("productDetail"),
  relatedProductsGrid: document.getElementById("relatedProductsGrid"),
  breadcrumbProduct: document.getElementById("breadcrumbProduct"),
};

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

// ─── Utils ────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getQueryCode() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("code") ?? "")
    .trim()
    .toUpperCase();
}

function getProductImages(product) {
  if (Array.isArray(product.image_urls) && product.image_urls.length)
    return product.image_urls;
  if (product.image_url) return [product.image_url];
  return ["./assets/img/placeholder.jpg"];
}

function getRelatedProducts(products, product) {
  return products
    .filter((p) => p.code !== product.code && p.category === product.category)
    .slice(0, 4);
}

// ─── Header scroll ────────────────────────────────────────────────
(function initHeaderScroll() {
  const header = document.getElementById("mainHeader");
  if (!header) return;
  const handler = () =>
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  window.addEventListener("scroll", handler, { passive: true });
  handler();
})();

// ─── Cursor glow ──────────────────────────────────────────────────
(function initCursorGlow() {
  const glow = document.getElementById("cursorGlow");
  if (!glow || window.matchMedia("(pointer: coarse)").matches) {
    if (glow) glow.style.display = "none";
    return;
  }
  let rafId;
  document.addEventListener(
    "mousemove",
    (e) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      });
    },
    { passive: true },
  );
})();

// ─── Skeleton loader ──────────────────────────────────────────────
function renderSkeleton() {
  if (!els.productDetail) return;
  els.productDetail.innerHTML = `
    <div class="product-detail__gallery">
      <div class="skeleton-wrap">
        <div class="skeleton skeleton--main"></div>
        <div class="skeleton-thumbs">
          <div class="skeleton skeleton--thumb"></div>
          <div class="skeleton skeleton--thumb"></div>
          <div class="skeleton skeleton--thumb"></div>
        </div>
      </div>
    </div>
    <div class="product-detail__info">
      <div class="skeleton skeleton--badge-row"></div>
      <div class="skeleton skeleton--title"></div>
      <div class="skeleton skeleton--title" style="width:65%;margin-top:10px"></div>
      <div class="skeleton skeleton--price"></div>
      <div class="skeleton skeleton--meta"></div>
      <div class="skeleton skeleton--btn"></div>
    </div>
  `;
  injectSkeletonStyles();
}

function injectSkeletonStyles() {
  if (document.getElementById("skeleton-styles")) return;
  const s = document.createElement("style");
  s.id = "skeleton-styles";
  s.textContent = `
    @keyframes skeleton-shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position:  400px 0; }
    }
    .skeleton {
      background: linear-gradient(90deg,
        var(--neutral-150) 25%,
        var(--neutral-100) 50%,
        var(--neutral-150) 75%
      );
      background-size: 800px 100%;
      animation: skeleton-shimmer 1.5s infinite linear;
      border-radius: var(--radius-md);
    }
    .skeleton--main       { width:100%; aspect-ratio:4/4.5; border-radius:var(--radius-2xl); }
    .skeleton-thumbs      { display:flex; gap:var(--space-3); margin-top:var(--space-4); }
    .skeleton--thumb      { width:72px; height:72px; border-radius:var(--radius-md); flex-shrink:0; }
    .skeleton--badge-row  { width:40%; height:24px; margin-bottom:var(--space-5); }
    .skeleton--title      { width:90%; height:42px; }
    .skeleton--price      { width:50%; height:56px; margin-top:var(--space-5); border-radius:var(--radius-lg); }
    .skeleton--meta       { width:100%; height:80px; margin-top:var(--space-4); border-radius:var(--radius-md); }
    .skeleton--btn        { width:100%; height:54px; margin-top:var(--space-6); border-radius:var(--radius-lg); }
    .skeleton-wrap        { display:flex; flex-direction:column; }
  `;
  document.head.appendChild(s);
}

// ─── Product detail render ────────────────────────────────────────
function renderProductDetail(product) {
  const images = getProductImages(product);
  const price = product.active
    ? money.format(product.price)
    : "Consultar precio";
  const isConsult = !product.active;

  // Usar detalle como título principal, fallback a description
  const titulo = product.detalle || product.description || "";
  // Usar descripcion como texto largo, fallback a detalle
  const descripcionLarga = product.descripcion || product.detalle || "";

  if (!els.productDetail) return;

  els.productDetail.innerHTML = `
    <div class="product-detail__gallery" data-product-gallery>

      <div class="product-detail__main-image-wrap">
        <img
          class="product-detail__main-image"
          src="${escapeHtml(images[0])}"
          alt="${escapeHtml(titulo)}"
          data-product-main-image
          loading="eager"
        />

        ${
          images.length > 1
            ? `
          <button class="product-detail__arrow product-detail__arrow--prev" type="button" aria-label="Imagen anterior" data-product-prev>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
          </button>
          <button class="product-detail__arrow product-detail__arrow--next" type="button" aria-label="Imagen siguiente" data-product-next>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
            </svg>
          </button>
        `
            : ""
        }

        <div class="product-detail__zoom-hint" aria-hidden="true">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"/>
          </svg>
          Zoom
        </div>
      </div>

      ${
        images.length > 1
          ? `
        <div class="product-detail__thumbs">
          ${images
            .map(
              (img, i) => `
            <button
              class="product-detail__thumb ${i === 0 ? "is-active" : ""}"
              type="button"
              data-product-thumb
              data-index="${i}"
              aria-label="Ver imagen ${i + 1}"
            >
              <img src="${escapeHtml(img)}" alt="${escapeHtml(titulo)} — imagen ${i + 1}" loading="lazy" />
            </button>
          `,
            )
            .join("")}
        </div>
      `
          : ""
      }

      <script type="application/json" class="product-detail__gallery-data">${JSON.stringify(images)}</script>
    </div>

    <div class="product-detail__info">

      

      <!-- Título principal: columna "detalle" del Sheet -->
      <h1 class="product-detail__title">${escapeHtml(titulo)}</h1>

    <div class="badges" style="margin-top:var(--space-1)">
  <span class="badge">${escapeHtml(product.brand)}</span>
  ${product.rim ? `<span class="badge">Rod. ${escapeHtml(product.rim)}</span>` : ""}
</div>

      <div class="product-detail__price">
        <span class="product-detail__price-main ${isConsult ? "price__value--muted" : ""}">
          ${escapeHtml(price)}
        </span>
        ${isConsult ? "" : `<span class="product-detail__price--muted" style="font-size:var(--font-size-sm)"></span>`}
      </div>

      <!-- Descripción larga: columna "descripcion" del Sheet -->
      ${
        descripcionLarga
          ? `
        <div class="product-detail__description">
          ${escapeHtml(descripcionLarga).replace(/\n/g, "<br>")}
        </div>
      `
          : ""
      }

      <div class="product-detail__meta-grid">
        <div class="product-detail__meta-item">
          <div class="product-detail__meta-label">Marca</div>
          <div class="product-detail__meta-value">${escapeHtml(product.brand)}</div>
        </div>
        <div class="product-detail__meta-item">
          <div class="product-detail__meta-label">Categoría</div>
          <div class="product-detail__meta-value">${escapeHtml(product.category)}</div>
        </div>
        ${
          product.rim
            ? `
          <div class="product-detail__meta-item">
            <div class="product-detail__meta-label">Rodado</div>
            <div class="product-detail__meta-value">${escapeHtml(product.rim)}</div>
          </div>
        `
            : ""
        }
      </div>

      <!-- Trust badges -->
      <div class="product-detail__trust">
        <div class="trust-item">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
          </svg>
          Calidad garantizada
        </div>
        <div class="trust-item">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/>
          </svg>
          Envíos a todo el país
        </div>
        <div class="trust-item">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"/>
          </svg>
          Atención por WhatsApp
        </div>
      </div>

      <div class="product-detail__actions">
  <button
    class="product-detail__add"
    type="button"
    data-add-to-cart="${escapeHtml(product.code)}"
    ${isConsult ? "disabled" : ""}
  >
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"/>
    </svg>
    ${isConsult ? "Consultar precio" : "Agregar al carrito"}
  </button>

  
   <a class="product-detail__wa"
    href="${escapeHtml(`https://wa.me/5491131898284?text=${encodeURIComponent("Hola! Me interesa el producto: " + titulo + " (Cód: " + product.code + ")")}`)}"
  >
    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
    Consultar por WhatsApp
  </a>
</div>

    </div>
  `;

  animateProductDetail();
  setupProductGallery();
  setupAddButtonFeedback();
  injectProductPageStyles();
}

// ─── Entrance animations ──────────────────────────────────────────
function animateProductDetail() {
  const info = els.productDetail?.querySelector(".product-detail__info");
  const gallery = els.productDetail?.querySelector(".product-detail__gallery");
  if (!info || !gallery) return;

  [gallery, info].forEach((el, gi) => {
    el.style.opacity = "0";
    el.style.transform = `translateY(${gi === 1 ? 24 : 16}px)`;
    el.style.transition = `opacity 0.55s var(--ease-out) ${gi * 80}ms, transform 0.55s var(--ease-out) ${gi * 80}ms`;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }),
    );
  });

  const children = info.querySelectorAll(
    ".product-detail__eyebrow, .product-detail__title, .badges, .product-detail__price, .product-detail__description, .product-detail__meta-grid, .product-detail__trust, .product-detail__actions",
  );
  children.forEach((child, i) => {
    child.style.opacity = "0";
    child.style.transform = "translateY(16px)";
    child.style.transition = `opacity 0.45s var(--ease-out) ${160 + i * 60}ms, transform 0.45s var(--ease-out) ${160 + i * 60}ms`;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        child.style.opacity = "1";
        child.style.transform = "translateY(0)";
      }),
    );
  });
}

// ─── Gallery interaction ──────────────────────────────────────────
function setupProductGallery() {
  const gallery = els.productDetail?.querySelector("[data-product-gallery]");
  if (!gallery) return;

  const dataEl = gallery.querySelector(".product-detail__gallery-data");
  const mainImg = gallery.querySelector("[data-product-main-image]");
  const prevBtn = gallery.querySelector("[data-product-prev]");
  const nextBtn = gallery.querySelector("[data-product-next]");
  const thumbEls = Array.from(gallery.querySelectorAll("[data-product-thumb]"));
  const mainWrap = gallery.querySelector(".product-detail__main-image-wrap");

  if (!dataEl || !mainImg) return;

  let images = [];
  try {
    images = JSON.parse(dataEl.textContent.trim());
  } catch {
    images = [];
  }
  if (!Array.isArray(images) || !images.length) return;

  requestIdleCallback(() => {
    images.forEach((src, i) => {
      if (i === 0) return;
      const img = new Image();
      img.src = src;
    });
  });

  let current = 0;
  let isAnimating = false;

  function go(index) {
    if (isAnimating || index === current) return;
    isAnimating = true;
    current = (index + images.length) % images.length;

    mainImg.style.opacity = "0";
    mainImg.style.transform = "scale(0.97)";

    setTimeout(() => {
      mainImg.src = images[current];
      mainImg.onload = () => {
        requestAnimationFrame(() => {
          mainImg.style.opacity = "1";
          mainImg.style.transform = "scale(1)";
          isAnimating = false;
        });
      };
      mainImg.onerror = () => {
        isAnimating = false;
      };
    }, 180);

    thumbEls.forEach((thumb, i) => {
      thumb.classList.toggle("is-active", i === current);
      if (i === current) {
        thumb.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    });
  }

  mainImg.style.transition =
    "opacity 0.3s var(--ease-out), transform 0.4s var(--ease-out)";

  prevBtn?.addEventListener("click", () => go(current - 1));
  nextBtn?.addEventListener("click", () => go(current + 1));

  thumbEls.forEach((thumb) => {
    thumb.addEventListener("click", () => go(Number(thumb.dataset.index) || 0));
  });

  let touchStartX = 0;
  mainWrap?.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].clientX;
    },
    { passive: true },
  );
  mainWrap?.addEventListener(
    "touchend",
    (e) => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) diff > 0 ? go(current + 1) : go(current - 1);
    },
    { passive: true },
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") go(current - 1);
    if (e.key === "ArrowRight") go(current + 1);
  });

  // ── Zoom al click en imagen principal ──
  mainWrap?.addEventListener("click", () => {
    const src = mainImg.src;
    if (!src) return;

    // Crear overlay
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0.85)",
      zIndex: "99999",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "zoom-out",
      backdropFilter: "blur(4px)",
      animation: "fadeIn 0.2s ease",
    });

    const img = document.createElement("img");
    Object.assign(img.style, {
      maxWidth: "90vw",
      maxHeight: "90vh",
      objectFit: "contain",
      borderRadius: "12px",
      boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
      animation: "scaleIn 0.25s cubic-bezier(0.23,1,0.32,1)",
    });
    img.src = src;

    // Keyframes
    if (!document.getElementById("zoom-styles")) {
      const s = document.createElement("style");
      s.id = "zoom-styles";
      s.textContent = `
      @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
      @keyframes scaleIn { from { transform:scale(0.92); opacity:0 } to { transform:scale(1); opacity:1 } }
    `;
      document.head.appendChild(s);
    }

    overlay.appendChild(img);
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    // Cerrar
    const close = () => {
      overlay.style.opacity = "0";
      overlay.style.transition = "opacity 0.2s ease";
      setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = "";
      }, 200);
    };

    overlay.addEventListener("click", close);
    document.addEventListener("keydown", function handler(e) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", handler);
      }
    });
  });
}

// ─── Add button feedback ──────────────────────────────────────────
function setupAddButtonFeedback() {
  const addBtn = els.productDetail?.querySelector(".product-detail__add");
  if (!addBtn || addBtn.disabled) return;

  addBtn.addEventListener("click", function () {
    const original = this.innerHTML;
    this.style.minWidth = `${this.offsetWidth}px`;
    this.innerHTML = `
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
      </svg>
      ¡Agregado al carrito!
    `;
    this.style.background = "var(--color-success)";
    if (navigator?.vibrate) navigator.vibrate(45);
    setTimeout(() => {
      this.innerHTML = original;
      this.style.background = "";
      this.style.minWidth = "";
    }, 1500);
  });
}

// ─── Related products scroll reveal ──────────────────────────────
function setupRelatedReveal() {
  const grid = els.relatedProductsGrid;
  const section = document.getElementById("relatedSection");
  if (!grid || !section) return;

  grid.style.opacity = "0";
  grid.style.transform = "translateY(24px)";
  grid.style.transition =
    "opacity 0.6s var(--ease-out), transform 0.6s var(--ease-out)";

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        requestAnimationFrame(() => {
          grid.style.opacity = "1";
          grid.style.transform = "translateY(0)";
        });
        obs.unobserve(e.target);
      });
    },
    { threshold: 0.08 },
  );

  obs.observe(grid);
}

// ─── Product page extra styles ────────────────────────────────────
function injectProductPageStyles() {
  if (document.getElementById("product-page-styles")) return;
  const s = document.createElement("style");
  s.id = "product-page-styles";
  s.textContent = `
    .nav__back-link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: 0 var(--space-4);
      height: var(--header-nav-h);
      color: rgba(255,255,255,0.8);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      border-radius: var(--radius-sm);
      transition: color var(--duration-fast), background var(--duration-fast);
      white-space: nowrap;
    }
    .nav__back-link:hover {
      color: #fff;
      background: rgba(255,255,255,0.1);
    }
    .searchbar--disabled .searchbar__inner {
      opacity: 0.55;
      cursor: default;
    }
    .product-detail__zoom-hint {
      position: absolute;
      bottom: var(--space-3);
      right: var(--space-3);
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: var(--font-size-2xs);
      font-weight: var(--font-weight-medium);
      letter-spacing: var(--letter-spacing-wide);
      color: rgba(255,255,255,0.7);
      background: rgba(0,0,0,0.35);
      backdrop-filter: var(--blur-sm);
      padding: 4px 8px;
      border-radius: var(--radius-full);
      pointer-events: none;
      opacity: 0;
      transition: opacity var(--duration-base);
    }
    .product-detail__main-image-wrap:hover .product-detail__zoom-hint {
      opacity: 1;
    }
    .product-detail__trust {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      padding: var(--space-4) 0;
      border-top: 1px solid var(--color-border-subtle);
    }
    .trust-item {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
      padding: 5px 10px;
      border-radius: var(--radius-full);
      background: var(--color-surface-2);
      border: 1px solid var(--color-border-subtle);
    }
    .product-not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: var(--space-24) var(--space-8);
      grid-column: 1 / -1;
      gap: var(--space-4);
    }
    .product-not-found__icon {
      width: 72px; height: 72px;
      border-radius: var(--radius-full);
      background: var(--color-surface-2);
      display: grid; place-items: center;
      color: var(--color-text-muted);
      margin-bottom: var(--space-2);
    }
    .product-not-found__title {
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
    }
    .product-not-found__text {
      font-size: var(--font-size-base);
      color: var(--color-text-muted);
      max-width: 360px;
    }
    .product-not-found__btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: 12px 28px;
      border-radius: var(--radius-full);
      background: var(--gradient-brand);
      color: #fff;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      box-shadow: var(--shadow-brand);
      transition: box-shadow var(--duration-fast), transform var(--duration-fast) var(--ease-spring);
    }
    .product-not-found__btn:hover {
      box-shadow: var(--shadow-brand-lg);
      transform: translateY(-2px);
    }
  `;
  document.head.appendChild(s);
}
function initCategoriesMenu() {
  const toggle = document.getElementById("categoriesToggle");
  const menu = document.getElementById("categoriesMenu");
  const wrap = document.getElementById("navCategories");
  if (!toggle || !menu) return;

  let closeTimer;

  function open() {
    clearTimeout(closeTimer);
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
  }

  function close(delay = 200) {
    closeTimer = setTimeout(() => {
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    }, delay);
  }

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    clearTimeout(closeTimer);
    if (menu.hidden) {
      open();
    } else {
      close(0);
    }
  });

  if (window.innerWidth > 900) {
    wrap?.addEventListener("mouseenter", () => open());
    wrap?.addEventListener("mouseleave", () => close());
  }

  document.addEventListener("click", (e) => {
    if (menu.hidden) return;
    if (e.target.closest(".nav-categories")) return;
    close(0);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close(0);
  });

  menu.addEventListener("click", (e) => {
    if (e.target.closest("[data-nav-category]")) close(0);
  });
}
function initNavIndicator() {
  const nav = document.getElementById("mainNav");
  const inner = nav?.querySelector(".nav__inner");
  if (!inner) return;

  const indicator = document.createElement("div");
  indicator.className = "nav__indicator";
  inner.appendChild(indicator);

  function moveIndicator(el) {
    const navRect = inner.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    indicator.style.left = `${elRect.left - navRect.left}px`;
    indicator.style.width = `${elRect.width}px`;
    indicator.style.opacity = "1";
  }

  function hideIndicator() {
    const active = inner.querySelector(".nav__link.is-active");
    if (active) moveIndicator(active);
    else indicator.style.opacity = "0";
  }

  inner.querySelectorAll(".nav__link").forEach((link) => {
    link.addEventListener("mouseenter", () => moveIndicator(link));
    link.addEventListener("mouseleave", hideIndicator);
    link.addEventListener("focus", () => moveIndicator(link));
    link.addEventListener("blur", hideIndicator);
  });

  const activeObserver = new MutationObserver(() => {
    const active = inner.querySelector(".nav__link.is-active");
    if (active) moveIndicator(active);
    else indicator.style.opacity = "0";
  });

  inner.querySelectorAll(".nav__link").forEach((l) =>
    activeObserver.observe(l, {
      attributes: true,
      attributeFilter: ["class"],
    }),
  );
}
// ─── Boot ─────────────────────────────────────────────────────────
async function boot() {
  try {
    renderSkeleton();

    const products = await loadProducts();
    const code = getQueryCode();
    const product = products.find((p) => String(p.code).toUpperCase() === code);

    setProductsIndex(products);
    initCartUI();
    initCategoriesMenu();
    initNavIndicator();

    if (!product) {
      if (els.productDetail) {
        els.productDetail.innerHTML = `
          <div class="product-not-found">
            <div class="product-not-found__icon">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 10-4.773-4.773 3.375 3.375 0 004.774 4.774zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h1 class="product-not-found__title">Producto no encontrado</h1>
            <p class="product-not-found__text">No pudimos encontrar este producto. Puede que haya sido removido o que el enlace sea incorrecto.</p>
            <a href="./index.html" class="product-not-found__btn">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
              </svg>
              Volver al catálogo
            </a>
          </div>
        `;
      }
      if (els.relatedProductsGrid) els.relatedProductsGrid.innerHTML = "";
      return;
    }

    // Título de pestaña y breadcrumb usan detalle si existe
    const tituloMeta = product.detalle || product.description;
    document.title = `${tituloMeta} | RS Accesorios`;
    if (els.breadcrumbProduct) els.breadcrumbProduct.textContent = tituloMeta;

    renderProductDetail(product);

    const related = getRelatedProducts(products, product);
    if (els.relatedProductsGrid) {
      renderProducts(related, {
        productsGrid: els.relatedProductsGrid,
        emptyState: { hidden: true },
      });
    }

    setupRelatedReveal();

    // Fly to cart
    document.addEventListener("fly-to-cart", (e) => {
      const flyItem = document.getElementById("flyItem");
      const cartIcon = document.querySelector(".cart-trigger__icon");
      if (!flyItem || !cartIcon) return;

      const src = e.detail.sourceEl;
      const srcRect = src.getBoundingClientRect();
      const dstRect = cartIcon.getBoundingClientRect();

      const sx = srcRect.left + srcRect.width / 2 - 26;
      const sy = srcRect.top + srcRect.height / 2 - 26;
      const ex = dstRect.left + dstRect.width / 2 - 26;
      const ey = dstRect.top + dstRect.height / 2 - 26;

      flyItem.style.left = `${sx}px`;
      flyItem.style.top = `${sy}px`;
      flyItem.style.setProperty("--fly-x", `${ex - sx}px`);
      flyItem.style.setProperty("--fly-y", `${ey - sy}px`);

      const img =
        src.closest(".card")?.querySelector(".card__img img") ||
        els.productDetail?.querySelector(".product-detail__main-image");
      flyItem.innerHTML = img ? `<img src="${img.src}" alt="">` : "";

      flyItem.classList.remove("is-flying");
      void flyItem.offsetWidth;
      flyItem.classList.add("is-flying");

      flyItem.addEventListener(
        "animationend",
        () => {
          flyItem.classList.remove("is-flying");
          const badge = document.getElementById("cartCount");
          badge?.classList.remove("bump");
          void badge?.offsetWidth;
          badge?.classList.add("bump");
        },
        { once: true },
      );
    });
  } catch (err) {
    console.error("Error al cargar detalle de producto:", err);
    if (els.productDetail) {
      els.productDetail.innerHTML = `
        <div class="product-not-found">
          <div class="product-not-found__icon" style="color:var(--color-danger)">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
          </div>
          <h1 class="product-not-found__title" style="color:var(--color-danger)">Error al cargar</h1>
          <p class="product-not-found__text">No se pudo cargar la información. Intentá recargar la página.</p>
          <a href="./index.html" class="product-not-found__btn">Volver al catálogo</a>
        </div>
      `;
    }
  }
}

boot();
