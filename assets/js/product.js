import { loadProducts } from "./data.js";
import { renderProducts } from "./render.js";
import { initCartUI, setProductsIndex } from "./cart.js";

// Animación: Inyección de estilos premium (fade-in, slide-up, skeletons, hover states)
const injectPremiumStyles = () => {
  if (document.getElementById("premium-styles")) return;
  const style = document.createElement("style");
  style.id = "premium-styles";
  style.textContent = `
    :root {
      --anim-duration: 400ms;
      --anim-ease: cubic-bezier(0.4, 0, 0.2, 1);
    }
    @keyframes premiumFadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes premiumSkeletonPulse {
      0% { opacity: 0.5; background-color: #f1f5f9; }
      50% { opacity: 1; background-color: #e2e8f0; }
      100% { opacity: 0.5; background-color: #f1f5f9; }
    }
    .anim-fade-in-up {
      animation: premiumFadeInUp var(--anim-duration) var(--anim-ease) both;
    }
    .anim-delay-1 { animation-delay: 100ms; }
    .anim-delay-2 { animation-delay: 200ms; }
    .anim-delay-3 { animation-delay: 300ms; }
    .anim-delay-4 { animation-delay: 400ms; }
    
    .product-detail__main-image {
      transition: opacity 300ms var(--anim-ease), transform 400ms var(--anim-ease);
      will-change: opacity, transform;
    }
    .product-detail__main-image.is-transitioning {
      opacity: 0;
      transform: scale(0.97);
    }
    
    .product-detail__thumb {
      transition: transform 250ms var(--anim-ease), opacity 250ms var(--anim-ease), box-shadow 250ms var(--anim-ease);
      will-change: transform;
    }
    .product-detail__thumb:hover {
      transform: translateY(-2px);
      opacity: 0.9;
    }
    .product-detail__thumb.is-active {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }

    .btn {
      transition: transform 250ms var(--anim-ease), box-shadow 250ms var(--anim-ease), background-color 250ms ease;
      will-change: transform, box-shadow;
    }
    .btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px -6px rgba(0, 0, 0, 0.15);
    }
    .btn:active:not(:disabled) {
      transform: translateY(1px);
      box-shadow: 0 2px 4px -2px rgba(0, 0, 0, 0.1);
    }
    
    .skeleton-block {
      animation: premiumSkeletonPulse 1.5s infinite ease-in-out;
      border-radius: 8px;
    }
  `;
  document.head.appendChild(style);
};
injectPremiumStyles();

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const els = {
  productDetail: document.getElementById("productDetail"),
  relatedProductsGrid: document.getElementById("relatedProductsGrid"),
};

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
  if (Array.isArray(product.image_urls) && product.image_urls.length) {
    return product.image_urls;
  }

  if (product.image_url) {
    return [product.image_url];
  }

  return ["./assets/img/placeholder.jpg"];
}

