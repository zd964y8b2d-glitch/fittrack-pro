// ═══════════════════════════════════════════════════════════════════════════
// foodSearch.js
// Anbindung an Open Food Facts – kostenlose, offene Lebensmitteldatenbank.
// Kein API-Key nötig. Unterstützt Textsuche und Barcode-Lookup.
//
// SUCHE: Nutzt primär die moderne Search-a-licious API
// (search.openfoodfacts.org), da der alte /cgi/search.pl Endpunkt laut
// Open Food Facts' eigenem Status als "legacy" gilt, gelegentlich HTTP 503
// Fehler (mit HTML statt JSON) liefert und für neue Integrationen nicht
// mehr empfohlen wird. Bei einem Ausfall der neuen API greift automatisch
// ein Fallback auf die alte Suche, damit die Suche insgesamt robuster ist.
//
// Alle zurückgegebenen Nährwerte sind PRO 100g/100ml, damit die App die
// tatsächlich gewählte Grammzahl frei umrechnen kann (wie bei FDDB).
// ═══════════════════════════════════════════════════════════════════════════

const SEARCH_A_LICIOUS_URL = 'https://search.openfoodfacts.org/search';
const OFF_LEGACY_SEARCH_URL = 'https://de.openfoodfacts.org/cgi/search.pl';
const OFF_PRODUCT_URL = 'https://de.openfoodfacts.org/api/v2/product';

const REQUEST_FIELDS = 'code,product_name,product_name_de,generic_name,generic_name_de,brands,image_front_small_url,image_small_url,nutriments';

// Wandelt einen rohen Open Food Facts Produkt-Datensatz in unser
// einheitliches, schlankes Format um. Funktioniert für beide API-Varianten,
// da beide dieselbe zugrundeliegende Produktstruktur verwenden.
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

// Sicheres JSON-Parsing: Open Food Facts liefert bei Überlastung, Rate-Limits
// oder Serverfehlern manchmal eine HTML-Fehlerseite statt JSON zurück.
// res.json() würde dabei mit der kryptischen Safari-Meldung "The string did
// not match the expected pattern" fehlschlagen. Wir lesen daher zuerst als
// Text und parsen erst danach - mit einer klaren, verständlichen Fehlermeldung
// falls die Antwort tatsächlich kein valides JSON ist.
async function safeParseJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (parseErr) {
    throw new Error('__INVALID_JSON__'); // Interner Marker, wird von Aufrufer abgefangen
  }
}

// ── TEXTSUCHE (primär: Search-a-licious) ──────────────────────────────────
async function searchViaSearchALicious(query, limit) {
  const params = new URLSearchParams({
    q: query,
    langs: 'de,en',
    page_size: String(limit),
    fields: REQUEST_FIELDS,
  });
  const res = await fetch(`${SEARCH_A_LICIOUS_URL}?${params.toString()}`);
  if (!res.ok) throw new Error('__HTTP_ERROR__');
  const data = await safeParseJson(res);
  return data.hits || data.products || [];
}

// ── TEXTSUCHE (Fallback: alter /cgi/search.pl Endpunkt) ───────────────────
async function searchViaLegacyEndpoint(query, limit) {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(limit),
    lc: 'de',
    fields: REQUEST_FIELDS,
  });
  const res = await fetch(`${OFF_LEGACY_SEARCH_URL}?${params.toString()}`);
  if (!res.ok) throw new Error('__HTTP_ERROR__');
  const data = await safeParseJson(res);
  return data.products || [];
}

// Sucht Produkte nach Namen. Versucht zuerst die moderne Search-a-licious
// API; schlägt diese fehl (Netzwerkfehler, 503, ungültiges JSON), wird
// automatisch auf den alten Endpunkt zurückgefallen, bevor ein Fehler an
// die Oberfläche gemeldet wird.
export async function searchFoodByName(query, limit = 20) {
  if (!query || query.trim().length < 3) return [];
  const trimmedQuery = query.trim();

  let rawProducts = null;
  let lastError = null;

  try {
    rawProducts = await searchViaSearchALicious(trimmedQuery, limit);
  } catch (err) {
    lastError = err;
  }

  if (!rawProducts || !rawProducts.length) {
    try {
      rawProducts = await searchViaLegacyEndpoint(trimmedQuery, limit);
      lastError = null;
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError) {
    if (lastError.message === '__INVALID_JSON__') {
      throw new Error('Die Lebensmitteldatenbank hat eine unerwartete Antwort geliefert. Bitte versuch es in ein paar Sekunden erneut.');
    }
    throw new Error('Lebensmittelsuche momentan nicht erreichbar. Prüfe deine Internetverbindung oder versuch es später erneut.');
  }

  return (rawProducts || [])
    .filter((p) => p.product_name_de || p.product_name || p.generic_name_de)
    .map(normalizeProduct)
    .filter((p) => p.per100.kcal > 0); // Produkte ohne Kalorienangabe sind für uns nutzlos
}

// ── BARCODE-LOOKUP ───────────────────────────────────────────────────────
// Holt ein einzelnes Produkt anhand seines Barcodes (EAN/UPC). Der v2
// Produkt-Endpunkt ist stabil und von den Suchausfällen nicht betroffen.
export async function getFoodByBarcode(barcode) {
  let res;
  try {
    res = await fetch(`${OFF_PRODUCT_URL}/${barcode}.json`);
  } catch (networkErr) {
    throw new Error('Keine Verbindung zur Lebensmitteldatenbank. Prüfe deine Internetverbindung.');
  }
  if (!res.ok) throw new Error('Produkt konnte nicht geladen werden');

  let data;
  try {
    data = await safeParseJson(res);
  } catch (err) {
    throw new Error('Die Lebensmitteldatenbank hat eine unerwartete Antwort geliefert. Bitte versuch es erneut.');
  }

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
