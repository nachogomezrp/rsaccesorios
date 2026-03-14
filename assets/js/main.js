import { loadProducts } from "./data.js";
import { renderProducts } from "./render.js";
import { initCartUI, setProductsIndex } from "./cart.js";

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
  catalogSidebar: document.getElementById("catalogSidebar"),
  clearFiltersBtn: document.getElementById("clearFiltersBtn"),
};

let state = {
  products: [],
  category: "",
  currentPage: 1,
  pageSize: 16,
  filters: {
    brand: "",
    model: "",
    rim: "",
  },
};

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getFeaturedProducts(products) {
  const espejos = products.filter((p) => p.category === "ESPEJOS").slice(0, 4);

  const tazas = products.filter((p) => p.category === "TAZAS").slice(0, 4);

  return [...espejos, ...tazas];
}

function formatCategoryLabel(cat) {
  const map = {
    ESPEJOS: "Espejos",
    TAZAS: "Tazas",
    OPTICAS: "Ópticas",
    VIDRIOS: "Vidrios",
  };

  return map[cat] || (cat ? cat.charAt(0) + cat.slice(1).toLowerCase() : "");
}

function uniqueValues(products, key) {
  return [...new Set(products.map((p) => p[key]).filter(Boolean))].sort(
    (a, b) => String(a).localeCompare(String(b), "es"),
  );
}

// MVP: inferimos un modelo simple desde la descripción
function extractModelFromProduct(product) {
  const description = String(product.description ?? "").trim();
  const brand = String(product.brand ?? "").trim();

  if (!description) return "";

  const words = description
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}-]/gu, ""))
    .filter(Boolean);

  if (!words.length) return "";

  const brandNorm = normalizeText(brand);
  const filteredWords = words.filter(
    (word) => normalizeText(word) !== brandNorm,
  );

  if (!filteredWords.length) return "";

  return filteredWords[0].toUpperCase();
}

function extractModels(products, brand, category = "") {
  const models = products
    .filter((p) => {
      if (brand && p.brand !== brand) return false;
      if (category && p.category !== category) return false;
      return true;
    })
    .map(extractModelFromProduct)
    .filter(Boolean);

  return [...new Set(models)].sort((a, b) => a.localeCompare(b, "es"));
}

function buildFilters(products) {
  const categories = uniqueValues(products, "category");
  const brands = uniqueValues(products, "brand");
  const rims = uniqueValues(products, "rim");

  if (els.filterCategory) {
    els.filterCategory.innerHTML =
      `<option value="">Todas</option>` +
      categories
        .map((category) => {
          const label = formatCategoryLabel(category);
          return `<option value="${category}">${label}</option>`;
        })
        .join("");
    els.filterCategory.value = state.category;
  }

  if (els.filterBrand) {
    els.filterBrand.innerHTML =
      `<option value="">Todas</option>` +
      brands
        .map((brand) => `<option value="${brand}">${brand}</option>`)
        .join("");
    els.filterBrand.value = state.filters.brand;
  }

  if (els.filterRim) {
    els.filterRim.innerHTML =
      `<option value="">Todos</option>` +
      rims.map((rim) => `<option value="${rim}">${rim}</option>`).join("");
    els.filterRim.value = state.filters.rim;
  }

  updateModelFilter();
}

function updateModelFilter() {
  if (!els.filterModel) return;

  const brand = state.filters.brand;
  const category = state.category;

  if (!brand) {
    els.filterModel.innerHTML = `<option value="">Seleccione marca</option>`;
    els.filterModel.disabled = true;
    return;
  }

  const models = extractModels(state.products, brand, category);

  els.filterModel.innerHTML =
    `<option value="">Todos</option>` +
    models
      .map((model) => `<option value="${model}">${model}</option>`)
      .join("");

  els.filterModel.disabled = false;
  els.filterModel.value = state.filters.model || "";
}

function clearSidebarFilters() {
  state.category = "";
  state.filters = {
    brand: "",
    model: "",
    rim: "",
  };

  if (els.filterCategory) els.filterCategory.value = "";
  if (els.filterBrand) els.filterBrand.value = "";
  if (els.filterRim) els.filterRim.value = "";

  if (els.filterModel) {
    els.filterModel.innerHTML = `<option value="">Seleccione marca</option>`;
    els.filterModel.disabled = true;
  }

  setActiveNav(state.category);
}