function renderProductDetail(product) {
  const images = getProductImages(product);
  const price = product.active ? money.format(product.price) : "Consultar";

  // Animación: Uso de requestAnimationFrame para asegurar renderizado suave del DOM
  requestAnimationFrame(() => {
    els.productDetail.innerHTML = `
      <div class="product-detail__gallery anim-fade-in-up" data-product-gallery>
        <div class="product-detail__main-image-wrap" style="overflow: hidden; border-radius: 12px; background: #fafafa;">
          <img
            class="product-detail__main-image"
            src="${escapeHtml(images[0])}"
            alt="${escapeHtml(product.description)}"
            data-product-main-image
            loading="eager"
          />

          ${
            images.length > 1
              ? `
                <button
                  class="product-detail__arrow product-detail__arrow--prev btn"
                  type="button"
                  aria-label="Imagen anterior"
                  data-product-prev
                  style="backdrop-filter: blur(8px); background: rgba(255,255,255,0.85);"
                >
                  ‹
                </button>

                <button
                  class="product-detail__arrow product-detail__arrow--next btn"
                  type="button"
                  aria-label="Imagen siguiente"
                  data-product-next
                  style="backdrop-filter: blur(8px); background: rgba(255,255,255,0.85);"
                >
                  ›
                </button>
              `
              : ""
          }
        </div>

        ${
          images.length > 1
            ? `
              <div class="product-detail__thumbs anim-fade-in-up anim-delay-1">
                ${images
                  .map(
                    (img, index) => `
                      <button
                        class="product-detail__thumb ${index === 0 ? "is-active" : ""}"
                        type="button"
                        data-product-thumb
                        data-index="${index}"
                        aria-label="Ver imagen ${index + 1}"
                        style="border-radius: 8px; overflow: hidden;"
                      >
                        <img src="${escapeHtml(img)}" alt="${escapeHtml(product.description)} miniatura ${index + 1}" loading="lazy" />
                      </button>
                    `,
                  )
                  .join("")}
              </div>
            `
            : ""
        }

        <script type="application/json" class="product-detail__gallery-data">
          ${JSON.stringify(images)}
        </script>
      </div>

      <div class="product-detail__info">
        <div class="badges anim-fade-in-up anim-delay-1">
          <span class="badge" style="transition: transform 0.2s ease;">${escapeHtml(product.category)}</span>
          <span class="badge" style="transition: transform 0.2s ease;">${escapeHtml(product.brand)}</span>
          ${product.rim ? `<span class="badge" style="transition: transform 0.2s ease;">${escapeHtml(product.rim)}</span>` : ""}
        </div>

        <h1 class="product-detail__title anim-fade-in-up anim-delay-2" style="font-weight: 600; letter-spacing: -0.5px;">
          ${escapeHtml(product.description)}
        </h1>

        <div class="product-detail__meta anim-fade-in-up anim-delay-2">
          <div><strong>Código:</strong> ${escapeHtml(product.code)}</div>
          <div><strong>Marca:</strong> ${escapeHtml(product.brand)}</div>
          <div><strong>Categoría:</strong> ${escapeHtml(product.category)}</div>
        </div>

        <div class="product-detail__price ${product.active ? "" : "product-detail__price--muted"} anim-fade-in-up anim-delay-3" style="font-weight: 700; font-size: 1.5rem;">
          ${escapeHtml(price)}
        </div>
        ${
          product.detail
            ? `<div class="product-detail__description anim-fade-in-up anim-delay-3" style="line-height: 1.6; color: #475569;">
                 ${escapeHtml(product.detail).replace(/\n/g, "<br>")}
               </div>`
            : ""
        }

        <div class="product-detail__actions anim-fade-in-up anim-delay-4">
          <button
            class="btn btn--primary product-detail__add"
            type="button"
            data-add-to-cart="${escapeHtml(product.code)}"
            ${product.active ? "" : "disabled"}
            style="position: relative; overflow: hidden;"
          >
            Agregar al carrito
          </button>

          <a class="btn btn--ghost" href="./index.html">
            Seguir viendo productos
          </a>
        </div>
      </div>
    `;

    setupProductGallery();
    setupButtonRipples(); // Animación: Micro-interacción premium de ripple
  });
}

// Animación: Efecto de ripple suave estilo Material Design / Premium E-commerce
function setupButtonRipples() {
  const addBtn = document.querySelector(".product-detail__add");
  if (!addBtn) return;

  addBtn.addEventListener("click", function (e) {
    if (this.disabled) return;
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const circle = document.createElement("span");
    circle.style.cssText = `
      position: absolute;
      top: ${y}px;
      left: ${x}px;
      width: 1px;
      height: 1px;
      background: rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      transform: scale(1);
      transition: transform 600ms cubic-bezier(0.4, 0, 0.2, 1), opacity 600ms ease-out;
      pointer-events: none;
    `;

    this.appendChild(circle);

    requestAnimationFrame(() => {
      circle.style.transform = `scale(${Math.max(rect.width, rect.height) * 2})`;
      circle.style.opacity = "0";
    });

    setTimeout(() => circle.remove(), 600);
  });
}

function setupProductGallery() {
  const gallery = document.querySelector("[data-product-gallery]");
  if (!gallery) return;

  const dataEl = gallery.querySelector(".product-detail__gallery-data");
  const mainImg = gallery.querySelector("[data-product-main-image]");
  const prevBtn = gallery.querySelector("[data-product-prev]");
  const nextBtn = gallery.querySelector("[data-product-next]");
  const thumbEls = Array.from(gallery.querySelectorAll("[data-product-thumb]"));

  if (!dataEl || !mainImg) return;

  let images = [];

  try {
    images = JSON.parse(dataEl.textContent.trim());
  } catch {
    images = [];
  }

  if (!Array.isArray(images) || !images.length) return;

  // Animación: Pre-carga silenciosa en tiempo inactivo
  requestIdleCallback(() => {
    images.forEach((src, index) => {
      if (index === 0) return;
      const preloadImg = new Image();
      preloadImg.src = src;
    });
  });

  let current = 0;
  let isAnimating = false;

  // Animación: Transición cruzada suave entre imágenes principales
  function render() {
    if (isAnimating) return;
    isAnimating = true;

    mainImg.classList.add("is-transitioning");

    // Esperar a que la imagen se difumine a la mitad antes de cambiar el src (Crossfade effect)
    setTimeout(() => {
      mainImg.src = images[current];

      mainImg.onload = () => {
        requestAnimationFrame(() => {
          mainImg.classList.remove("is-transitioning");
          isAnimating = false;
        });
      };

      // Fallback robusto
      mainImg.onerror = () => {
        mainImg.classList.remove("is-transitioning");
        isAnimating = false;
      };
    }, 150);

    thumbEls.forEach((thumb, index) => {
      thumb.classList.toggle("is-active", index === current);
      // Animación: Mantener scroll de thumbnails enfocado suavemente
      if (index === current) {
        thumb.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    });
  }

  prevBtn?.addEventListener("click", () => {
    current = (current - 1 + images.length) % images.length;
    render();
  });

  nextBtn?.addEventListener("click", () => {
    current = (current + 1) % images.length;
    render();
  });

  thumbEls.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const targetIndex = Number(thumb.dataset.index) || 0;
      if (current === targetIndex) return;
      current = targetIndex;
      render();
    });
  });
}

