// render.js

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
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
  const img = p.image_url ? p.image_url : "./assets/img/placeholder.jpg";
  const price = p.active ? money.format(p.price) : "Consultar";

  return `
    <article class="card" data-code="${escapeHtml(p.code)}">
      <div class="card__img">
        <img src="${escapeHtml(img)}" alt="${escapeHtml(p.description)}" loading="lazy" />
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

export function renderProducts(products, els) {
  const count = products.length;

  if (!count) {
    els.productsGrid.innerHTML = "";
    els.emptyState.hidden = false;
    return;
  }

  els.emptyState.hidden = true;
  els.productsGrid.innerHTML = products.map(cardTemplate).join("");
}