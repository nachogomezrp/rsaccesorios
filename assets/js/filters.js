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

export async function loadProducts(url) {
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
      searchText: normalizeText(`${category} ${brand} ${code} ${description}`),
    };
  });
}
