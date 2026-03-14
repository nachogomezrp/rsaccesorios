/**
 * E-commerce Engine - Premium Refactor (v2026)
 * Senior Frontend Engineering: Focus on Performance, Micro-interactions & Visual Hierarchy.
 * * DESIGN SYSTEM:
 * - Easing: cubic-bezier(0.4, 0, 0.2, 1)
 * - Transitions: 300ms average
 * - Visuals: Glassmorphism, subtle scales, and sophisticated typography.
 */

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function parseYears(description) {
  const text = String(description ?? "");
  const m = text.match(/(19\d{2}|20\d{2})\s*-\s*(19\d{2}|20\d{2})/);
  if (m) return { from: Number(m[1]), to: Number(m[2]) };

  const m2 = text.match(/(19\d{2}|20\d{2})\s*-\s*$/);
  if (m2) return { from: Number(m2[1]), to: null };

  const m3 = text.match(/\b(19\d{2}|20\d{2})\b/);
  if (m3) return { from: Number(m3[1]), to: Number(m3[1]) };

  return { from: null, to: null };
}

function parseRim(description) {
  const text = String(description ?? "");
  const m = text.match(/\bR(\d{2})\b/i);
  return m ? `R${m[1]}`.toUpperCase() : "";
}

/**
 * UI Component: Global Styles Injector
 * Injects high-end CSS for animations and interactions without touching external files.
 */
const injectPremiumStyles = () => {
  if (document.getElementById("ecommerce-premium-styles")) return;
  const style = document.createElement("style");
  style.id = "ecommerce-premium-styles";
  style.textContent = `
    :root {
      --ease-premium: cubic-bezier(0.4, 0, 0.2, 1);
      --surface-glass: rgba(255, 255, 255, 0.7);
      --border-subtle: rgba(0, 0, 0, 0.08);
      --shadow-soft: 0 10px 30px -10px rgba(0,0,0,0.1);
    }

    .product-card {
      opacity: 0;
      transform: translateY(20px);
      transition: transform 0.4s var(--ease-premium), opacity 0.4s var(--ease-premium), box-shadow 0.3s ease;
      will-change: transform, opacity;
      cursor: pointer;
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      overflow: hidden;
      background: #fff;
    }

    .product-card.is-visible {
      opacity: 1;
      transform: translateY(0);
    }

    .product-card:hover {
      transform: translateY(-4px) scale(1.01);
      box-shadow: var(--shadow-soft);
    }

    .product-image-container {
      overflow: hidden;
      aspect-ratio: 1/1;
      background: #f9f9f9;
      position: relative;
    }

    .product-image {
      transition: transform 0.6s var(--ease-premium);
      object-fit: cover;
      width: 100%;
      height: 100%;
    }

    .product-card:hover .product-image {
      transform: scale(1.08);
    }

    .skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s infinite;
    }

    @keyframes skeleton-loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .price-tag {
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.02em;
      font-weight: 600;
    }

    .badge-premium {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 4px 8px;
      background: #000;
      color: #fff;
      border-radius: 4px;
      width: fit-content;
    }

    @media (prefers-reduced-motion: reduce) {
      .product-card { transition: none; transform: none; opacity: 1; }
    }
  `;
  document.head.appendChild(style);
};

/**
 * UI Helper: Intersection Observer for Entry Animations
 */
const animateOnScroll = (elements) => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
  );

  elements.forEach((el) => observer.observe(el));
};

export async function loadProducts(url) {
  // Inject visual system
  injectPremiumStyles();

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`No se pudo cargar ${url} (${res.status})`);
    const data = await res.json();

    return data.map((p) => {
      const category = String(p.category ?? "")
        .trim()
        .toUpperCase();
      const brand = String(p.brand ?? "")
        .trim()
        .toUpperCase();
      const code = String(p.code ?? "")
        .trim()
        .toUpperCase();
      const description = String(p.description ?? "").trim();
      const price = Number(p.price ?? 0) || 0;
      const image_url = String(p.image_url ?? "").trim();

      const years = parseYears(description);
      const rim = parseRim(description);

      /**
       * Visual Enhancement: DOM Generation Template
       * Note: This keeps the same logic but prepares the structure for premium CSS.
       */
      const renderCard = () => {
        const frag = document.createDocumentFragment();
        const card = document.createElement("div");
        card.className = "product-card ecommerce-item";
        card.setAttribute("role", "article");
        card.setAttribute("aria-label", `${brand} ${description}`);

        // Animación: Micro-interacción de feedback táctil
        card.addEventListener(
          "mousedown",
          () => (card.style.transform = "scale(0.98)"),
        );
        card.addEventListener("mouseup", () => (card.style.transform = ""));

        card.innerHTML = `
          <div class="product-image-container">
            <img src="${image_url || "placeholder.jpg"}" 
                 alt="${brand}" 
                 class="product-image" 
                 loading="lazy"
                 onerror="this.src='https://placehold.co/600x600?text=Premium+Selection'">
          </div>
          <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <span class="badge-premium">${category}</span>
              <span style="font-size: 0.75rem; color: #666;">${rim}</span>
            </div>
            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 500; line-height: 1.4; color: #111;">
              ${brand} <span style="font-weight: 300; color: #666;">${description}</span>
            </h3>
            <div style="margin-top: auto; display: flex; align-items: baseline; gap: 0.5rem;">
              <span class="price-tag" style="font-size: 1.25rem;">$${price.toLocaleString("es-AR")}</span>
              <span style="font-size: 0.8rem; color: #999; text-decoration: underline;">${code}</span>
            </div>
          </div>
        `;

        return card;
      };

      // Return the enhanced object, maintaining original properties
      return {
        category,
        brand,
        code,
        description,
        price,
        image_url,
        active: price > 0,
        years,
        rim,
        searchText: normalizeText(
          `${category} ${brand} ${code} ${description}`,
        ),
        // Helper UI method (optional extension, logic remains)
        render: renderCard,
        __meta: {
          scrolled: false,
          observed: (el) => animateOnScroll([el]),
        },
      };
    });
  } catch (error) {
    console.error("Commerce Engine Error:", error);
    throw error;
  }
}
