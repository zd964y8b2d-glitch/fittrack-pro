// ═══════════════════════════════════════════════════════════════════════════
// foodSearch.js
// Anbindung an Open Food Facts – kostenlose, offene Lebensmitteldatenbank.
// Kein API-Key nötig. Unterstützt Textsuche und Barcode-Lookup.
//
// SUCHE-STRATEGIE: Open Food Facts bietet keine echte Volltext-/Teilstring-
// suche über die offiziellen v2/v3 APIs an (nur strukturierte Tag-Filter).
// Die einzigen zwei Optionen für Namenssuche sind:
//   1. /cgi/search.pl (legacy, aber unterstützt Teilstring-Suche zuverlässig
//      - z.B. "Skyr" findet auch "Skyr Vanille") - PRIMÄR verwendet
//   2. search.openfoodfacts.org (Search-a-licious, moderne Beta-API) -
//      FALLBACK, falls der Legacy-Endpunkt mal nicht erreichbar ist
// Bei einem 503-Fehler (häufigster Fehlerfall bei search.pl) wird zusätzlich
// einmal automatisch erneut versucht, da das oft ein temporärer Lastspitzen-
// Fehler ist, der Sekunden später bereits wieder verschwunden ist.
//
// Alle zurückgegebenen Nährwerte sind PRO 100g/100ml, damit die App die
// tatsächlich gewählte Grammzahl frei umrechnen kann (wie bei FDDB).
// ═══════════════════════════════════════════════════════════════════════════

const OFF_LEGACY_SEARCH_URL = 'https://de.openfoodfacts.org/cgi/search.pl';
const SEARCH_A_LICIOUS_URL = 'https://search.openfoodfacts.org/search';
const OFF_PRODUCT_URL = 'https://de.openfoodfacts.org/api/v2/product';

const REQUEST_FIELDS = 'code,product_name,product_name_de,generic_name,generic_name_de,brands,image_front_small_url,image_small_url,nutriments';

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
    throw new Error('__INVALID_JSON__');
  }
}

async function fetchWithOneRetry(url) {
  let res = await fetch(url);
  if (res.status === 503) {
    // Kurze Pause, dann ein zweiter Versuch - 503 bei search.pl ist meist
    // eine temporäre Lastspitze, kein dauerhafter Ausfall.
    await new Promise((r) => setTimeout(r, 800));
    res = await fetch(url);
  }
  return res;
}

// ── TEXTSUCHE (primär: legacy Endpunkt, da einzige echte Teilstring-Suche) ─
async function searchViaLegacyEndpoint(query, limit, brand) {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(limit),
    lc: 'de',
    fields: REQUEST_FIELDS,
  });
  if (brand) {
    // OFF-Tag-Filter: schränkt zusätzlich zum Freitext auf eine Marke ein.
    params.set('tagtype_0', 'brands');
    params.set('tag_contains_0', 'contains');
    params.set('tag_0', brand);
  }
  const res = await fetchWithOneRetry(`${OFF_LEGACY_SEARCH_URL}?${params.toString()}`);
  if (!res.ok) throw new Error('__HTTP_ERROR__');
  const data = await safeParseJson(res);
  return data.products || [];
}

// ── TEXTSUCHE (Fallback: moderne Search-a-licious Beta-API) ───────────────
async function searchViaSearchALicious(query, limit, brand) {
  // Der langs-Parameter dieser API erwartet Sprachcodes mit Doppelpunkt
  // getrennt (z.B. "de:en"), nicht mit Komma.
  const q = brand ? `${query} brands:"${brand}"` : query;
  const params = new URLSearchParams({
    q,
    langs: 'de:en',
    page_size: String(limit),
    fields: REQUEST_FIELDS,
  });
  const res = await fetch(`${SEARCH_A_LICIOUS_URL}?${params.toString()}`);
  if (!res.ok) throw new Error('__HTTP_ERROR__');
  const data = await safeParseJson(res);
  return data.hits || data.products || data.results || [];
}

// Sucht Produkte nach Namen (Teilstring-Suche, z.B. "Skyr" findet auch
// "Skyr Vanille"). Versucht zuerst den Legacy-Endpunkt; schlägt dieser fehl
// oder liefert 0 Treffer, wird automatisch auf Search-a-licious zurück-
// gefallen, bevor ein Fehler an die Oberfläche gemeldet wird.
// Sucht Produkte nach Namen (Teilstring-Suche, z.B. "Skyr" findet auch
// "Skyr Vanille"). Versucht zuerst den Legacy-Endpunkt; schlägt dieser fehl
// oder liefert 0 Treffer, wird automatisch auf Search-a-licious zurück-
// gefallen, bevor ein Fehler an die Oberfläche gemeldet wird.
// brand (optional): schränkt zusätzlich auf einen Hersteller/eine Marke ein.
export async function searchFoodByName(query, limit = 20, brand = '') {
  if (!query || query.trim().length < 3) return [];
  const trimmedQuery = query.trim();
  const trimmedBrand = (brand || '').trim();

  let rawProducts = null;
  let lastError = null;

  try {
    rawProducts = await searchViaLegacyEndpoint(trimmedQuery, limit, trimmedBrand);
  } catch (err) {
    lastError = err;
  }

  if (!rawProducts || !rawProducts.length) {
    try {
      rawProducts = await searchViaSearchALicious(trimmedQuery, limit, trimmedBrand);
      lastError = null;
    } catch (err) {
      // Nur überschreiben wenn der erste Versuch auch schon fehlgeschlagen
      // war - ein "0 Treffer" vom Legacy-Endpunkt ohne Fehler soll nicht
      // durch einen Fallback-Fehler verdeckt werden.
      if (lastError) lastError = err;
    }
  }

  if (lastError) {
    if (lastError.message === '__INVALID_JSON__') {
      throw new Error('Die Lebensmitteldatenbank hat eine unerwartete Antwort geliefert. Bitte versuch es in ein paar Sekunden erneut.');
    }
    throw new Error('Lebensmittelsuche momentan nicht erreichbar. Prüfe deine Internetverbindung oder versuch es später erneut.');
  }

  let products = (rawProducts || [])
    .filter((p) => p.product_name_de || p.product_name || p.generic_name_de)
    .map(normalizeProduct)
    .filter((p) => p.per100.kcal > 0); // Produkte ohne Kalorienangabe sind für uns nutzlos

  // Zusätzlicher clientseitiger Hersteller-Filter als Sicherheitsnetz: die
  // serverseitigen OFF-Tag-Filter matchen nicht immer zuverlässig, daher
  // wird zusätzlich lokal nach Marke gefiltert, falls eine angegeben wurde.
  if (trimmedBrand) {
    const brandLower = trimmedBrand.toLowerCase();
    products = products.filter((p) => p.brand.toLowerCase().includes(brandLower));
  }

  return products;
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
