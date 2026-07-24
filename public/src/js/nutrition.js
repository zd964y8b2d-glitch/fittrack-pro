// ═══════════════════════════════════════════════════════════════════════════
// nutrition.js
// Ernährungstracking: Mahlzeiten gruppiert in feste Slots (Frühstück, Snack 1,
// Mittagessen, Snack 2, Abendessen, erweiterbar), mit Bearbeiten/Löschen,
// Lebensmittelsuche (Open Food Facts), Barcode-Scan, Coach-Ernährungsplan
// (Makro-Verteilung pro Slot) und einfacher Trend-Analyse der letzten Tage.
// ═══════════════════════════════════════════════════════════════════════════
import { getMealsForToday, addMeal, updateMeal, deleteMeal, getMealHistoryAggregated, getWeightHistoryForTrend, updateProfile } from './api.js';
import { ringHTML, pbar, showToast, closeMo, openMo, mealTotals } from './ui.js';
import { assertOnline } from './offline.js';
import { searchFoodByName, getFoodByBarcode, scaleNutrients } from './foodSearch.js';
import { DEFAULT_MEAL_SLOTS, buildCoachNutritionPlan, addMealSlot, removeMealSlot, analyzeNutritionTrend } from './coachData.js';

let currentUser = null;
let currentProfile = null;
let mealsCache = [];

let selectedProduct = null;
let html5QrCode = null;
let searchDebounceTimer = null;
let activeNTab = 'today';
let editingSlots = [];

export function initNutritionModule(user, profile) {
  currentUser = user;
  currentProfile = profile;
}

export function updateProfileRef(profile) {
  currentProfile = profile;
}

function getSlots() {
  return (currentProfile.meal_slots && currentProfile.meal_slots.length)
    ? currentProfile.meal_slots
    : DEFAULT_MEAL_SLOTS;
}

// ── HAUPTANZEIGE ─────────────────────────────────────────────────────────
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

  await renderTrendInsights(m);
  renderMealsBySlot();
  if (activeNTab === 'coach') renderCoachNutritionPlan();
}

// ── TREND-INSIGHTS (datengetriebener Coach) ──────────────────────────────
async function renderTrendInsights(dailyMacros) {
  const el = document.getElementById('nutr-insights');
  try {
    const [history, weightHistory] = await Promise.all([
      getMealHistoryAggregated(currentUser.id, 14),
      getWeightHistoryForTrend(currentUser.id, 21),
    ]);
    const goal = currentProfile.goals?.[0] || 'health';
    const insights = analyzeNutritionTrend(history, weightHistory, dailyMacros, goal);

    el.innerHTML = insights.length
      ? insights.map((txt) => `<div class="coach-tip"><div class="ct-icon">🏆</div><div><div class="ct-lbl">COACH-ANALYSE</div><div class="ct-txt">${txt}</div></div></div>`).join('')
      : '';
  } catch (e) {
    el.innerHTML = '';
  }
}

// ── MAHLZEITEN NACH SLOTS GRUPPIERT ──────────────────────────────────────
function renderMealsBySlot() {
  const slots = getSlots();
  const byslot = {};
  slots.forEach((s) => (byslot[s.id] = []));
  const unassigned = [];

  mealsCache.forEach((meal) => {
    if (meal.meal_slot_id && byslot[meal.meal_slot_id]) {
      byslot[meal.meal_slot_id].push(meal);
    } else {
      unassigned.push(meal);
    }
  });

  let html = slots.map((slot) => {
    const meals = byslot[slot.id] || [];
    const slotTotal = mealTotals(meals);
    return `<div class="day-card" style="margin-bottom:10px">
      <div class="day-hdr">
        <div class="day-name">${slot.label}</div>
        <span class="tag ta">${slotTotal.cal} kcal</span>
      </div>
      ${meals.length ? meals.map((ml) => mealRowHTML(ml)).join('') : `<div style="font-size:12px;color:var(--muted);padding:8px 0">Noch nichts eingetragen</div>`}
    </div>`;
  }).join('');

  if (unassigned.length) {
    html += `<div class="day-card" style="margin-bottom:10px;border-left:3px solid var(--muted)">
      <div class="day-hdr"><div class="day-name">Ohne Zuordnung</div></div>
      ${unassigned.map((ml) => mealRowHTML(ml)).join('')}
    </div>`;
  }

  document.getElementById('meal-list').innerHTML = html || `<div style="text-align:center;color:var(--muted);padding:24px;font-size:13px">Noch nichts eingetragen.</div>`;

  document.querySelectorAll('[data-edit-meal]').forEach((btn) => {
    btn.addEventListener('click', () => openEditMeal(btn.dataset.editMeal));
  });
  document.querySelectorAll('[data-del-meal]').forEach((btn) => {
    btn.addEventListener('click', () => confirmDeleteMeal(btn.dataset.delMeal));
  });
}

