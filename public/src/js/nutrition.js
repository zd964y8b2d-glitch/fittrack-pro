// ═══════════════════════════════════════════════════════════════════════════
// nutrition.js
// Ernährungstracking: Mahlzeiten des Tages, Makro-Fortschritt ggü. den
// Coach-Zielwerten aus dem Profil. Lebensmittel können per Textsuche,
// Barcode-Scan (Open Food Facts) oder manuell eingetragen werden, mit frei
// anpassbarer Grammzahl (ähnlich FDDB).
// ═══════════════════════════════════════════════════════════════════════════
import { getMealsForToday, addMeal } from './api.js';
import { ringHTML, pbar, showToast, closeMo, openMo, mealTotals } from './ui.js';
import { assertOnline } from './offline.js';
import { searchFoodByName, getFoodByBarcode, scaleNutrients } from './foodSearch.js';

let currentUser = null;
let currentProfile = null;
let mealsCache = [];

// Aktuell in der Produkt-Detail-Ansicht ausgewähltes Produkt (pro 100g-Werte)
let selectedProduct = null;
let html5QrCode = null;
let searchDebounceTimer = null;

export function initNutritionModule(user, profile) {
  currentUser = user;
  currentProfile = profile;
}

export function updateProfileRef(profile) {
  currentProfile = profile;
}

// ── HAUPTANZEIGE (Tagesübersicht + Mahlzeitenliste) ─────────────────────
export async function renderNutrition() {
  mealsCache = await getMealsForToday(currentUser.id);
  const t = mealTotals(mealsCache);
  const m = {
    kcal: currentProfile.macro_kcal || 2000,
    protein: currentProfile.macro_protein || 150,
    carbs: currentProfile.macro_carbs || 200,
    fat: currentProfile.macro_fat || 60,
  };

  document.getElementById('nutr-sub').textContent = `Ziel: ${m.kcal} kcal`;
  document.getElementById('nutr-card').innerHTML = `
    <div class="row" style="margin-bottom:14px">
      <div><div style="font-size:28px;font-weight:900;letter-spacing:-1px">${t.cal}</div>
      <div style="font-size:12px;color:var(--sub)">von ${m.kcal} kcal</div></div>
      ${ringHTML(76, 9, Math.min((t.cal / m.kcal) * 100, 100), 'var(--orange)', Math.round((t.cal / m.kcal) * 100) + '%')}
    </div>
    ${pbar('Protein ' + t.protein + 'g / ' + m.protein + 'g', t.protein, m.protein, 'var(--accent)')}
    ${pbar('Kohlenhydrate ' + t.carbs + 'g / ' + m.carbs + 'g', t.carbs, m.carbs, 'var(--green)')}
    ${pbar('Fett ' + t.fat + 'g / ' + m.fat + 'g', t.fat, m.fat, 'var(--orange)')}`;

  document.getElementById('meal-list').innerHTML = mealsCache.length
    ? mealsCache.map((ml) => `
      <div class="card" style="margin-bottom:9px">
        <div style="font-size:10px;color:var(--sub);font-weight:700;margin-bottom:3px">${ml.meal_type || 'Mahlzeit'} · ${new Date(ml.measured_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
        <div class="row">
          <div style="font-size:14px;font-weight:700">${ml.meal_name}</div>
          <div style="font-size:17px;font-weight:900;color:var(--orange)">${ml.kcal}</div>
        </div>
        <div style="display:flex;gap:10px;margin-top:4px">
          <span style="font-size:11px;color:var(--sub)">P: ${ml.protein_g}g</span>
          <span style="font-size:11px;color:var(--sub)">K: ${ml.carbs_g}g</span>
          <span style="font-size:11px;color:var(--sub)">F: ${ml.fat_g}g</span>
        </div>
      </div>`).join('')
    : `<div style="text-align:center;color:var(--muted);padding:24px;font-size:13px">Noch nichts eingetragen.</div>`;
}

// ── MODAL: TAB-STEUERUNG ────────────────────────────────────────────────
export function openMealModal() {
  resetMealModal();
  openMo('mo-meal');
}

function resetMealModal() {
  switchMealTab('search');
  document.getElementById('food-search-input').value = '';
  document.getElementById('food-search-results').innerHTML = '';
  document.getElementById('food-search-status').style.display = 'none';
  selectedProduct = null;
  stopScanner();
}

