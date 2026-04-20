import { loadProducts, normalizeText } from "./data.js";
import { renderProducts } from "./render.js";
import { initCartUI, setProductsIndex } from "./cart.js";

// ─── Element refs ────────────────────────────────────────────────
const els = {
  q: document.getElementById("q"),
  searchBtn: document.getElementById("searchBtn"),
  categoryNav: document.getElementById("categoryNav"),
  resultsCount: document.getElementById("resultsCount"),
  productsGrid: document.getElementById("productsGrid"),
  pagination: document.getElementById("pagination"),
  emptyState: document.getElementById("emptyState"),
  resultsSection: document.getElementById("resultsSection"),
  filterCategory: document.getElementById("filterCategory"),
  filterBrand: document.getElementById("filterBrand"),
  filterModel: document.getElementById("filterModel"),
  filterRim: document.getElementById("filterRim"),
  filterRimGroup: document.getElementById("filterRimGroup"),
  catalogSidebar: document.getElementById("catalogSidebar"),
  clearFiltersBtn: document.getElementById("clearFiltersBtn"),
  emptyReset: document.getElementById("emptyReset"),
  sortSelect: document.getElementById("sortSelect"),
};

let state = {
  products: [],
  category: "",
  currentPage: 1,
  pageSize: 16,
  sort: "",
  filters: { brand: "", model: "", rim: "" },
};

const pageMode = document.body.dataset.page || "home";
const isHomePage = pageMode === "home";
const isCatalogPage = pageMode === "catalog";

// ─── Pure helpers ────────────────────────────────────────────────
// CORRECCIÓN: normalizeText eliminada de aquí, se importa desde data.js

function getFeaturedProducts(products) {
  const espejos = products.filter((p) => p.category === "ESPEJOS").slice(0, 2);
  const tazas = products.filter((p) => p.category === "TAZAS").slice(0, 2);
  const opticas = products.filter((p) => p.category === "OPTICAS").slice(0, 2);
  const faros = products.filter((p) => p.category === "FAROS").slice(0, 2);
  const radiadores = products
    .filter((p) => p.category === "RADIADORES")
    .slice(0, 1);
  const deflectores = products
    .filter((p) => p.category === "DEFLECTORES")
    .slice(0, 1);
  return [
    ...espejos,
    ...tazas,
    ...opticas,
    ...faros,
    ...radiadores,
    ...deflectores,
  ];
}

function formatCategoryLabel(cat) {
  const map = {
    ESPEJOS: "Espejos",
    TAZAS: "Tazas",
    OPTICAS: "Ópticas",
    FAROS: "Faros",
    RADIADORES: "Radiadores",
    DEFLECTORES: "Deflectores",
  };
  return map[cat] || (cat ? cat.charAt(0) + cat.slice(1).toLowerCase() : "");
}

function uniqueValues(products, key) {
  return [...new Set(products.map((p) => p[key]).filter(Boolean))].sort(
    (a, b) => String(a).localeCompare(String(b), "es"),
  );
}

// Extrae las marcas simples descomponiendo valores compuestos (ej: "CITROEN-SUSUKI" → ["CITROEN", "SUSUKI"])
function extractBrands(products) {
  const brands = new Set();
  products.forEach((p) => {
    p.brand.split("-").forEach((b) => {
      const clean = b.trim();
      if (clean) brands.add(clean);
    });
  });
  return [...brands].sort((a, b) => a.localeCompare(b, "es"));
}

// Verifica si un producto pertenece a una marca, soportando marcas compuestas
function brandMatches(productBrand, filterBrand) {
  if (!filterBrand) return true;
  return productBrand
    .split("-")
    .map((b) => b.trim())
    .includes(filterBrand);
}

// Extrae modelos disponibles según marca y/o categoría
// Soporta marcas compuestas: "CITROEN" matchea productos con brand "CITROEN-SUSUKI"
function extractModels(products, brand = "", category = "") {
  const models = new Set();
  products.forEach((p) => {
    if (brand && !brandMatches(p.brand, brand)) return;
    if (category && p.category !== category) return;
    p.compatibilidadesList?.forEach((m) => models.add(m));
  });
  return [...models].sort((a, b) => a.localeCompare(b, "es"));
}

function goToCatalog({ category = "", q = "" } = {}) {
  const params = new URLSearchParams();
  if (category) params.set("cat", category);
  if (q) params.set("q", q);
  const queryString = params.toString();
  window.location.href = `./catalogo.html${queryString ? `?${queryString}` : ""}`;
}