function clearDependentFilters() {
  state.filters.brand = "";
  state.filters.model = "";
  state.filters.rim = "";

  if (els.filterBrand) els.filterBrand.value = "";
  if (els.filterRim) els.filterRim.value = "";

  if (els.filterModel) {
    els.filterModel.innerHTML = `<option value="">Seleccione marca</option>`;
    els.filterModel.disabled = true;
  }
}

function renderPagination(totalItems, currentPage, pageSize) {
  if (!els.pagination) return;

  const qNorm = normalizeText(els.q?.value ?? "");
  const hasSidebarFilters =
    !!state.category ||
    !!state.filters.brand ||
    !!state.filters.model ||
    !!state.filters.rim;

  const isHomeView = !qNorm && !hasSidebarFilters;

  if (isHomeView) {
    els.pagination.innerHTML = "";
    return;
  }

  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) {
    els.pagination.innerHTML = "";
    return;
  }

  let html = "";

  html += `
    <button class="pagination__btn" data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""}>
      Anterior
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button class="pagination__btn ${i === currentPage ? "is-active" : ""}" data-page="${i}">
        ${i}
      </button>
    `;
  }

  html += `
    <button class="pagination__btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""}>
      Siguiente
    </button>
  `;

  els.pagination.innerHTML = html;
}

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
    }
  }
}

function apply() {
  const qNorm = normalizeText(els.q?.value ?? "");

  const hasSidebarFilters =
    !!state.category ||
    !!state.filters.brand ||
    !!state.filters.model ||
    !!state.filters.rim;

  const isHomeView = !qNorm && !hasSidebarFilters;

  const baseProducts = isHomeView
    ? getFeaturedProducts(state.products)
    : state.products;

  const filtered = baseProducts.filter((p) => {
    if (state.category && p.category !== state.category) return false;
    if (qNorm && !p.searchText.includes(qNorm)) return false;

    if (state.filters.brand && p.brand !== state.filters.brand) {
      return false;
    }

    if (state.filters.rim && p.rim !== state.filters.rim) {
      return false;
    }

    if (state.filters.model) {
      const inferredModel = extractModelFromProduct(p);
      if (inferredModel !== state.filters.model) return false;
    }

    return true;
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / state.pageSize));

  if (state.currentPage > totalPages) {
    state.currentPage = 1;
  }

  const start = (state.currentPage - 1) * state.pageSize;
  const end = start + state.pageSize;
  const paginated = filtered.slice(start, end);

  updateCatalogUI({ isHomeView, totalItems });
  renderProducts(paginated, els);
  renderPagination(totalItems, state.currentPage, state.pageSize);
}

function setActiveNav(category) {
  const links = els.categoryNav?.querySelectorAll("[data-nav-category]") || [];
  for (const a of links) {
    const cat = a.getAttribute("data-nav-category") || "";
    a.classList.toggle("is-active", cat === category);
  }

  if (els.filterCategory) {
    els.filterCategory.value = category || "";
  }
}

function buildCategoryNav(products) {
  if (!els.categoryNav) return;

  const categories = [
    ...new Set(products.map((p) => p.category).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));

  const parts = [];
  parts.push(`<a href="#" class="nav__link" data-nav-category="">Todos</a>`);

  for (const cat of categories) {
    parts.push(
      `<a href="#" class="nav__link" data-nav-category="${cat}">${formatCategoryLabel(cat)}</a>`,
    );
  }

  els.categoryNav.innerHTML = parts.join("");
}
const navCategories = document.getElementById("navCategories");
const categoriesToggle = document.getElementById("categoriesToggle");
const categoriesMenu = document.getElementById("categoriesMenu");

let categoriesCloseTimer;

function openCategoriesMenu() {
  clearTimeout(categoriesCloseTimer);
  navCategories.classList.add("is-open");
  categoriesToggle.setAttribute("aria-expanded", "true");
  categoriesMenu.hidden = false;
}

function closeCategoriesMenu() {
  categoriesCloseTimer = setTimeout(() => {
    navCategories.classList.remove("is-open");
    categoriesToggle.setAttribute("aria-expanded", "false");
    categoriesMenu.hidden = true;
  }, 120);
}

if (window.innerWidth > 900) {
  navCategories.addEventListener("mouseenter", openCategoriesMenu);
  navCategories.addEventListener("mouseleave", closeCategoriesMenu);
}