export function switchMealTab(tab) {
  ['search', 'scan', 'manual'].forEach((t) => {
    document.getElementById('mtab-' + t).classList.toggle('active', t === tab);
  });
  document.getElementById('mv-search').style.display = tab === 'search' ? '' : 'none';
  document.getElementById('mv-scan').style.display = tab === 'scan' ? '' : 'none';
  document.getElementById('mv-manual').style.display = tab === 'manual' ? '' : 'none';
  document.getElementById('mv-product-detail').style.display = 'none';
  if (tab !== 'scan') stopScanner();
}

// ── TEXTSUCHE (mit Debounce, damit nicht bei jedem Tastendruck gesucht wird) ─
export function onFoodSearchInput(query) {
  clearTimeout(searchDebounceTimer);
  const statusEl = document.getElementById('food-search-status');
  const resultsEl = document.getElementById('food-search-results');

  if (!query || query.trim().length < 3) {
    resultsEl.innerHTML = '';
    statusEl.style.display = 'none';
    return;
  }

  statusEl.style.display = 'block';
  statusEl.textContent = '🔍 Suche läuft...';

  searchDebounceTimer = setTimeout(async () => {
    try {
      const results = await searchFoodByName(query);
      renderFoodResults(results);
      statusEl.style.display = results.length ? 'none' : 'block';
      if (!results.length) statusEl.textContent = 'Keine Treffer gefunden. Versuch einen anderen Suchbegriff oder trage es manuell ein.';
    } catch (err) {
      statusEl.textContent = '⚠️ Suche fehlgeschlagen. Prüfe deine Internetverbindung.';
    }
  }, 800);
}