// ─── Intersection Observer ───────────────────────────────────────
const revealObserver = new IntersectionObserver(
  (entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      requestAnimationFrame(() => entry.target.classList.add("is-visible"));
      obs.unobserve(entry.target);
    });
  },
  { rootMargin: "0px 0px -60px 0px", threshold: 0.08 },
);

function observeRevealItems() {
  document
    .querySelectorAll(".reveal-item")
    .forEach((el) => revealObserver.observe(el));
}

// ─── Header scroll ───────────────────────────────────────────────
(function initHeaderScroll() {
  const header = document.getElementById("mainHeader");
  if (!header) return;
  const handler = () =>
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  window.addEventListener("scroll", handler, { passive: true });
  handler();
})();

// ─── Cursor glow ─────────────────────────────────────────────────
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

// ─── Card tilt ───────────────────────────────────────────────────
function initCardTilt(card) {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    card.style.transform = `translateY(-8px) scale(1.01) rotateX(${(-dy * 5).toFixed(2)}deg) rotateY(${(dx * 5).toFixed(2)}deg)`;
    card.style.transition = "transform 0.08s linear";
  });
  card.addEventListener("mouseleave", () => {
    card.style.transform = "";
    card.style.transition = "";
  });
}

// ─── Fly to cart ─────────────────────────────────────────────────
function flyToCart(sourceEl) {
  const flyItem = document.getElementById("flyItem");
  const cartIcon = document.querySelector(".cart-trigger__icon");
  if (!flyItem || !cartIcon) return;
  const srcRect = sourceEl.getBoundingClientRect();
  const destRect = cartIcon.getBoundingClientRect();
  const startX = srcRect.left + srcRect.width / 2 - 26;
  const startY = srcRect.top + srcRect.height / 2 - 26;
  const endX = destRect.left + destRect.width / 2 - 26;
  const endY = destRect.top + destRect.height / 2 - 26;
  flyItem.style.left = `${startX}px`;
  flyItem.style.top = `${startY}px`;
  flyItem.style.setProperty("--fly-x", `${endX - startX}px`);
  flyItem.style.setProperty("--fly-y", `${endY - startY}px`);
  const img = sourceEl.closest(".card")?.querySelector(".card__img img");
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
}

// ─── Hero slider ─────────────────────────────────────────────────
function initHeroSlider() {
  const slides = Array.from(document.querySelectorAll(".hero__slide"));
  const dots = Array.from(document.querySelectorAll(".hero__dot"));
  const prevBtn = document.getElementById("heroPrev");
  const nextBtn = document.getElementById("heroNext");
  const progress = document.getElementById("heroProgress");
  if (!slides.length) return;
  let current = 0;
  let autoPlayId = null;
  let progressId = null;
  let elapsed = 0;
  const DURATION = 6000;

  function updateSlider(index) {
    const prev = current;
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      if (i === current) {
        slide.classList.add("hero__slide--active");
        slide.style.zIndex = "2";
        slide.setAttribute("aria-hidden", "false");
      } else if (i === prev) {
        slide.classList.remove("hero__slide--active");
        slide.style.zIndex = "1";
        slide.setAttribute("aria-hidden", "true");
        setTimeout(() => {
          slide.style.zIndex = "0";
        }, 900);
      } else {
        slide.classList.remove("hero__slide--active");
        slide.style.zIndex = "0";
        slide.setAttribute("aria-hidden", "true");
      }
    });
    dots.forEach((dot, i) => {
      const active = i === current;
      dot.classList.toggle("hero__dot--active", active);
      dot.setAttribute("aria-selected", String(active));
    });
    resetProgress();
  }

  function resetProgress() {
    elapsed = 0;
    if (progress) progress.style.width = "0%";
  }

  function startProgress() {
    clearInterval(progressId);
    elapsed = 0;
    const step = 50;
    progressId = setInterval(() => {
      elapsed += step;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      if (progress) progress.style.width = `${pct}%`;
    }, step);
  }

  function startAutoPlay() {
    stopAutoPlay();
    startProgress();
    autoPlayId = setInterval(() => {
      updateSlider(current + 1);
      startProgress();
    }, DURATION);
  }

  function stopAutoPlay() {
    clearInterval(autoPlayId);
    clearInterval(progressId);
    autoPlayId = null;
    progressId = null;
  }

  prevBtn?.addEventListener("click", () => {
    updateSlider(current - 1);
    startAutoPlay();
  });
  nextBtn?.addEventListener("click", () => {
    updateSlider(current + 1);
    startAutoPlay();
  });
  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      updateSlider(i);
      startAutoPlay();
    });
  });

  const heroSection = document.getElementById("heroSection");
  heroSection?.addEventListener("mouseenter", stopAutoPlay);
  heroSection?.addEventListener("mouseleave", startAutoPlay);

  document.querySelectorAll(".hero__cta[data-nav-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const category = btn.getAttribute("data-nav-category") || "";
      if (isHomePage) {
        goToCatalog({ category });
        return;
      }
      state.category = category;
      state.currentPage = 1;
      clearDependentFilters();
      setActiveNav(state.category);
      updateModelFilter();
      updateRimFilterVisibility();
      apply();
      scrollToResults();
    });
  });

  let touchStartX = 0;
  heroSection?.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].clientX;
    },
    { passive: true },
  );
  heroSection?.addEventListener(
    "touchend",
    (e) => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        diff > 0 ? updateSlider(current + 1) : updateSlider(current - 1);
        startAutoPlay();
      }
    },
    { passive: true },
  );

  updateSlider(0);
  startAutoPlay();
}

