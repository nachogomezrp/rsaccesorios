// render.js

// Animación: Inyección de estilos premium (fade-in, hover lift, smooth sliders)
const injectCardPremiumStyles = () => {
  if (document.getElementById("premium-card-styles")) return;
  const style = document.createElement("style");
  style.id = "premium-card-styles";
  style.textContent = `
    :root {
      --card-ease: cubic-bezier(0.4, 0, 0.2, 1);
      --card-duration: 400ms;
    }
    
    @keyframes cardFadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .card {
      transition: transform var(--card-duration) var(--card-ease), box-shadow var(--card-duration) var(--card-ease);
      will-change: transform, box-shadow, opacity;
      opacity: 0; /* Preparado para IntersectionObserver */
      border-radius: 12px;
      overflow: hidden;
    }
    .card.is-visible {
      animation: cardFadeInUp var(--card-duration) var(--card-ease) forwards;
    }
    .card:hover {
      transform: translateY(-6px);
      box-shadow: 0 16px 32px -12px rgba(0, 0, 0, 0.15);
    }

    .card__img-slider {
      position: relative;
      overflow: hidden;
      background: #fafafa;
    }
    
    .card__img img {
      transition: opacity 250ms ease, transform 500ms var(--card-ease);
      will-change: opacity, transform;
    }
    .card:hover .card__img img {
      transform: scale(1.03);
    }
    .card__img img.is-transitioning {
      opacity: 0;
    }

    .card__slider-btn {
      transition: opacity 250ms ease, transform 250ms var(--card-ease), background-color 250ms ease;
      backdrop-filter: blur(4px);
      background: rgba(255, 255, 255, 0.7);
      opacity: 0; /* Se muestran al hacer hover en la tarjeta */
      transform: scale(0.9);
    }
    .card:hover .card__slider-btn {
      opacity: 1;
      transform: scale(1);
    }
    .card__slider-btn:hover {
      background: rgba(255, 255, 255, 0.95);
      transform: scale(1.1) !important;
    }

    .card__slider-dots {
      transition: opacity 250ms ease;
    }
    .card__slider-dot {
      transition: all 300ms var(--card-ease);
      background: rgba(0, 0, 0, 0.2);
    }
    .card__slider-dot.is-active {
      background: rgba(0, 0, 0, 0.8);
      transform: scale(1.2);
    }

    .btn {
      transition: transform 200ms var(--card-ease), box-shadow 200ms var(--card-ease), background-color 200ms ease;
      will-change: transform;
    }
    .btn:active:not(:disabled) {
      transform: scale(0.96);
    }
    .card__detail-link {
      transition: color 200ms ease, text-decoration 200ms ease;
    }
  `;
  document.head.appendChild(style);
};
injectCardPremiumStyles();

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

