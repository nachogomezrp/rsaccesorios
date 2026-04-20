/**
 * @file Data fetching and parsing layer.
 */

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSRJ2O79G-uKQF1O7oKz-5g6sSvW1lnggUNOoiwtn6XWdNInaomFkrgDNMzEjWC0A/pub?gid=847739532&single=true&output=csv";

// CORRECCIÓN: exportada para poder importarla en main.js y evitar duplicación
export function normalizeText(value) {
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

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((v) => v.trim());
}

function parseImages(value) {
  return String(value ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePrice(value) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const normalized = text
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(/,(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function csvToProducts(csvText) {
  const lines = String(csvText)
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => line.trim() !== "");
  if (!lines.length) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());

  return lines
    .slice(1)
    .map((line) => {
      const values = parseCSVLine(line);
      const row = {};
      headers.forEach((header, i) => {
        row[header] = values[i] ?? "";
      });

      const id = String(row.id ?? "").trim();
      const category = String(row.category ?? "")
        .trim()
        .toUpperCase();
      const brand = String(row.brand ?? "")
        .trim()
        .toUpperCase();
      const code = String(row.code ?? "")
        .trim()
        .toUpperCase();
      const description = String(row.name ?? "").trim();
      const price = parsePrice(row.price);
      const image_urls = parseImages(row.image_url);

      const detalle = String(row.detalle ?? "").trim();
      const descripcion = String(row.descripcion ?? "").trim();

      const compatString = String(row.compatibilidades ?? "").trim();
      const compatibilidadesList = compatString
        ? compatString.split("/").map((m) => m.trim().toUpperCase())
        : [];

      const isActiveRaw = String(row.active ?? "")
        .trim()
        .toLowerCase();
      const active = isActiveRaw === "1" || isActiveRaw === "true";

      const years = parseYears(description);
      const rim = category === "TAZAS" ? parseRim(description) : "";

      return {
        id,
        category,
        brand,
        code,
        description,
        detalle,
        descripcion,
        price,
        image_url: image_urls[0] ?? "",
        image_urls,
        active: active && price > 0,
        years,
        rim,
        compatibilidadesList,
        searchText: normalizeText(
          `${category} ${brand} ${code} ${description} ${detalle} ${descripcion} ${compatString}`,
        ),
      };
    })
    .filter((p) => p.active);
}

export async function loadProducts() {
  const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`No se pudo cargar Google Sheets (${res.status})`);
  }
  const csvText = await res.text();
  return csvToProducts(csvText);
}