categoriesToggle.addEventListener("click", () => {
  const isOpen = navCategories.classList.contains("is-open");

  if (isOpen) {
    navCategories.classList.remove("is-open");
    categoriesToggle.setAttribute("aria-expanded", "false");
    categoriesMenu.hidden = true;
  } else {
    openCategoriesMenu();
  }
});
function initHeroSlider() {
  const slides = Array.from(document.querySelectorAll(".hero__slide"));
  const dots = Array.from(document.querySelectorAll(".hero__dot"));
  const prevBtn = document.getElementById("heroPrev");
  const nextBtn = document.getElementById("heroNext");

  if (!slides.length) return;

  let current = 0;
  let autoPlayId = null;

  function updateSlider(index) {
    current = (index + slides.length) % slides.length;

    slides.forEach((slide, i) => {
      slide.classList.toggle("hero__slide--active", i === current);
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle("hero__dot--active", i === current);
    });
  }

  function nextSlide() {
    updateSlider(current + 1);
  }

  function prevSlide() {
    updateSlider(current - 1);
  }

  function startAutoPlay() {
    stopAutoPlay();
    autoPlayId = setInterval(nextSlide, 5000);
  }

  function stopAutoPlay() {
    if (autoPlayId) {
      clearInterval(autoPlayId);
      autoPlayId = null;
    }
  }

  prevBtn?.addEventListener("click", () => {
    prevSlide();
    startAutoPlay();
  });

  nextBtn?.addEventListener("click", () => {
    nextSlide();
    startAutoPlay();
  });

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      updateSlider(index);
      startAutoPlay();
    });
  });

  updateSlider(0);
  startAutoPlay();
}

function initCategoriesMenu() {
  const toggle = document.getElementById("categoriesToggle");
  const menu = document.getElementById("categoriesMenu");

  if (!toggle || !menu) return;

  function openMenu() {
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  }

  function toggleMenu() {
    if (menu.hidden) openMenu();
    else closeMenu();
  }

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  document.addEventListener("click", (e) => {
    if (!menu.hidden && !e.target.closest(".nav-categories")) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  menu.addEventListener("click", (e) => {
    const link = e.target.closest("[data-nav-category]");
    if (link) closeMenu();
  });
}

function scrollToResults() {
  els.resultsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function boot() {
  try {
    state.products = await loadProducts();

    setProductsIndex(state.products);
    initCartUI();
    initHeroSlider();

    buildCategoryNav(state.products);
    setActiveNav(state.category);
    initCategoriesMenu();
    buildFilters(state.products);

    apply();

    els.q?.addEventListener("input", () => {
      state.currentPage = 1;
      apply();
    });

    els.searchBtn?.addEventListener("click", () => {
      state.currentPage = 1;
      apply();
      scrollToResults();
    });

    els.filterCategory?.addEventListener("change", () => {
      state.category = els.filterCategory.value;
      state.currentPage = 1;

      clearDependentFilters();
      setActiveNav(state.category);
      updateModelFilter();
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

    els.clearFiltersBtn?.addEventListener("click", () => {
      clearSidebarFilters();
      state.currentPage = 1;
      apply();
    });

    els.categoryNav?.addEventListener("click", (e) => {
      const link = e.target.closest("[data-nav-category]");
      if (!link) return;

      e.preventDefault();

      state.category = link.getAttribute("data-nav-category") || "";
      state.currentPage = 1;

      clearDependentFilters();
      setActiveNav(state.category);
      updateModelFilter();
      apply();
      scrollToResults();
    });

    document.addEventListener("click", (e) => {
      const link = e.target.closest(".footer__links [data-nav-category]");
      if (!link) return;

      e.preventDefault();

      state.category = link.getAttribute("data-nav-category") || "";
      state.currentPage = 1;

      clearDependentFilters();
      setActiveNav(state.category);
      updateModelFilter();
      apply();
      scrollToResults();
    });

    els.pagination?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-page]");
      if (!btn) return;

      const page = Number(btn.getAttribute("data-page"));
      if (!page || page < 1) return;

      state.currentPage = page;
      apply();
      scrollToResults();
    });
  } catch (error) {
    console.error("Error al iniciar la app:", error);

    if (els.productsGrid) els.productsGrid.innerHTML = "";
    if (els.emptyState) els.emptyState.hidden = false;
    if (els.resultsCount) {
      els.resultsCount.hidden = false;
      els.resultsCount.textContent = "No se pudieron cargar los productos";
    }
  }
}

boot();