function renderFoodResults(results) {
  const el = document.getElementById('food-search-results');
  el.innerHTML = results.map((p, i) => `
    <div class="card" data-food-idx="${i}" style="margin-bottom:8px;cursor:pointer;padding:12px 14px">
      <div class="row">
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700">${p.name}</div>
          ${p.brand ? `<div style="font-size:11px;color:var(--sub);margin-top:1px">${p.brand}</div>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:8px">
          <div style="font-size:14px;font-weight:800;color:var(--orange)">${p.per100.kcal}</div>
          <div style="font-size:10px;color:var(--sub)">kcal/100g</div>
        </div>
      </div>
    </div>`).join('');

  el.querySelectorAll('[data-food-idx]').forEach((card) => {
    card.addEventListener('click', () => {
      selectProduct(results[parseInt(card.dataset.foodIdx)]);
    });
  });
}

// ── PRODUKT AUSWÄHLEN → DETAIL-ANSICHT MIT GRAMMZAHL ────────────────────
function selectProduct(product) {
  selectedProduct = product;
  document.getElementById('mv-search').style.display = 'none';
  document.getElementById('mv-scan').style.display = 'none';
  document.getElementById('mv-manual').style.display = 'none';
  document.getElementById('mv-product-detail').style.display = '';

  document.getElementById('product-detail-card').innerHTML = `
    <div style="font-size:15px;font-weight:800">${product.name}</div>
    ${product.brand ? `<div style="font-size:12px;color:var(--sub);margin-top:2px">${product.brand}</div>` : ''}
    <div style="font-size:11px;color:var(--muted);margin-top:6px">Nährwerte pro 100g: ${product.per100.kcal} kcal · P ${product.per100.protein}g · K ${product.per100.carbs}g · F ${product.per100.fat}g</div>`;

  document.getElementById('food-grams').value = '100';
  updateNutrientPreview();
}

function updateNutrientPreview() {
  if (!selectedProduct) return;
  const grams = Math.max(0, parseInt(document.getElementById('food-grams').value) || 0);
  const scaled = scaleNutrients(selectedProduct.per100, grams);
  document.getElementById('prev-kcal').textContent = scaled.kcal;
  document.getElementById('prev-protein').textContent = scaled.protein + 'g';
  document.getElementById('prev-carbs').textContent = scaled.carbs + 'g';
}

export function stepGrams(delta) {
  const input = document.getElementById('food-grams');
  const cur = parseInt(input.value) || 0;
  input.value = Math.max(0, cur + delta);
  updateNutrientPreview();
}

export function onGramsInput() {
  updateNutrientPreview();
}

export function backToSearch() {
  selectedProduct = null;
  document.getElementById('mv-product-detail').style.display = 'none';
  document.getElementById('mv-search').style.display = '';
}

// ── PRODUKT MIT GEWÄHLTER GRAMMZAHL SPEICHERN ───────────────────────────
export async function saveSelectedProduct() {
  if (!selectedProduct) return;
  const grams = Math.max(1, parseInt(document.getElementById('food-grams').value) || 100);
  const scaled = scaleNutrients(selectedProduct.per100, grams);

  try {
    assertOnline();
    await addMeal(currentUser.id, {
      name: `${selectedProduct.name} (${grams}g)`,
      cal: scaled.kcal,
      protein: scaled.protein,
      carbs: scaled.carbs,
      fat: scaled.fat,
      type: 'Mahlzeit',
    });
    closeMo('mo-meal');
    await renderNutrition();
    showToast('✅ Mahlzeit gespeichert');
  } catch (err) {
    showToast(err.message?.includes('Internet') ? err.message : '⚠️ Speichern fehlgeschlagen');
  }
}

// ── BARCODE-SCANNER (html5-qrcode) ──────────────────────────────────────
export async function startScanner() {
  const statusEl = document.getElementById('scan-status');
  document.getElementById('scanner-placeholder').style.display = 'none';
  document.getElementById('scanner-video-wrap').style.display = '';
  document.getElementById('btn-start-scan').style.display = 'none';
  document.getElementById('btn-stop-scan').style.display = '';
  statusEl.textContent = 'Kamera wird gestartet...';

  try {
    if (typeof Html5Qrcode === 'undefined') {
      statusEl.textContent = '⚠️ Scanner konnte nicht geladen werden. Bitte Internetverbindung prüfen.';
      return;
    }
    html5QrCode = new Html5Qrcode('scanner-video');
    await html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      async (decodedText) => {
        statusEl.textContent = '✅ Barcode erkannt, suche Produkt...';
        await onBarcodeDetected(decodedText);
      },
      () => {} // Fehler pro Frame (kein Code gefunden) – ignorieren, ist normal
    );
    statusEl.textContent = 'Richte die Kamera auf den Barcode...';
  } catch (err) {
    statusEl.textContent = '⚠️ Kamerazugriff nicht möglich. Bitte in den iPhone-Einstellungen erlauben.';
    resetScanButtons();
  }
}

async function onBarcodeDetected(barcode) {
  await stopScanner();
  try {
    const product = await getFoodByBarcode(barcode);
    if (!product) {
      showToast('⚠️ Produkt nicht in der Datenbank gefunden');
      switchMealTab('manual');
      return;
    }
    selectProduct(product);
  } catch (err) {
    showToast('⚠️ Produktsuche fehlgeschlagen');
  }
}

export async function stopScanner() {
  if (html5QrCode) {
    try {
      await html5QrCode.stop();
      html5QrCode.clear();
    } catch (e) { /* Scanner lief bereits nicht mehr - ignorieren */ }
    html5QrCode = null;
  }
  resetScanButtons();
}

function resetScanButtons() {
  document.getElementById('scanner-placeholder').style.display = '';
  document.getElementById('scanner-video-wrap').style.display = 'none';
  document.getElementById('btn-start-scan').style.display = '';
  document.getElementById('btn-stop-scan').style.display = 'none';
}

// ── MANUELLE EINGABE (bestehendes Verhalten) ────────────────────────────
export async function saveMealFromModal() {
  const name = document.getElementById('mn-name').value.trim();
  const cal = parseInt(document.getElementById('mn-cal').value) || 0;
  if (!name || !cal) { showToast('⚠️ Name + Kalorien erforderlich'); return; }

  try {
    assertOnline();
    await addMeal(currentUser.id, {
      name, cal,
      protein: parseInt(document.getElementById('mn-p').value) || 0,
      carbs: parseInt(document.getElementById('mn-c').value) || 0,
      fat: parseInt(document.getElementById('mn-f').value) || 0,
      type: 'Mahlzeit',
    });
    ['mn-name', 'mn-cal', 'mn-p', 'mn-c', 'mn-f'].forEach((id) => (document.getElementById(id).value = ''));
    closeMo('mo-meal');
    await renderNutrition();
    showToast('✅ Mahlzeit gespeichert');
  } catch (err) {
    showToast(err.message?.includes('Internet') ? err.message : '⚠️ Speichern fehlgeschlagen');
  }
}

export function getMealsCache() { return mealsCache; }