function mealRowHTML(ml) {
  return `<div class="card" style="margin-bottom:8px">
    <div class="row" style="align-items:flex-start">
      <div style="flex:1">
        <div style="font-size:10px;color:var(--sub);font-weight:700;margin-bottom:3px">${new Date(ml.measured_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
        <div style="font-size:14px;font-weight:700">${ml.meal_name}</div>
        <div style="display:flex;gap:10px;margin-top:4px">
          <span style="font-size:11px;color:var(--sub)">P: ${ml.protein_g}g</span>
          <span style="font-size:11px;color:var(--sub)">K: ${ml.carbs_g}g</span>
          <span style="font-size:11px;color:var(--sub)">F: ${ml.fat_g}g</span>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;margin-left:8px">
        <div style="font-size:16px;font-weight:900;color:var(--orange);margin-bottom:6px">${ml.kcal}</div>
        <div style="display:flex;gap:5px">
          <button class="edit-btn" data-edit-meal="${ml.id}">✏️</button>
          <button class="del-btn" data-del-meal="${ml.id}">✕</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ── MAHLZEIT BEARBEITEN ──────────────────────────────────────────────────
function openEditMeal(mealId) {
  const meal = mealsCache.find((m) => m.id === mealId);
  if (!meal) return;
  resetMealModal();
  switchMealTab('manual');
  document.getElementById('mn-name').value = meal.meal_name;
  document.getElementById('mn-cal').value = meal.kcal;
  document.getElementById('mn-p').value = meal.protein_g;
  document.getElementById('mn-c').value = meal.carbs_g;
  document.getElementById('mn-f').value = meal.fat_g;
  document.getElementById('mn-edit-id').value = meal.id;
  populateSlotSelect('mn-slot-select', meal.meal_slot_id);
  document.querySelector('#mo-meal .mt').textContent = 'Mahlzeit bearbeiten';
  openMo('mo-meal');
}

async function confirmDeleteMeal(mealId) {
  if (!confirm('Diese Mahlzeit wirklich löschen?')) return;
  try {
    assertOnline();
    await deleteMeal(mealId);
    await renderNutrition();
    showToast('Mahlzeit gelöscht');
  } catch (e) {
    showToast('⚠️ Löschen fehlgeschlagen');
  }
}

// ── COACH-ERNÄHRUNGSPLAN (Tab) ───────────────────────────────────────────
export function switchNutritionTab(tab) {
  activeNTab = tab;
  document.getElementById('ntab-today').classList.toggle('active', tab === 'today');
  document.getElementById('ntab-coach').classList.toggle('active', tab === 'coach');
  document.getElementById('nv-today').style.display = tab === 'today' ? '' : 'none';
  document.getElementById('nv-coach').style.display = tab === 'coach' ? '' : 'none';
  if (tab === 'coach') renderCoachNutritionPlan();
}

function renderCoachNutritionPlan() {
  const dailyMacros = {
    kcal: currentProfile.macro_kcal || 2000,
    protein: currentProfile.macro_protein || 150,
    carbs: currentProfile.macro_carbs || 200,
    fat: currentProfile.macro_fat || 60,
  };
  const plan = buildCoachNutritionPlan(dailyMacros, getSlots());

  document.getElementById('nv-coach').innerHTML = `
    <div class="coach-tip" style="margin-bottom:14px">
      <div class="ct-icon">🏆</div>
      <div><div class="ct-lbl">COACH-ERNÄHRUNGSPLAN</div>
      <div class="ct-txt">Vorschlag, wie du deine Tagesmakros auf deine Mahlzeiten verteilen kannst. Passe die Gewichtung jederzeit über "Mahlzeiten verwalten" an.</div></div>
    </div>
    ${plan.map((slot) => `
      <div class="day-card" style="margin-bottom:10px">
        <div class="day-hdr">
          <div class="day-name">${slot.label}</div>
          <span class="tag to">${slot.kcal} kcal</span>
        </div>
        <div class="macro-grid">
          <div class="macro-tile"><div class="macro-val" style="color:var(--accent2)">${slot.protein}g</div><div class="macro-lbl">Protein</div></div>
          <div class="macro-tile"><div class="macro-val" style="color:var(--green)">${slot.carbs}g</div><div class="macro-lbl">Kohlenh.</div></div>
          <div class="macro-tile"><div class="macro-val" style="color:var(--orange)">${slot.fat}g</div><div class="macro-lbl">Fett</div></div>
        </div>
      </div>`).join('')}`;
}

// ── SLOT-VERWALTUNG (Bearbeiten/Hinzufügen/Entfernen) ────────────────────
export function openSlotManager() {
  editingSlots = JSON.parse(JSON.stringify(getSlots()));
  renderSlotEditList();
  openMo('mo-slots');
}

function renderSlotEditList() {
  const el = document.getElementById('slots-edit-list');
  el.innerHTML = editingSlots.map((slot, i) => `
    <div class="row" style="gap:8px;margin-bottom:8px">
      <input class="oi" type="text" value="${slot.label}" data-slot-label="${i}" style="flex:1">
      <button class="del-btn" data-slot-remove="${i}" ${editingSlots.length <= 1 ? 'disabled style="opacity:.3"' : ''}>✕</button>
    </div>`).join('');

  el.querySelectorAll('[data-slot-label]').forEach((input) => {
    input.addEventListener('input', (e) => {
      editingSlots[parseInt(input.dataset.slotLabel)].label = e.target.value;
    });
  });
  el.querySelectorAll('[data-slot-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.slotRemove);
      editingSlots = removeMealSlot(editingSlots, editingSlots[idx].id);
      renderSlotEditList();
    });
  });
}

export function addNewSlot() {
  editingSlots = addMealSlot(editingSlots, 'Neue Mahlzeit');
  renderSlotEditList();
}

export async function saveSlots() {
  try {
    assertOnline();
    const updated = await updateProfile(currentUser.id, { meal_slots: editingSlots });
    currentProfile = updated;
    closeMo('mo-slots');
    await renderNutrition();
    showToast('✅ Mahlzeiten aktualisiert');
  } catch (e) {
    showToast('⚠️ Speichern fehlgeschlagen');
  }
}

function populateSlotSelect(selectId, currentSlotId) {
  const select = document.getElementById(selectId);
  const slots = getSlots();
  select.innerHTML = slots.map((s) => `<option value="${s.id}" ${s.id === currentSlotId ? 'selected' : ''}>${s.label}</option>`).join('');
}

// ── MODAL: TAB-STEUERUNG (Suche / Scannen / Manuell) ────────────────────
export function openMealModal() {
  resetMealModal();
  document.querySelector('#mo-meal .mt').textContent = 'Mahlzeit eintragen';
  openMo('mo-meal');
}

function resetMealModal() {
  switchMealTab('search');
  document.getElementById('food-search-input').value = '';
  document.getElementById('food-search-results').innerHTML = '';
  document.getElementById('food-search-status').style.display = 'none';
  document.getElementById('mn-edit-id').value = '';
  ['mn-name', 'mn-cal', 'mn-p', 'mn-c', 'mn-f'].forEach((id) => (document.getElementById(id).value = ''));
  populateSlotSelect('mn-slot-select', null);
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

// ── TEXTSUCHE ─────────────────────────────────────────────────────────────
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
      statusEl.style.display = 'block';
      statusEl.textContent = '⚠️ ' + (err.message || 'Suche fehlgeschlagen.');
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
    card.addEventListener('click', () => selectProduct(results[parseInt(card.dataset.foodIdx)]));
  });
}

// ── PRODUKT AUSWÄHLEN → DETAIL-ANSICHT ───────────────────────────────────
function selectProduct(product) {
  selectedProduct = product;
  document.getElementById('mv-search').style.display = 'none';
  document.getElementById('mv-scan').style.display = 'none';
  document.getElementById('mv-manual').style.display = 'none';
  document.getElementById('mv-product-detail').style.display = '';

  document.getElementById('product-detail-card').innerHTML = `
    <div style="font-size:15px;font-weight:800">${product.name}</div>
    ${product.brand ? `<div style="font-size:12px;color:var(--sub);margin-top:2px">${product.brand}</div>` : ''}
    <div style="font-size:11px;color:var(--muted);margin-top:6px">Pro 100g: ${product.per100.kcal} kcal · P ${product.per100.protein}g · K ${product.per100.carbs}g · F ${product.per100.fat}g</div>`;

  document.getElementById('food-grams').value = '100';
  populateSlotSelect('food-slot-select', null);
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

export async function saveSelectedProduct() {
  if (!selectedProduct) return;
  const grams = Math.max(1, parseInt(document.getElementById('food-grams').value) || 100);
  const scaled = scaleNutrients(selectedProduct.per100, grams);
  const slotId = document.getElementById('food-slot-select').value;

  try {
    assertOnline();
    await addMeal(currentUser.id, {
      name: `${selectedProduct.name} (${grams}g)`,
      cal: scaled.kcal, protein: scaled.protein, carbs: scaled.carbs, fat: scaled.fat,
      type: 'Mahlzeit', slotId, foodId: selectedProduct.id, grams,
    });
    closeMo('mo-meal');
    await renderNutrition();
    showToast('✅ Mahlzeit gespeichert');
  } catch (err) {
    showToast(err.message?.includes('Internet') ? err.message : '⚠️ Speichern fehlgeschlagen');
  }
}

// ── BARCODE-SCANNER ───────────────────────────────────────────────────────
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
      () => {}
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

// ── MANUELLE EINGABE (mit Bearbeiten-Unterstützung) ──────────────────────
export async function saveMealFromModal() {
  const name = document.getElementById('mn-name').value.trim();
  const cal = parseInt(document.getElementById('mn-cal').value) || 0;
  if (!name || !cal) { showToast('⚠️ Name + Kalorien erforderlich'); return; }

  const editId = document.getElementById('mn-edit-id').value;
  const slotId = document.getElementById('mn-slot-select').value;
  const payload = {
    name, cal,
    protein: parseInt(document.getElementById('mn-p').value) || 0,
    carbs: parseInt(document.getElementById('mn-c').value) || 0,
    fat: parseInt(document.getElementById('mn-f').value) || 0,
    slotId,
  };

  try {
    assertOnline();
    if (editId) {
      await updateMeal(editId, payload);
    } else {
      await addMeal(currentUser.id, { ...payload, type: 'Mahlzeit' });
    }
    closeMo('mo-meal');
    await renderNutrition();
    showToast('✅ Mahlzeit gespeichert');
  } catch (err) {
    showToast(err.message?.includes('Internet') ? err.message : '⚠️ Speichern fehlgeschlagen');
  }
}

export function getMealsCache() { return mealsCache; }