// ─── Mobile nav ──────────────────────────────────────────────────
function initMobileNav() {
  const btn = document.getElementById("mobileMenuBtn");
  const nav = document.getElementById("mainNav");
  if (!btn || !nav) return;
  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("is-mobile-open");
    btn.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => {
    if (!nav.classList.contains("is-mobile-open")) return;
    if (!e.target.closest(".header")) {
      nav.classList.remove("is-mobile-open");
      btn.classList.remove("is-open");
    }
  });
}

// ─── Categories dropdown ─────────────────────────────────────────
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
    if (menu.hidden) open();
    else close(0);
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

// ─── View toggle ─────────────────────────────────────────────────
function initViewToggle() {
  const wrap = document.getElementById("viewToggle");
  const grid = els.productsGrid;
  if (!wrap || !grid) return;
  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".view-toggle__btn");
    if (!btn) return;
    const view = btn.dataset.view;
    wrap.querySelectorAll(".view-toggle__btn").forEach((b) => {
      b.classList.toggle("view-toggle__btn--active", b.dataset.view === view);
    });
    grid.classList.toggle("is-list", view === "list");
  });
}

// ─── Nav sliding indicator ───────────────────────────────────────
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

  inner.querySelectorAll(".nav__link").forEach((link) => {
    link.addEventListener("mouseenter", () => moveIndicator(link));
    link.addEventListener("mouseleave", () => {
      const active = inner.querySelector(".nav__link.is-active");
      if (active) moveIndicator(active);
      else indicator.style.opacity = "0";
    });
    link.addEventListener("focus", () => moveIndicator(link));
    link.addEventListener("blur", () => {
      const active = inner.querySelector(".nav__link.is-active");
      if (active) moveIndicator(active);
      else indicator.style.opacity = "0";
    });
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

// ─── Filters ─────────────────────────────────────────────────────
function buildFilters(products) {
  const categories = uniqueValues(products, "category");
  // CORRECCIÓN: usa extractBrands para descomponer marcas compuestas
  // (ej: "CITROEN-SUSUKI" aparece como "CITROEN" y "SUSUKI" por separado)
  const brands = extractBrands(products);
  const rims = uniqueValues(products, "rim");

  if (els.filterCategory) {
    els.filterCategory.innerHTML =
      `<option value="">Todas las categorías</option>` +
      categories
        .map((c) => `<option value="${c}">${formatCategoryLabel(c)}</option>`)
        .join("");
    els.filterCategory.value = state.category;
  }

  if (els.filterBrand) {
    els.filterBrand.innerHTML =
      `<option value="">Todas las marcas</option>` +
      brands.map((b) => `<option value="${b}">${b}</option>`).join("");
    els.filterBrand.value = state.filters.brand;
  }

  if (els.filterRim) {
    els.filterRim.innerHTML =
      `<option value="">Todos los rodados</option>` +
      rims.map((r) => `<option value="${r}">${r}</option>`).join("");
    els.filterRim.value = state.filters.rim;
  }

  updateModelFilter();
  updateRimFilterVisibility();
}

// CORRECCIÓN: el select de modelo ahora se habilita con categoría o marca,
// sin requerir ambas. Muestra todos los modelos disponibles según el contexto.
function updateModelFilter() {
  if (!els.filterModel) return;

  const brand = state.filters.brand;
  const category = state.category;

  // Sin ningún criterio de filtro: mostrar placeholder deshabilitado
  if (!brand && !category) {
    els.filterModel.innerHTML = `<option value="">Seleccione marca o categoría primero</option>`;
    els.filterModel.disabled = true;
    return;
  }

  const models = extractModels(state.products, brand, category);

  if (!models.length) {
    els.filterModel.innerHTML = `<option value="">Sin modelos disponibles</option>`;
    els.filterModel.disabled = true;
    return;
  }

  els.filterModel.innerHTML =
    `<option value="">Todos los modelos</option>` +
    models.map((m) => `<option value="${m}">${m}</option>`).join("");
  els.filterModel.disabled = false;
  els.filterModel.value = state.filters.model || "";
}

function updateRimFilterVisibility() {
  if (!els.filterRimGroup || !els.filterRim) return;
  const shouldShowRim = state.category === "TAZAS";
  els.filterRimGroup.hidden = !shouldShowRim;
  if (!shouldShowRim) {
    state.filters.rim = "";
    els.filterRim.value = "";
  }
}

function clearSidebarFilters() {
  state.category = "";
  state.filters = { brand: "", model: "", rim: "" };
  state.sort = "";
  if (els.filterCategory) els.filterCategory.value = "";
  if (els.filterBrand) els.filterBrand.value = "";
  if (els.filterRim) els.filterRim.value = "";
  if (els.sortSelect) els.sortSelect.value = "";
  if (els.filterModel) {
    els.filterModel.innerHTML = `<option value="">Seleccione marca o categoría primero</option>`;
    els.filterModel.disabled = true;
  }
  setActiveNav(state.category);
  updateRimFilterVisibility();
}

function clearDependentFilters() {
  state.filters = { brand: "", model: "", rim: "" };
  if (els.filterBrand) els.filterBrand.value = "";
  if (els.filterRim) els.filterRim.value = "";
  if (els.filterModel) {
    els.filterModel.innerHTML = `<option value="">Seleccione marca o categoría primero</option>`;
    els.filterModel.disabled = true;
  }
}

// ─── Category nav ────────────────────────────────────────────────
function buildCategoryNav(products) {
  if (!els.categoryNav) return;
  const categories = [
    ...new Set(products.map((p) => p.category).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));
  const items = [
    `<button class="nav-cat-item" data-nav-category="">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>
      </svg>
      Todos los productos
    </button>`,
  ];
  for (const cat of categories) {
    items.push(
      `<button class="nav-cat-item" data-nav-category="${cat}">${formatCategoryLabel(cat)}</button>`,
    );
  }
  els.categoryNav.innerHTML = items.join("");
}

function setActiveNav(category) {
  document.querySelectorAll(".nav__link[data-nav-category]").forEach((a) => {
    const cat = a.getAttribute("data-nav-category") ?? "";
    const active = cat === category;
    a.classList.toggle("is-active", active);
    a.setAttribute("aria-current", active ? "page" : "false");
  });
  document
    .querySelectorAll(".nav-cat-item[data-nav-category]")
    .forEach((btn) => {
      const cat = btn.getAttribute("data-nav-category") ?? "";
      btn.classList.toggle("is-active", cat === category);
    });
  if (els.filterCategory) els.filterCategory.value = category || "";
}

// ─── Pagination ───────────────────────────────────────────────────
function renderPagination(totalItems, currentPage, pageSize) {
  if (!els.pagination) return;
  const isHomeView = isHomePage;
  const totalPages = Math.ceil(totalItems / pageSize);
  if (isHomeView || totalPages <= 1) {
    els.pagination.innerHTML = "";
    return;
  }
  const frag = document.createDocumentFragment();
  const btn = (text, page, active, disabled, delay) => {
    const b = document.createElement("button");
    b.className = `pagination__btn${active ? " is-active" : ""}`;
    b.dataset.page = page;
    b.textContent = text;
    b.style.animationDelay = `${delay * 30}ms`;
    if (disabled) b.disabled = true;
    if (active) b.setAttribute("aria-current", "page");
    return b;
  };
  frag.appendChild(btn("←", currentPage - 1, false, currentPage === 1, 0));
  for (let i = 1; i <= totalPages; i++) {
    frag.appendChild(btn(i, i, i === currentPage, false, i));
  }
  frag.appendChild(
    btn(
      "→",
      currentPage + 1,
      false,
      currentPage === totalPages,
      totalPages + 1,
    ),
  );
  els.pagination.innerHTML = "";
  els.pagination.appendChild(frag);
}

// ─── Catalog UI update ────────────────────────────────────────────
function updateCatalogUI({ isHomeView, totalItems }) {
  const resultsTitle = document.getElementById("resultsTitle");
  if (resultsTitle) {
    resultsTitle.textContent = isHomeView
      ? "Productos destacados"
      : "Resultados";
  }
  if (els.catalogSidebar) {
    els.catalogSidebar.hidden = isHomeView;
  }
  if (els.resultsSection) {
    els.resultsSection.classList.toggle("catalog--home", isHomeView);
  }
  if (els.resultsCount) {
    if (isHomeView) {
      els.resultsCount.textContent = "";
      els.resultsCount.hidden = true;
    } else {
      els.resultsCount.textContent = `${totalItems} producto${totalItems === 1 ? "" : "s"}`;
      els.resultsCount.hidden = false;
      els.resultsCount.animate(
        [
          { opacity: 0, transform: "translateY(6px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration: 280,
          easing: "cubic-bezier(0.16,1,0.3,1)",
          fill: "forwards",
        },
      );
    }
  }
}

function sortProducts(products, sort) {
  const arr = [...products];
  switch (sort) {
    case "price-asc":
      arr.sort((a, b) => (a.price || 0) - (b.price || 0));
      break;
    case "price-desc":
      arr.sort((a, b) => (b.price || 0) - (a.price || 0));
      break;
    case "name-asc":
      arr.sort((a, b) =>
        String(a.detalle || a.description || "").localeCompare(
          String(b.detalle || b.description || ""),
          "es",
          { sensitivity: "base" },
        ),
      );
      break;
    case "name-desc":
      arr.sort((a, b) =>
        String(b.detalle || b.description || "").localeCompare(
          String(a.detalle || a.description || ""),
          "es",
          { sensitivity: "base" },
        ),
      );
      break;
  }
  return arr;
}

// ─── Apply filters & render ───────────────────────────────────────
function apply() {
  const qNorm = normalizeText(els.q?.value ?? "");
  const isHomeView = isHomePage;
  const baseProducts = isHomePage
    ? getFeaturedProducts(state.products)
    : state.products;

  const filtered = baseProducts.filter((p) => {
    if (state.category && p.category !== state.category) return false;
    if (qNorm && !p.searchText.includes(qNorm)) return false;
    if (state.filters.brand && !brandMatches(p.brand, state.filters.brand))
      return false;
    if (state.filters.rim && p.rim !== state.filters.rim) return false;
    if (state.filters.model) {
      if (
        !p.compatibilidadesList ||
        !p.compatibilidadesList.includes(state.filters.model)
      ) {
        return false;
      }
    }
    return true;
  });

  const sorted = sortProducts(filtered, state.sort);
  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / state.pageSize));
  if (state.currentPage > totalPages) state.currentPage = 1;

  const start = (state.currentPage - 1) * state.pageSize;
  const paginated = sorted.slice(start, start + state.pageSize);

  updateCatalogUI({ isHomeView, totalItems });

  if (els.emptyState) els.emptyState.hidden = true;

  if (els.productsGrid) {
    els.productsGrid.style.opacity = "0";
    els.productsGrid.style.transform = "translateY(12px)";
    setTimeout(() => {
      renderProducts(paginated, els);
      renderPagination(totalItems, state.currentPage, state.pageSize);
      const isHomeViewNow = isHomePage;
      if (els.emptyState) {
        els.emptyState.hidden = !(paginated.length === 0 && !isHomeViewNow);
      }
      els.productsGrid.querySelectorAll(".card").forEach((card) => {
        initCardTilt(card);
      });
      els.productsGrid.style.transition =
        "opacity 0.3s ease, transform 0.3s ease";
      els.productsGrid.style.opacity = "1";
      els.productsGrid.style.transform = "translateY(0)";
    }, 160);
  } else {
    renderProducts(paginated, els);
    renderPagination(totalItems, state.currentPage, state.pageSize);
  }
}

function scrollToResults() {
  if (!els.resultsSection) return;
  const offset = window.innerWidth <= 768 ? 80 : 120;
  const top =
    els.resultsSection.getBoundingClientRect().top +
    window.pageYOffset -
    offset;
  window.scrollTo({ top, behavior: "smooth" });
}

// ─── Nav click handler ────────────────────────────────────────────
function handleNavCategoryClick(e) {
  const link = e.target.closest("[data-nav-category]");
  if (!link) return;
  if (link.tagName === "A" && !link.closest(".nav") && !link.closest(".footer"))
    return;
  e.preventDefault();
  const category = link.getAttribute("data-nav-category") || "";
  if (isHomePage) {
    goToCatalog({ category });
    return;
  }
  state.category = category;
  state.currentPage = 1;
  clearDependentFilters();
  setActiveNav(state.category);
  updateModelFilter();
  updateRimFilterVisibility();
  apply();
  scrollToResults();
  document.getElementById("mainNav")?.classList.remove("is-mobile-open");
  document.getElementById("mobileMenuBtn")?.classList.remove("is-open");
}

// ─── Boot ─────────────────────────────────────────────────────────
async function boot() {
  try {
    state.products = await loadProducts();

    const urlParams = new URLSearchParams(window.location.search);
    const qFromUrl = urlParams.get("q");
    const catFromUrl = urlParams.get("cat");

    if (qFromUrl && els.q) {
      els.q.value = qFromUrl;
    }
    if (isCatalogPage && catFromUrl) {
      state.category = String(catFromUrl).trim().toUpperCase();
    }

    setProductsIndex(state.products);
    initCartUI();
    initHeroSlider();
    initMobileNav();
    initCategoriesMenu();
    initViewToggle();
    initNavIndicator();
    observeRevealItems();
    buildCategoryNav(state.products);
    setActiveNav(state.category);
    buildFilters(state.products);
    apply();

    // ── Search
    if (isCatalogPage) {
      els.q?.addEventListener("input", () => {
        state.currentPage = 1;
        apply();
      });
    }

    els.searchBtn?.addEventListener("click", () => {
      const q = String(els.q?.value ?? "").trim();
      if (isHomePage) {
        goToCatalog({ q });
        return;
      }
      state.currentPage = 1;
      apply();
      scrollToResults();
    });

    els.q?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const q = String(els.q?.value ?? "").trim();
      if (isHomePage) {
        goToCatalog({ q });
        return;
      }
      state.currentPage = 1;
      apply();
      scrollToResults();
    });

    // ── Filters
    els.filterCategory?.addEventListener("change", () => {
      state.category = els.filterCategory.value;
      state.currentPage = 1;
      clearDependentFilters();
      setActiveNav(state.category);
      // CORRECCIÓN: updateModelFilter se llama aquí también para reflejar
      // los modelos disponibles según la nueva categoría seleccionada.
      updateModelFilter();
      updateRimFilterVisibility();
      apply();
    });

    els.filterBrand?.addEventListener("change", () => {
      state.filters.brand = els.filterBrand.value;
      state.filters.model = "";
      state.currentPage = 1;
      updateModelFilter();
      apply();
    });

    els.filterModel?.addEventListener("change", () => {
      state.filters.model = els.filterModel.value;
      state.currentPage = 1;
      apply();
    });

    els.filterRim?.addEventListener("change", () => {
      state.filters.rim = els.filterRim.value;
      state.currentPage = 1;
      apply();
    });

    els.sortSelect?.addEventListener("change", () => {
      state.sort = els.sortSelect.value;
      state.currentPage = 1;
      apply();
    });

    els.clearFiltersBtn?.addEventListener("click", () => {
      clearSidebarFilters();
      if (els.q) els.q.value = "";
      state.currentPage = 1;
      apply();
    });

    els.emptyReset?.addEventListener("click", () => {
      clearSidebarFilters();
      if (els.q) els.q.value = "";
      state.currentPage = 1;
      apply();
    });

    // ── Category nav
    document.addEventListener("click", handleNavCategoryClick);

    // ── Pagination
    els.pagination?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-page]");
      if (!btn || btn.disabled) return;
      const page = Number(btn.getAttribute("data-page"));
      if (!page || page < 1) return;
      state.currentPage = page;
      apply();
      scrollToResults();
    });

    // ── Fly to cart
    document.addEventListener("fly-to-cart", (e) => {
      flyToCart(e.detail.sourceEl);
    });
  } catch (err) {
    console.error("Error al iniciar la app:", err);
    if (els.productsGrid) els.productsGrid.innerHTML = "";
    if (els.resultsCount) {
      els.resultsCount.hidden = false;
      els.resultsCount.textContent = "No se pudieron cargar los productos";
    }
  }
}

boot();
