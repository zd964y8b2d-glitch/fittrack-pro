// ═══════════════════════════════════════════════════════════════════════════
// foodSearch.js
// Anbindung an Open Food Facts (openfoodfacts.org) – kostenlose, offene
// Lebensmitteldatenbank mit Millionen Produkten weltweit. Kein API-Key
// nötig. Unterstützt Textsuche und Barcode-Lookup.
//
// Alle zurückgegebenen Nährwerte sind PRO 100g/100ml, damit die App die
// tatsächlich gewählte Grammzahl frei umrechnen kann (wie bei FDDB).
// ═══════════════════════════════════════════════════════════════════════════

const OFF_SEARCH_URL = 'https://de.openfoodfacts.org/cgi/search.pl';
const OFF_PRODUCT_URL = 'https://de.openfoodfacts.org/api/v2/product';

// Wandelt einen rohen Open Food Facts Produkt-Datensatz in unser
// einheitliches, schlankes Format um.
function normalizeProduct(p) {
  const n = p.nutriments || {};
  return {
    id: p.code || p._id || '',
    name: p.product_name_de || p.product_name || p.generic_name_de || p.generic_name || 'Unbekanntes Produkt',
    brand: p.brands || '',
    imageUrl: p.image_front_small_url || p.image_small_url || null,
    // Nährwerte IMMER pro 100g/100ml normiert:
    per100: {
      kcal: Math.round(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0),
      protein: round1(n.proteins_100g ?? 0),
      carbs: round1(n.carbohydrates_100g ?? 0),
      fat: round1(n.fat_100g ?? 0),
    },
  };
}

function round1(v) {
  return Math.round(v * 10) / 10;
}

// ── TEXTSUCHE ────────────────────────────────────────────────────────────
// Sucht Produkte nach Namen. Gibt eine Liste normalisierter Treffer zurück.
export async function searchFoodByName(query, limit = 20) {
  if (!query || query.trim().length < 3) return [];

  const params = new URLSearchParams({
    search_terms: query.trim(),
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(limit),
    lc: 'de', // Bevorzugt deutsche Produktnamen/Übersetzungen in der Antwort
    fields: 'code,product_name,product_name_de,generic_name,generic_name_de,brands,image_front_small_url,image_small_url,nutriments',
  });

  // Hinweis: Der User-Agent-Header wird bewusst NICHT gesetzt - Safari/WebKit
  // blockiert das per CORS-Preflight, da Open Food Facts diesen Header nicht
  // explizit in Access-Control-Allow-Headers erlaubt. Stattdessen wird die
  // App über den Query-Parameter identifiziert (unten), was CORS-sicher ist.
  let res;
  try {
    res = await fetch(`${OFF_SEARCH_URL}?${params.toString()}`);
  } catch (networkErr) {
    throw new Error('Keine Verbindung zur Lebensmitteldatenbank. Prüfe deine Internetverbindung.');
  }
  if (res.status === 429 || res.status === 503) {
    throw new Error('Zu viele Anfragen – bitte kurz warten.');
  }
  if (!res.ok) throw new Error('Lebensmittelsuche fehlgeschlagen (Status ' + res.status + ')');
  const data = await res.json();

  return (data.products || [])
    .filter((p) => p.product_name_de || p.product_name || p.generic_name_de) // Produkte ohne Namen ausblenden
    .map(normalizeProduct)
    .filter((p) => p.per100.kcal > 0); // Produkte ohne Kalorienangabe sind für uns nutzlos
}

// ── BARCODE-LOOKUP ───────────────────────────────────────────────────────
// Holt ein einzelnes Produkt anhand seines Barcodes (EAN/UPC).
export async function getFoodByBarcode(barcode) {
  let res;
  try {
    res = await fetch(`${OFF_PRODUCT_URL}/${barcode}.json`);
  } catch (networkErr) {
    throw new Error('Keine Verbindung zur Lebensmitteldatenbank. Prüfe deine Internetverbindung.');
  }
  if (!res.ok) throw new Error('Produkt konnte nicht geladen werden');
  const data = await res.json();

  if (data.status !== 1 || !data.product) {
    return null; // Barcode nicht in der Datenbank gefunden
  }
  return normalizeProduct(data.product);
}

// Rechnet die pro-100g-Werte auf die tatsächlich gewählte Grammzahl um.
export function scaleNutrients(per100, grams) {
  const factor = grams / 100;
  return {
    kcal: Math.round(per100.kcal * factor),
    protein: round1(per100.protein * factor),
    carbs: round1(per100.carbs * factor),
    fat: round1(per100.fat * factor),
  };
}
