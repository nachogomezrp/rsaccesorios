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

// --- Utils & Data processing (No logic changed) ---

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

// --- UI & Visual Enhancements (Senior UX/UI level) ---

// Animación: IntersectionObserver para scroll reveals suaves (fade-in + slide-up)
const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Añadimos clase para gatillar animación CSS (transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1))
        requestAnimationFrame(() => {
          entry.target.classList.add("is-revealed");
        });
        observer.unobserve(entry.target);
      }
    });
  },
  { root: null, rootMargin: "0px 0px -50px 0px", threshold: 0.1 },
);

function buildFilters(products) {
  const categories = uniqueValues(products, "category");
  const brands = uniqueValues(products, "brand");
  const rims = uniqueValues(products, "rim");

  // Animación: Actualización DOM limpia usando requestAnimationFrame para evitar layout thrashing
  requestAnimationFrame(() => {
    if (els.filterCategory) {
      els.filterCategory.innerHTML =
        `<option value="">Todas</option>` +
        categories
          .map(
            (category) =>
              `<option value="${category}">${formatCategoryLabel(category)}</option>`,
          )
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
  });
}

function updateModelFilter() {
  if (!els.filterModel) return;

  const brand = state.filters.brand;
  const category = state.category;

  requestAnimationFrame(() => {
    // Animación: Feedback visual sutil (dim/fade) al deshabilitar
    if (!brand) {
      els.filterModel.innerHTML = `<option value="">Seleccione marca</option>`;
      els.filterModel.disabled = true;
      els.filterModel.classList.add("is-disabled");
      return;
    }

    const models = extractModels(state.products, brand, category);

    els.filterModel.innerHTML =
      `<option value="">Todos</option>` +
      models
        .map((model) => `<option value="${model}">${model}</option>`)
        .join("");

    els.filterModel.disabled = false;
    els.filterModel.classList.remove("is-disabled");
    els.filterModel.value = state.filters.model || "";

    // Animación: Destello sutil al activar un filtro dependiente
    els.filterModel.classList.add("ui-pulse");
    setTimeout(() => els.filterModel.classList.remove("ui-pulse"), 300);
  });
}

function clearSidebarFilters() {
  state.category = "";
  state.filters = { brand: "", model: "", rim: "" };

  requestAnimationFrame(() => {
    if (els.filterCategory) els.filterCategory.value = "";
    if (els.filterBrand) els.filterBrand.value = "";
    if (els.filterRim) els.filterRim.value = "";

    if (els.filterModel) {
      els.filterModel.innerHTML = `<option value="">Seleccione marca</option>`;
      els.filterModel.disabled = true;
      els.filterModel.classList.add("is-disabled");
    }
  });

  setActiveNav(state.category);
}

function clearDependentFilters() {
  state.filters.brand = "";
  state.filters.model = "";
  state.filters.rim = "";

  requestAnimationFrame(() => {
    if (els.filterBrand) els.filterBrand.value = "";
    if (els.filterRim) els.filterRim.value = "";

    if (els.filterModel) {
      els.filterModel.innerHTML = `<option value="">Seleccione marca</option>`;
      els.filterModel.disabled = true;
      els.filterModel.classList.add("is-disabled");
    }
  });
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

  if (isHomeView || Math.ceil(totalItems / pageSize) <= 1) {
    requestAnimationFrame(() => {
      els.pagination.innerHTML = "";
      els.pagination.classList.remove("is-visible");
    });
    return;
  }

  const totalPages = Math.ceil(totalItems / pageSize);

  // Animación: Staggered fade-in para los botones de paginación
  const frag = document.createDocumentFragment();

  const createBtn = (text, page, isCurrent, isDisabled, delayIndex) => {
    const btn = document.createElement("button");
    btn.className = `pagination__btn animate-enter ${isCurrent ? "is-active" : ""}`;
    btn.dataset.page = page;
    btn.textContent = text;
    btn.style.animationDelay = `${delayIndex * 30}ms`; // Stagger effect

    if (isDisabled) btn.disabled = true;
    if (isCurrent) btn.setAttribute("aria-current", "page");

    return btn;
  };

  frag.appendChild(
    createBtn("Anterior", currentPage - 1, false, currentPage === 1, 0),
  );

  for (let i = 1; i <= totalPages; i++) {
    frag.appendChild(createBtn(i, i, i === currentPage, false, i));
  }

  frag.appendChild(
    createBtn(
      "Siguiente",
      currentPage + 1,
      false,
      currentPage === totalPages,
      totalPages + 1,
    ),
  );

  requestAnimationFrame(() => {
    els.pagination.innerHTML = "";
    els.pagination.appendChild(frag);
    els.pagination.classList.add("is-visible");
  });
}

function updateCatalogUI({ isHomeView, totalItems }) {
  const resultsTitle = document.getElementById("resultsTitle");

  requestAnimationFrame(() => {
    if (resultsTitle) {
      // Animación: Cambio de texto suave (requeriría crossfade CSS, aplicamos clase de actualización)
      resultsTitle.classList.add("ui-text-updating");
      resultsTitle.textContent = isHomeView
        ? "Productos destacados"
        : "Resultados";
      setTimeout(() => resultsTitle.classList.remove("ui-text-updating"), 200);
    }

    if (els.catalogSidebar) {
      els.catalogSidebar.hidden = isHomeView;
      // Añadir clase para transicionar el layout del grid al ocultar sidebar
      els.catalogSidebar.classList.toggle("is-hidden-visually", isHomeView);
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
        // Animación: Fade in sutil para el contador
        els.resultsCount.animate(
          [
            { opacity: 0, transform: "translateY(5px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 300, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
        );
      }
    }
  });
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
    if (state.filters.brand && p.brand !== state.filters.brand) return false;
    if (state.filters.rim && p.rim !== state.filters.rim) return false;

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

  // Animación: Fade-out rápido del grid, render, y fade-in escalonado
  if (els.productsGrid) {
    requestAnimationFrame(() => {
      els.productsGrid.classList.add("grid-updating");

      // Permitir que el fade-out de CSS (ej: 150ms) suceda antes de cambiar el DOM
      setTimeout(() => {
        renderProducts(paginated, els);
        renderPagination(totalItems, state.currentPage, state.pageSize);

        requestAnimationFrame(() => {
          els.productsGrid.classList.remove("grid-updating");
          els.productsGrid.classList.add("grid-updated");

          // Limpieza de clase
          setTimeout(
            () => els.productsGrid.classList.remove("grid-updated"),
            400,
          );
        });
      }, 150);
    });
  } else {
    // Fallback por si productsGrid no existe
    renderProducts(paginated, els);
    renderPagination(totalItems, state.currentPage, state.pageSize);
  }
}

function setActiveNav(category) {
  requestAnimationFrame(() => {
    const links =
      els.categoryNav?.querySelectorAll("[data-nav-category]") || [];
    for (const a of links) {
      const cat = a.getAttribute("data-nav-category") || "";
      const isActive = cat === category;
      a.classList.toggle("is-active", isActive);
      a.setAttribute("aria-current", isActive ? "page" : "false");
    }

    if (els.filterCategory) {
      els.filterCategory.value = category || "";
    }
  });
}

function buildCategoryNav(products) {
  if (!els.categoryNav) return;

  const categories = [
    ...new Set(products.map((p) => p.category).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));

  const parts = [];
  parts.push(
    `<a href="#" class="nav__link animate-link" data-nav-category="">Todos</a>`,
  );

  for (const cat of categories) {
    parts.push(
      `<a href="#" class="nav__link animate-link" data-nav-category="${cat}">${formatCategoryLabel(cat)}</a>`,
    );
  }

  requestAnimationFrame(() => {
    els.categoryNav.innerHTML = parts.join("");
  });
}

// --- Menu Interaction & Premium Transitions ---

const navCategories = document.getElementById("navCategories");
const categoriesToggle = document.getElementById("categoriesToggle");
const categoriesMenu = document.getElementById("categoriesMenu");

let categoriesCloseTimer;

function openCategoriesMenu() {
  clearTimeout(categoriesCloseTimer);

  requestAnimationFrame(() => {
    navCategories.classList.add("is-open");
    categoriesToggle.setAttribute("aria-expanded", "true");
    categoriesMenu.hidden = false;

    // Animación: Transform + Opacity suave tras quitar el 'hidden'
    requestAnimationFrame(() => {
      categoriesMenu.classList.add("is-visible");
    });
  });
}

function closeCategoriesMenu() {
  requestAnimationFrame(() => {
    // Animación: Retiramos clase visual primero para iniciar la transición CSS
    categoriesMenu.classList.remove("is-visible");

    // Sincronizado con la duración típica de una transición premium (ej. 300ms)
    categoriesCloseTimer = setTimeout(() => {
      navCategories.classList.remove("is-open");
      categoriesToggle.setAttribute("aria-expanded", "false");
      categoriesMenu.hidden = true;
    }, 300);
  });
}

if (window.innerWidth > 900) {
  navCategories?.addEventListener("mouseenter", openCategoriesMenu);
  navCategories?.addEventListener("mouseleave", closeCategoriesMenu);
}

categoriesToggle?.addEventListener("click", () => {
  const isOpen = navCategories.classList.contains("is-open");
  if (isOpen) {
    closeCategoriesMenu();
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
    const prevIndex = current;
    current = (index + slides.length) % slides.length;

    requestAnimationFrame(() => {
      slides.forEach((slide, i) => {
        // Animación: Crossfade y scale moderno tipo Ken Burns manejado vía CSS clases
        if (i === current) {
          slide.classList.add("hero__slide--active");
          slide.style.zIndex = "2";
          slide.setAttribute("aria-hidden", "false");
        } else if (i === prevIndex) {
          slide.classList.remove("hero__slide--active");
          slide.classList.add("hero__slide--leaving");
          slide.style.zIndex = "1";
          slide.setAttribute("aria-hidden", "true");

          setTimeout(() => {
            slide.classList.remove("hero__slide--leaving");
            slide.style.zIndex = "0";
          }, 800); // 800ms para crossfades épicos
        } else {
          slide.classList.remove("hero__slide--active");
          slide.classList.remove("hero__slide--leaving");
          slide.style.zIndex = "0";
          slide.setAttribute("aria-hidden", "true");
        }
      });

      dots.forEach((dot, i) => {
        const isActive = i === current;
        dot.classList.toggle("hero__dot--active", isActive);
        dot.setAttribute("aria-current", isActive ? "true" : "false");
      });
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
    autoPlayId = setInterval(nextSlide, 6000); // Ligeramente más pausado para UX premium
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
    requestAnimationFrame(() => {
      toggle.setAttribute("aria-expanded", "true");
      menu.classList.add("is-visible");
    });
  }

  function closeMenu() {
    menu.classList.remove("is-visible");
    toggle.setAttribute("aria-expanded", "false");
    setTimeout(() => {
      menu.hidden = true;
    }, 300);
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
  if (!els.resultsSection) return;
  // Animación: Smooth scroll nativo optimizado
  const isMobile = window.innerWidth <= 768;
  const offset = isMobile ? 80 : 120; // Considera sticky headers
  const elementPosition = els.resultsSection.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth",
  });
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

    // Observers para elementos estáticos de la UI inicial
    if (els.resultsSection) revealObserver.observe(els.resultsSection);
    if (els.catalogSidebar) revealObserver.observe(els.catalogSidebar);

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
      if (!btn || btn.disabled) return;

      const page = Number(btn.getAttribute("data-page"));
      if (!page || page < 1) return;

      // Feedback háptico visual
      btn.classList.add("is-loading");

      state.currentPage = page;
      apply();
      scrollToResults();
    });
  } catch (error) {
    console.error("Error al iniciar la app:", error);

    requestAnimationFrame(() => {
      if (els.productsGrid) els.productsGrid.innerHTML = "";
      if (els.emptyState) {
        els.emptyState.hidden = false;
        els.emptyState.classList.add("is-visible");
      }
      if (els.resultsCount) {
        els.resultsCount.hidden = false;
        els.resultsCount.textContent = "No se pudieron cargar los productos";
        els.resultsCount.classList.add("ui-error-text");
      }
    });
  }
}

boot();