function getRelatedProducts(products, product) {
  return products
    .filter((p) => p.code !== product.code && p.category === product.category)
    .slice(0, 4);
}

// Animación: IntersectionObserver para los productos relacionados (Scroll Reveal suave)
function setupRelatedProductsObserver() {
  if (!els.relatedProductsGrid) return;

  els.relatedProductsGrid.style.opacity = "0";
  els.relatedProductsGrid.style.transform = "translateY(20px)";
  els.relatedProductsGrid.style.transition =
    "opacity 600ms cubic-bezier(0.4, 0, 0.2, 1), transform 600ms cubic-bezier(0.4, 0, 0.2, 1)";

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          requestAnimationFrame(() => {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
          });
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
  );

  observer.observe(els.relatedProductsGrid);
}

// Animación: Renderizado del estado de carga inicial (Skeleton Loader)
function renderSkeleton() {
  els.productDetail.innerHTML = `
    <div class="product-detail__gallery">
      <div class="skeleton-block" style="width: 100%; aspect-ratio: 1/1; max-height: 500px; background: #e2e8f0;"></div>
      <div style="display: flex; gap: 8px; margin-top: 16px;">
        <div class="skeleton-block" style="width: 80px; height: 80px; background: #e2e8f0;"></div>
        <div class="skeleton-block" style="width: 80px; height: 80px; background: #e2e8f0;"></div>
        <div class="skeleton-block" style="width: 80px; height: 80px; background: #e2e8f0;"></div>
      </div>
    </div>
    <div class="product-detail__info">
      <div class="skeleton-block" style="width: 60%; height: 40px; margin-bottom: 24px; background: #e2e8f0;"></div>
      <div class="skeleton-block" style="width: 100%; height: 20px; margin-bottom: 12px; background: #e2e8f0;"></div>
      <div class="skeleton-block" style="width: 80%; height: 20px; margin-bottom: 32px; background: #e2e8f0;"></div>
      <div class="skeleton-block" style="width: 40%; height: 40px; margin-bottom: 32px; background: #e2e8f0;"></div>
      <div class="skeleton-block" style="width: 100%; height: 56px; border-radius: 8px; background: #e2e8f0;"></div>
    </div>
  `;
}

async function boot() {
  try {
    // Animación: Feedback inmediato de carga premium
    renderSkeleton();

    const products = await loadProducts();
    const code = getQueryCode();
    const product = products.find((p) => String(p.code).toUpperCase() === code);

    setProductsIndex(products);
    initCartUI();

    if (!product) {
      // Animación: Empty state mejorado visualmente
      els.productDetail.innerHTML = `
        <div class="empty anim-fade-in-up" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px 24px; text-align: center; width: 100%;">
          <div class="empty__title" style="font-size: 1.5rem; font-weight: 600; margin-bottom: 8px; color: #0f172a;">Producto no encontrado</div>
          <div class="empty__text" style="color: #64748b; margin-bottom: 24px;">No pudimos encontrar el producto solicitado en nuestro catálogo.</div>
          <a class="btn btn--primary anim-fade-in-up anim-delay-1" href="./index.html">Volver a la tienda</a>
        </div>
      `;
      if (els.relatedProductsGrid) els.relatedProductsGrid.innerHTML = "";
      return;
    }

    document.title = `${product.description} | RS Accesorios`;

    renderProductDetail(product);

    const related = getRelatedProducts(products, product);
    renderProducts(related, {
      productsGrid: els.relatedProductsGrid,
      emptyState: { hidden: true },
    });

    // Animación: Disparar scroll reveal luego de popular el grid
    setupRelatedProductsObserver();
  } catch (error) {
    console.error("Error al cargar detalle de producto:", error);

    // Animación: Error state visual
    els.productDetail.innerHTML = `
      <div class="empty anim-fade-in-up" style="padding: 48px 24px; text-align: center; width: 100%;">
        <div class="empty__title" style="font-size: 1.25rem; font-weight: 600; color: #ef4444; margin-bottom: 8px;">No se pudo cargar el producto</div>
        <div class="empty__text" style="color: #64748b;">Ocurrió un error inesperado. Probá recargando la página.</div>
      </div>
    `;
  }
}

// Polyfill ligero para Safari / Navegadores sin requestIdleCallback
window.requestIdleCallback =
  window.requestIdleCallback ||
  function (cb) {
    const start = Date.now();
    return setTimeout(function () {
      cb({
        didTimeout: false,
        timeRemaining: function () {
          return Math.max(0, 50 - (Date.now() - start));
        },
      });
    }, 1);
  };

boot();
