/**
 * @file ui.js
 * Manejo de interacciones visuales compartidas en toda la aplicación.
 */

function initHeaderScroll() {
  const header = document.getElementById("mainHeader");
  if (!header) return;

  const handler = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  window.addEventListener("scroll", handler, { passive: true });
  handler();
}

function initCursorGlow() {
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
}

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
    wrap?.addEventListener("mouseenter", open);
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

/**
 * Inicializa todos los componentes compartidos de la UI
 */
export function initSharedUI() {
  initHeaderScroll();
  initCursorGlow();
  initMobileNav();
  initCategoriesMenu();
  initNavIndicator();
}