function cardTemplate(p) {
  const images =
    Array.isArray(p.image_urls) && p.image_urls.length
      ? p.image_urls
      : p.image_url
        ? [p.image_url]
        : ["./assets/img/placeholder.jpg"];

  const price = p.active ? money.format(p.price) : "Consultar";
  const hasSlider = images.length > 1;
  const detailHref = `./product.html?code=${encodeURIComponent(p.code)}`;

  return `
    <article class="card" data-code="${escapeHtml(p.code)}">
      <div class="card__img-slider" data-slider>
        <div class="card__img">
          <img
            src="${escapeHtml(images[0])}"
            alt="${escapeHtml(p.description)}"
            loading="lazy"
            data-slider-image
            style="display: block; width: 100%; object-fit: cover; aspect-ratio: 1/1;"
          />
        </div>

        ${
          hasSlider
            ? `
              <button
                class="card__slider-btn card__slider-btn--prev"
                type="button"
                aria-label="Imagen anterior"
                data-slider-prev
              >
                ‹
              </button>

              <button
                class="card__slider-btn card__slider-btn--next"
                type="button"
                aria-label="Imagen siguiente"
                data-slider-next
              >
                ›
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

        <script type="application/json" class="card__slider-data">
          ${JSON.stringify(images)}
        </script>
      </div>

      <div class="card__body" style="padding: 16px; display: flex; flex-direction: column; gap: 8px;">
        <div class="badges" style="display: flex; flex-wrap: wrap; gap: 4px;">
          <span class="badge">${escapeHtml(p.category)}</span>
          <span class="badge">${escapeHtml(p.brand)}</span>
          ${p.rim ? `<span class="badge">${escapeHtml(p.rim)}</span>` : ""}
        </div>

        <div class="card__title" style="font-weight: 500; font-size: 1.05rem; line-height: 1.4; margin-top: 4px;">
          ${escapeHtml(p.description)}
        </div>

        <div class="card__meta" style="font-size: 0.85rem; color: #64748b;">
          <div>Código: ${escapeHtml(p.code)}</div>
        </div>

        <div class="price" style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 12px;">
          <div class="price__value ${p.active ? "" : "price__value--muted"}" style="font-weight: 700; font-size: 1.25rem;">
            ${escapeHtml(price)}
          </div>
          <button
            class="btn btn--primary"
            type="button"
            data-add-to-cart="${escapeHtml(p.code)}"
            ${p.active ? "" : "disabled"}
            style="position: relative; overflow: hidden;"
          >
            Agregar
          </button>
        </div>

        <div class="card__footer" style="margin-top: 8px;">
          <a class="btn btn--ghost btn--block card__detail-link" href="${escapeHtml(detailHref)}">
            Ver detalle
          </a>
        </div>
      </div>
    </article>
  `;
}

// Polyfill ligero para requestIdleCallback
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

function setupCardSliders(root) {
  const sliders = root.querySelectorAll("[data-slider]");

  sliders.forEach((slider) => {
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

    // Animación: Pre-carga silenciosa en background thread
    requestIdleCallback(() => {
      images.forEach((src, index) => {
        if (index === 0) return;
        const preloadImg = new Image();
        preloadImg.src = src;
      });
    });

    let current = 0;
    let isAnimating = false;

    // Animación: Transición cruzada (Crossfade) entre imágenes de la tarjeta
    const renderSlide = () => {
      if (isAnimating) return;
      isAnimating = true;

      imgEl.classList.add("is-transitioning");

      setTimeout(() => {
        imgEl.src = images[current];

        imgEl.onload = () => {
          requestAnimationFrame(() => {
            imgEl.classList.remove("is-transitioning");
            isAnimating = false;
          });
        };

        imgEl.onerror = () => {
          imgEl.classList.remove("is-transitioning");
          isAnimating = false;
        };
      }, 150);

      dotEls.forEach((dot, index) => {
        dot.classList.toggle("is-active", index === current);
      });
    };

    prevBtn?.addEventListener("click", (e) => {
      e.preventDefault(); // Previene comportamientos indeseados en el link padre si lo hubiera
      current = (current - 1 + images.length) % images.length;
      renderSlide();
    });

    nextBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      current = (current + 1) % images.length;
      renderSlide();
    });

    dotEls.forEach((dot) => {
      dot.addEventListener("click", (e) => {
        e.preventDefault();
        const targetIndex = Number(dot.dataset.index) || 0;
        if (current === targetIndex) return;
        current = targetIndex;
        renderSlide();
      });
    });
  });
}

// Animación: Scroll reveal dinámico usando IntersectionObserver
function setupCardScrollReveal(gridEl) {
  const cards = gridEl.querySelectorAll(".card");
  if (!cards.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Obtenemos el index relativo para crear un efecto de cascada (stagger) en la misma fila
          const rect = entry.target.getBoundingClientRect();
          const column = Math.round(rect.left / rect.width);
          const delay = column * 100; // 100ms por columna

          entry.target.style.animationDelay = `${delay}ms`;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    },
  );

  cards.forEach((card) => observer.observe(card));
}

// Animación: Efecto Ripple premium en los botones de "Agregar"
function setupCardRipples(root) {
  const addBtns = root.querySelectorAll(".btn--primary[data-add-to-cart]");

  addBtns.forEach((btn) => {
    btn.addEventListener("click", function (e) {
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
        transition: transform 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 500ms ease-out;
        pointer-events: none;
      `;

      this.appendChild(circle);

      requestAnimationFrame(() => {
        circle.style.transform = `scale(${Math.max(rect.width, rect.height) * 2.5})`;
        circle.style.opacity = "0";
      });

      setTimeout(() => circle.remove(), 500);
    });
  });
}

export function renderProducts(products, els) {
  const count = products.length;

  if (!count) {
    els.productsGrid.innerHTML = "";
    els.emptyState.hidden = false;
    return;
  }

  // Animación: DOM Batching para evitar reflows costosos y renderizado suave
  requestAnimationFrame(() => {
    els.emptyState.hidden = true;

    // Generación eficiente con Fragment / innerHTML en un solo paso
    els.productsGrid.innerHTML = products.map(cardTemplate).join("");

    // Inicialización de lógica visual y animaciones
    setupCardSliders(els.productsGrid);
    setupCardScrollReveal(els.productsGrid);
    setupCardRipples(els.productsGrid);
  });
}
