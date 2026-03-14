// render.js

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

  return `
    <article class="card" data-code="${escapeHtml(p.code)}">
      <div class="card__img-slider" data-slider>
        <div class="card__img">
          <img
            src="${escapeHtml(images[0])}"
            alt="${escapeHtml(p.description)}"
            loading="lazy"
            data-slider-image
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

      <div class="card__body">
        <div class="badges">
          <span class="badge">${escapeHtml(p.category)}</span>
          <span class="badge">${escapeHtml(p.brand)}</span>
          ${p.rim ? `<span class="badge">${escapeHtml(p.rim)}</span>` : ""}
        </div>

        <div class="card__title">${escapeHtml(p.description)}</div>

        <div class="card__meta">
          <div>Código: ${escapeHtml(p.code)}</div>
        </div>

        <div class="price">
          <div class="price__value ${p.active ? "" : "price__value--muted"}">${escapeHtml(price)}</div>
          <button
            class="btn btn--primary"
            type="button"
            data-add-to-cart="${escapeHtml(p.code)}"
            ${p.active ? "" : "disabled"}
          >
            Agregar
          </button>
        </div>
      </div>
    </article>
  `;
}

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
      images = JSON.parse(dataEl.textContent);
    } catch {
      images = [];
    }

    if (!Array.isArray(images) || images.length <= 1) return;
    images.forEach((src, index) => {
      if (index === 0) return;
      const preloadImg = new Image();
      preloadImg.src = src;
    });

    let current = 0;

    const renderSlide = () => {
      imgEl.src = images[current];

      dotEls.forEach((dot, index) => {
        dot.classList.toggle("is-active", index === current);
      });
    };

    prevBtn?.addEventListener("click", () => {
      current = (current - 1 + images.length) % images.length;
      renderSlide();
    });

    nextBtn?.addEventListener("click", () => {
      current = (current + 1) % images.length;
      renderSlide();
    });

    dotEls.forEach((dot) => {
      dot.addEventListener("click", () => {
        current = Number(dot.dataset.index) || 0;
        renderSlide();
      });
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

  els.emptyState.hidden = true;
  els.productsGrid.innerHTML = products.map(cardTemplate).join("");
  setupCardSliders(els.productsGrid);
}
