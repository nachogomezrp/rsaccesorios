/**
 * @file Data fetching and parsing layer.
 * * NOTA DEL INGENIERO:
 * Este archivo contiene exclusivamente lógica de negocio, parsing y fetch de datos.
 * Siguiendo la regla de NO modificar la lógica funcional y mantener la pureza del código,
 * este módulo se ha profesionalizado (JSDoc, code style) sin alterar su comportamiento.
 * Las animaciones premium (IntersectionObserver, FLIP, fade-ins) y manipulaciones del DOM
 * mencionadas en los requerimientos deben ir en los archivos de vista/componentes UI correspondientes,
 * ya que aquí no existe generación de HTML ni interacción con el DOM.
 */

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSRJ2O79G-uKQF1O7oKz-5g6sSvW1lnggUNOoiwtn6XWdNInaomFkrgDNMzEjWC0A/pub?gid=847739532&single=true&output=csv";

/**
 * Normaliza un string eliminando tildes, pasando a minúsculas y limpiando espacios.
 * @param {string|null|undefined} value - Texto a normalizar.
 * @returns {string} Texto normalizado.
 */
function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Extrae el rango de años de una descripción.
 * @param {string} description - Texto de la descripción.
 * @returns {{from: number|null, to: number|null}} Objeto con los años detectados.
 */
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

/**
 * Extrae el tamaño del rodado (Rim) de una descripción.
 * @param {string} description - Texto de la descripción.
 * @returns {string} Rodado en formato "RXX" o string vacío.
 */
function parseRim(description) {
  const text = String(description ?? "");
  const m = text.match(/\bR(\d{2})\b/i);
  return m ? `R${m[1]}`.toUpperCase() : "";
}

/**
 * Parsea una línea de CSV respetando valores entre comillas dobles.
 * @param {string} line - Línea de texto CSV.
 * @returns {string[]} Array de valores parseados y limpios.
 */
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
        i++; // Saltamos la comilla escapada
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

/**
 * Separa una cadena de URLs de imágenes separadas por el pipe '|'.
 * @param {string} value - String con URLs.
 * @returns {string[]} Array de URLs limpias.
 */
function parseImages(value) {
  return String(value ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Convierte un string de precio en un número flotante válido,
 * soportando distintos formatos de miles y decimales.
 * @param {string|number} value - Valor original del precio.
 * @returns {number} Precio numérico limpio (0 si es inválido).
 */
function parsePrice(value) {
  const text = String(value ?? "").trim();

  if (!text) return 0;

  // Normalización de separadores (ej. 24.000,50 -> 24000.50)
  const normalized = text
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(/,(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");

  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Convierte el contenido raw del CSV en un array de objetos de producto procesados.
 * @param {string} csvText - Contenido del archivo CSV.
 * @returns {Array<Object>} Lista de productos activos.
 */
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
      const detail = String(row.detalle ?? "").trim();

      const isActiveRaw = String(row.active ?? "")
        .trim()
        .toLowerCase();
      const active = isActiveRaw === "1" || isActiveRaw === "true";

      const years = parseYears(description);
      const rim = parseRim(description);

      return {
        id,
        category,
        brand,
        code,
        description,
        detail,
        price,
        image_url: image_urls[0] ?? "",
        image_urls,
        active: active && price > 0,
        years,
        rim,
        searchText: normalizeText(
          `${category} ${brand} ${code} ${description}`,
        ),
      };
    })
    .filter((p) => p.active);
}

/**
 * Fetchea el CSV de Google Sheets, lo parsea y devuelve los productos.
 * @async
 * @returns {Promise<Array<Object>>} Promesa que resuelve la lista de productos.
 * @throws {Error} Si la petición de red falla.
 */
export async function loadProducts() {
  const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`No se pudo cargar Google Sheets (${res.status})`);
  }

  const csvText = await res.text();
  return csvToProducts(csvText);
}
