// ═══════════════════════════════════════════════════════════════════════════
// nutrition.js
// Ernährungstracking: Mahlzeiten gruppiert in feste Slots (Frühstück, Snack 1,
// Mittagessen, Snack 2, Abendessen, erweiterbar), mit Bearbeiten/Löschen,
// Lebensmittelsuche (Open Food Facts), Barcode-Scan, Coach-Ernährungsplan
// (Makro-Verteilung pro Slot) und einfacher Trend-Analyse der letzten Tage.
// ═══════════════════════════════════════════════════════════════════════════
import { getMealsForToday, getMealsForDate, addMeal, updateMeal, deleteMeal, getMealHistoryAggregated, getWeightHistoryForTrend, updateProfile, getBurnedCaloriesForToday, getWaterForToday, setWaterForToday, getMealsBySlotHistory, getCalendarData, getCustomFoods, addCustomFood, getFrequentFoods } from './api.js';
import { ringHTML, pbar, showToast, closeMo, openMo, confirmDialog, mealTotals } from './ui.js';
import { assertOnline } from './offline.js';
import { searchFoodByName, getFoodByBarcode, scaleNutrients } from './foodSearch.js';
import { matchesQuery } from './genericFoods.js';
import { DEFAULT_MEAL_SLOTS, buildCoachNutritionPlan, addMealSlot, removeMealSlot, analyzeNutritionTrend, analyzeNutritionPatterns, comboCategoryForSlot, comboTemplateCount, buildFoodCombo } from './coachData.js';
import { buildCalendarGrid, MONTH_NAMES } from './calendar.js';

let currentUser = null;
let currentProfile = null;
let mealsCache = [];
let customFoodsCache = [];
let frequentFoodsCache = [];

let selectedProduct = null;
let html5QrCode = null;
let searchDebounceTimer = null;
let searchRequestId = 0; // Schutz gegen veraltete Suchantworten, die neuere überschreiben
let activeNTab = 'today';
let preselectedSlotId = null; // Slot, der beim Öffnen des Modals per '+' vorausgewählt wurde
let burnedEntry = null; // aktueller {id, burned_kcal, burned_source} Datensatz für heute
let waterEntry = null; // aktueller {id, water_ml} Datensatz für heute (Tageswert, nicht pro Mahlzeit)
let nutrCalYear = new Date().getFullYear();
let nutrCalMonth = new Date().getMonth(); // 0-11
let nutrCalDataCache = {};

export function initNutritionModule(user, profile) {
  currentUser = user;
  currentProfile = profile;
  // Einmalig laden, damit sie ab der ersten Suche verfügbar sind - nicht
  // kritisch für den restlichen App-Start, daher fire-and-forget mit
  // stillem Fehlschlag (Suche funktioniert auch ohne eigene Lebensmittel).
  getCustomFoods(user.id).then((foods) => { customFoodsCache = foods; }).catch(() => {});
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
  burnedEntry = await getBurnedCaloriesForToday(currentUser.id).catch(() => null);
  const burnedKcal = burnedEntry?.burned_kcal || 0;
  waterEntry = await getWaterForToday(currentUser.id).catch(() => null);
  const waterMl = waterEntry?.water_ml || 0;

  const t = mealTotals(mealsCache);
  const m = {
    kcal: (currentProfile.macro_kcal || 2000) + burnedKcal,
    protein: currentProfile.macro_protein || 150,
    carbs: currentProfile.macro_carbs || 200,
    fat: currentProfile.macro_fat || 60,
    // Persönliches Ziel aus Profil -> Ziele & Makros, sonst allgemeine
    // Ernährungsempfehlung (DGE u.a.: ~30g/Tag für Erwachsene) als Fallback
    // für Profile ohne gesetztes Ballaststoff-Ziel.
    fiber: currentProfile.macro_fiber || 30,
  };

  // Eingabefelder mit aktuellem Stand befüllen
  const waterInput = document.getElementById('water-ml-input');
  if (waterInput) waterInput.value = waterMl || '';
  updateWaterLitersDisplay(waterMl);

  document.getElementById('nutr-sub').textContent = burnedKcal
    ? `Ziel: ${currentProfile.macro_kcal || 2000} kcal + ${burnedKcal} verbrannt`
    : `Ziel: ${m.kcal} kcal`;
  document.getElementById('nutr-card').innerHTML = `
    <div class="row" style="margin-bottom:14px">
      <div><div style="font-size:28px;font-weight:900;letter-spacing:-1px">${t.cal}</div>
      <div style="font-size:12px;color:var(--sub)">von ${m.kcal} kcal${burnedKcal ? ` <span style="color:var(--green)">(+${burnedKcal} verbrannt)</span>` : ''}</div></div>
      ${ringHTML(76, 9, Math.min((t.cal / m.kcal) * 100, 100), 'var(--orange)', Math.round((t.cal / m.kcal) * 100) + '%')}
    </div>
    ${pbar('Protein ' + t.protein + 'g / ' + m.protein + 'g', t.protein, m.protein, 'var(--accent)')}
    ${pbar('Kohlenhydrate ' + t.carbs + 'g / ' + m.carbs + 'g', t.carbs, m.carbs, 'var(--green)')}
    ${pbar('Fett ' + t.fat + 'g / ' + m.fat + 'g', t.fat, m.fat, 'var(--orange)')}
    ${pbar('Ballaststoffe ' + t.fiber + 'g / ' + m.fiber + 'g', t.fiber, m.fiber, 'var(--blue)')}`;

  await renderTrendInsights(m);
  renderMealsBySlot();
  if (activeNTab === 'coach') renderCoachNutritionPlan();
}

// ── VERBRANNTE KALORIEN (manuell erfasst) ────────────────────────────────
// ── VERBRANNTE KALORIEN ───────────────────────────────────────────────────
// Eingabemöglichkeit lebt jetzt ausschließlich auf dem Start-Bildschirm
// (siehe app.js) - hier in Ernährung wird burnedEntry nur noch gelesen, um
// das Tagesziel entsprechend anzupassen (siehe renderNutrition oben).

// ── WASSER (Tageswert, manuell erfasst) ──────────────────────────────────
function updateWaterLitersDisplay(ml) {
  const el = document.getElementById('water-liters-display');
  if (el) el.textContent = (ml / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' l';
}

// ±250ml über die Stepper-Buttons - speichert sofort (kein Extra-Klick
// nötig), da schnelles Antippen beim Trinken der Hauptanwendungsfall ist.
export function stepWater(deltaMl) {
  const input = document.getElementById('water-ml-input');
  const cur = Math.max(0, parseInt(input.value) || 0);
  input.value = Math.max(0, cur + deltaMl);
  saveWater();
}

// Manuelle Eingabe wird erst per Bestätigungs-Button gespeichert (wie bei
// den verbrannten Kalorien), damit nicht bei jedem Tastendruck ein
// API-Call ausgelöst wird.
export async function saveWater() {
  const ml = Math.max(0, parseInt(document.getElementById('water-ml-input').value) || 0);
  try {
    assertOnline();
    waterEntry = await setWaterForToday(currentUser.id, ml, waterEntry?.id);
    updateWaterLitersDisplay(ml);
    showToast('✅ Wasser gespeichert');
  } catch (e) {
    console.error('saveWater error:', e);
    showToast('⚠️ Wasser speichern fehlgeschlagen');
  }
}

// ── TREND-INSIGHTS (datengetriebener Coach) ──────────────────────────────
// Ziel-Abweichungen (kcal/Protein vs. Tagesziel) werden bewusst NUR EINMAL
// PRO TAG bewertet (in analyzeNutritionTrend, Basis: 7-Tage-Durchschnitt der
// Tagessummen) - nicht mehr zusätzlich pro Mahlzeiten-Slot. Die Slot-Analyse
// liefert ergänzend nur noch Verhaltens-Muster (z.B. häufig gegessene
// Lebensmittel je Slot), keine eigene Ziel-Bewertung mehr.
// Zeigt die Analysen nacheinander als Karussell (alle 12 Sekunden), statt
// alle gleichzeitig gestapelt - vorher wirkte die Seite bei mehreren
// zutreffenden Analysen überladen.
let insightsCarouselTimer = null;
let insightsCarouselItems = [];
let insightsCarouselIndex = 0;

async function renderTrendInsights(dailyMacros) {
  const el = document.getElementById('nutr-insights');
  if (insightsCarouselTimer) { clearInterval(insightsCarouselTimer); insightsCarouselTimer = null; }
  try {
    const [history, weightHistory, mealsBySlot] = await Promise.all([
      getMealHistoryAggregated(currentUser.id, 14),
      getWeightHistoryForTrend(currentUser.id, 21),
      getMealsBySlotHistory(currentUser.id, 14),
    ]);
    const goal = currentProfile.goals?.[0] || 'health';
    const insights = analyzeNutritionTrend(history, weightHistory, dailyMacros, goal);
    const patterns = analyzeNutritionPatterns(mealsBySlot);
    insightsCarouselItems = [...insights, ...patterns.insights];
    insightsCarouselIndex = 0;

    if (!insightsCarouselItems.length) { el.innerHTML = ''; return; }
    renderInsightSlide();

    // Nur ein Intervall starten, wenn es überhaupt mehr als eine Analyse
    // zum Durchwechseln gibt.
    if (insightsCarouselItems.length > 1) {
      insightsCarouselTimer = setInterval(() => {
        insightsCarouselIndex = (insightsCarouselIndex + 1) % insightsCarouselItems.length;
        renderInsightSlide();
      }, 12000);
    }
  } catch (e) {
    el.innerHTML = '';
  }
}

function renderInsightSlide() {
  const el = document.getElementById('nutr-insights');
  if (!el || !insightsCarouselItems.length) return;
  const txt = insightsCarouselItems[insightsCarouselIndex];
  const dots = insightsCarouselItems.length > 1
    ? `<div style="display:flex;gap:5px;margin-top:8px">${insightsCarouselItems.map((_, i) =>
        `<span style="width:6px;height:6px;border-radius:50%;background:${i === insightsCarouselIndex ? 'var(--accent2)' : 'var(--border)'}"></span>`).join('')}</div>`
    : '';
  el.innerHTML = `<div class="coach-tip"><div class="ct-icon">🏆</div><div><div class="ct-lbl">COACH-ANALYSE</div><div class="ct-txt">${txt}</div>${dots}</div></div>`;
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
    const hasData = meals.length > 0;
    return `<div class="day-card" style="margin-bottom:10px">
      <div class="row" style="align-items:center;margin-bottom:${hasData ? '10px' : '0'}">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px">
            <div class="day-name">${slot.label}</div>
            <button data-rename-slot="${slot.id}" style="width:22px;height:22px;border-radius:6px;border:none;background:transparent;color:var(--sub);font-size:12px;cursor:pointer;flex-shrink:0;padding:0">✏️</button>
          </div>
          <div style="font-size:13px;font-weight:800;color:var(--orange);margin-top:2px">${slotTotal.cal} kcal</div>
          ${hasData ? macroLegendHTML(slotTotal.protein, slotTotal.carbs, slotTotal.fat) : ''}
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          ${hasData ? macroDonutHTML(slotTotal.protein, slotTotal.carbs, slotTotal.fat) : ''}
          <button data-add-to-slot="${slot.id}" style="width:32px;height:32px;border-radius:10px;border:none;background:var(--accentBg);color:var(--accent2);font-size:18px;font-weight:700;cursor:pointer;flex-shrink:0">+</button>
        </div>
      </div>
      ${meals.length ? meals.map((ml) => mealRowHTML(ml)).join('') : `<div style="font-size:12px;color:var(--muted);padding:4px 0 0">Noch nichts eingetragen</div>`}
    </div>`;
  }).join('');

  if (unassigned.length) {
    html += `<div class="day-card" style="margin-bottom:10px;border-left:3px solid var(--muted)">
      <div class="day-hdr"><div class="day-name">Ohne Zuordnung</div></div>
      ${unassigned.map((ml) => mealRowHTML(ml)).join('')}
    </div>`;
  }

  // Neue Mahlzeit (Slot) hinzufügen - inline direkt an Ort und Stelle statt
  // über ein separates Verwaltungs-Modal. Startet als schlichter Button,
  // verwandelt sich beim Antippen in ein Eingabefeld.
  html += `<div style="margin-bottom:10px">
    <button id="btn-show-add-slot" style="width:100%;padding:14px;border:2px dashed var(--border);border-radius:14px;background:transparent;color:var(--accent2);font-weight:700;font-size:14px;cursor:pointer">+ Mahlzeit hinzufügen</button>
    <div id="add-slot-input-row" class="row" style="gap:8px;display:none">
      <input id="new-slot-name-input" class="oi" type="text" placeholder="z.B. Snack 3" style="flex:1">
      <button id="btn-confirm-add-slot" style="background:var(--accentBg);border:1px solid var(--accentBd);border-radius:11px;padding:0 16px;color:var(--accent2);font-weight:700;cursor:pointer;flex-shrink:0">✓</button>
      <button id="btn-cancel-add-slot" style="background:var(--surface);border:none;border-radius:11px;padding:0 16px;color:var(--sub);cursor:pointer;flex-shrink:0">✕</button>
    </div>
  </div>`;

  document.getElementById('meal-list').innerHTML = html;

  document.querySelectorAll('[data-edit-meal]').forEach((btn) => {
    btn.addEventListener('click', () => openEditMeal(btn.dataset.editMeal));
  });
  document.querySelectorAll('[data-del-meal]').forEach((btn) => {
    btn.addEventListener('click', () => confirmDeleteMeal(btn.dataset.delMeal));
  });
  document.querySelectorAll('[data-add-to-slot]').forEach((btn) => {
    btn.addEventListener('click', () => openMealModalForSlot(btn.dataset.addToSlot));
  });
  document.querySelectorAll('[data-rename-slot]').forEach((btn) => {
    btn.addEventListener('click', () => openSlotRename(btn.dataset.renameSlot));
  });

  document.getElementById('btn-show-add-slot')?.addEventListener('click', () => {
    document.getElementById('btn-show-add-slot').style.display = 'none';
    document.getElementById('add-slot-input-row').style.display = 'flex';
    document.getElementById('new-slot-name-input').focus();
  });
  document.getElementById('btn-cancel-add-slot')?.addEventListener('click', () => {
    document.getElementById('btn-show-add-slot').style.display = '';
    document.getElementById('add-slot-input-row').style.display = 'none';
  });
  document.getElementById('btn-confirm-add-slot')?.addEventListener('click', confirmAddSlot);
  document.getElementById('new-slot-name-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmAddSlot();
  });
}

// Öffnet das Mahlzeit-Modal mit einem bereits vorausgewählten Slot - so
// landet man z.B. beim Antippen von "+" bei "Frühstück" direkt in der Suche
// und die Auswahl wird automatisch dem Frühstück zugeordnet.
export function openMealModalForSlot(slotId) {
  preselectedSlotId = slotId;
  calendarDayContext = null;
  resetMealModal();
  document.querySelector('#mo-meal .mt').textContent = 'Mahlzeit eintragen';
  openMo('mo-meal');
}

// Wie openMealModalForSlot, aber zum nachträglichen Hinzufügen aus der
// Kalender-Tagesansicht heraus (Punkt 2) - behält calendarDayContext bei,
// damit die neue Mahlzeit mit DIESEM Datum statt "jetzt" gespeichert wird
// (siehe measuredAtOverride in saveMealFromModal/saveSelectedProduct).
export function openMealModalForSlotOnDate(slotId) {
  preselectedSlotId = slotId;
  resetMealModal();
  document.querySelector('#mo-meal .mt').textContent = 'Mahlzeit eintragen';
  // mo-nutrition-review liegt im DOM NACH mo-meal und damit bei gleichem
  // z-index optisch darüber - ohne dieses Schließen würde sich mo-meal
  // unsichtbar dahinter öffnen und auf Eingaben nicht reagieren.
  closeMo('mo-nutrition-review');
  openMo('mo-meal');
}

// Zeichnet ein kompaktes Mehrfarben-Ring-Diagramm für die Makro-Verteilung
// (Protein/Kohlenhydrate/Fett) einer Mahlzeitengruppe. Bewusst schlicht und
// ohne verspielte Effekte gehalten - passt zum restlichen Coach-Design.
function macroDonutHTML(protein, carbs, fat, size = 56) {
  const pCal = protein * 4, cCal = carbs * 4, fCal = fat * 9;
  const total = pCal + cCal + fCal;
  if (total <= 0) {
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;border:2px dashed var(--border);flex-shrink:0"></div>`;
  }

  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pPct = pCal / total, cPct = cCal / total, fPct = fCal / total;

  const pLen = circ * pPct;
  const cLen = circ * cPct;
  const fLen = circ * fPct;

  // Farben konsistent mit den bestehenden Makro-Farben im Rest der App
  const pColor = 'var(--accent)';
  const cColor = 'var(--green)';
  const fColor = 'var(--orange)';

  return `<div style="position:relative;width:${size}px;height:${size}px;flex-shrink:0">
    <svg width="${size}" height="${size}" style="transform:rotate(-90deg)">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--border)" stroke-width="${stroke}"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${fColor}" stroke-width="${stroke}"
        stroke-dasharray="${circ}" stroke-dashoffset="0" stroke-linecap="butt"
        style="opacity:0.9" />
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${cColor}" stroke-width="${stroke}"
        stroke-dasharray="${cLen + pLen} ${circ}" stroke-dashoffset="0" stroke-linecap="butt" />
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${pColor}" stroke-width="${stroke}"
        stroke-dasharray="${pLen} ${circ}" stroke-dashoffset="0" stroke-linecap="butt" />
    </svg>
  </div>`;
}

function macroLegendHTML(protein, carbs, fat) {
  const pCal = protein * 4, cCal = carbs * 4, fCal = fat * 9;
  const total = pCal + cCal + fCal || 1;
  const pPct = Math.round((pCal / total) * 100);
  const cPct = Math.round((cCal / total) * 100);
  const fPct = Math.round((fCal / total) * 100);

  const row = (color, label, grams, pct) => `
    <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--sub);margin-top:3px">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></span>
      <span style="flex:1 1 auto;min-width:88px">${label}</span>
      <span style="color:var(--text);font-weight:700;flex-shrink:0">${grams}g</span>
      <span style="color:var(--muted);flex-shrink:0;width:34px;text-align:right">${pct}%</span>
    </div>`;

  return `<div style="margin-top:6px">
    ${row('var(--accent)', 'Protein', protein, pPct)}
    ${row('var(--green)', 'Kohlenhydrate', carbs, cPct)}
    ${row('var(--orange)', 'Fett', fat, fPct)}
  </div>`;
}

function mealRowHTML(ml, readOnly = false) {
  return `<div class="card" style="margin-bottom:8px">
    <div class="row" style="align-items:flex-start">
      <div style="flex:1">
        <div style="font-size:10px;color:var(--sub);font-weight:700;margin-bottom:3px">${new Date(ml.measured_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
        <div style="font-size:14px;font-weight:700">${ml.meal_name}</div>
        <div style="display:flex;gap:10px;margin-top:4px;flex-wrap:wrap">
          <span style="font-size:11px;color:var(--sub)">P: ${ml.protein_g}g</span>
          <span style="font-size:11px;color:var(--sub)">K: ${ml.carbs_g}g</span>
          <span style="font-size:11px;color:var(--sub)">F: ${ml.fat_g}g</span>
          ${ml.fiber_g ? `<span style="font-size:11px;color:var(--sub)">B: ${ml.fiber_g}g</span>` : ''}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;margin-left:8px">
        <div style="font-size:16px;font-weight:900;color:var(--orange);margin-bottom:6px">${ml.kcal} kcal</div>
        ${!readOnly ? `<div style="display:flex;gap:5px">
          <button class="edit-btn" data-edit-meal="${ml.id}">✏️</button>
          <button class="del-btn" data-del-meal="${ml.id}">✕</button>
        </div>` : ''}
      </div>
    </div>
  </div>`;
}

// ── MAHLZEIT BEARBEITEN ──────────────────────────────────────────────────
// Hält fest, ob gerade ein vergangener Kalendertag betrachtet wird (dann
// sind Bearbeiten/Löschen auf DESSEN Daten bezogen und die Tagesansicht
// selbst wird danach neu geladen) oder "Heute" (Normalfall).
let calendarDayContext = null; // { dateStr, meals } oder null

function findMealAnywhere(mealId) {
  return mealsCache.find((m) => m.id === mealId)
    || (calendarDayContext?.meals || []).find((m) => m.id === mealId);
}

function openEditMeal(mealId) {
  const meal = findMealAnywhere(mealId);
  if (!meal) return;
  resetMealModal();
  switchMealTab('manual');
  document.getElementById('mn-name').value = meal.meal_name;
  document.getElementById('mn-cal').value = meal.kcal;
  document.getElementById('mn-p').value = meal.protein_g;
  document.getElementById('mn-c').value = meal.carbs_g;
  document.getElementById('mn-f').value = meal.fat_g;
  document.getElementById('mn-fiber').value = meal.fiber_g || '';
  document.getElementById('mn-edit-id').value = meal.id;
  populateSlotSelect('mn-slot-select', meal.meal_slot_id);
  document.querySelector('#mo-meal .mt').textContent = 'Mahlzeit bearbeiten';
  // Siehe openMealModalForSlotOnDate: ohne dieses Schließen würde sich
  // mo-meal beim Bearbeiten aus der Kalender-Tagesansicht heraus unsichtbar
  // hinter dem noch offenen mo-nutrition-review öffnen.
  closeMo('mo-nutrition-review');
  openMo('mo-meal');
}

async function confirmDeleteMeal(mealId) {
  if (!(await confirmDialog('Diese Mahlzeit wirklich löschen?'))) return;
  try {
    assertOnline();
    await deleteMeal(mealId);
    // Bei Bearbeitung aus dem Kalender heraus die betrachtete Tagesansicht
    // selbst neu laden - sonst würde fälschlich "Heute" aktualisiert.
    if (calendarDayContext) await showNutritionForDate(calendarDayContext.dateStr);
    else await renderNutrition();
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
  document.getElementById('ntab-calendar').classList.toggle('active', tab === 'calendar');
  document.getElementById('nv-today').style.display = tab === 'today' ? '' : 'none';
  document.getElementById('nv-coach').style.display = tab === 'coach' ? '' : 'none';
  document.getElementById('nv-calendar').style.display = tab === 'calendar' ? '' : 'none';
  // Coach-Analyse ergibt im Kalender (vergangene Tage) keinen Sinn - dort
  // nur bei "Heute"/"Coach-Plan" zeigen, Karussell währenddessen pausieren.
  document.getElementById('nutr-insights').style.display = tab === 'calendar' ? 'none' : '';
  if (tab === 'calendar' && insightsCarouselTimer) { clearInterval(insightsCarouselTimer); insightsCarouselTimer = null; }
  else if (tab !== 'calendar' && insightsCarouselItems.length > 1 && !insightsCarouselTimer) {
    insightsCarouselTimer = setInterval(() => {
      insightsCarouselIndex = (insightsCarouselIndex + 1) % insightsCarouselItems.length;
      renderInsightSlide();
    }, 12000);
  }
  if (tab === 'coach') renderCoachNutritionPlan();
  if (tab === 'calendar') renderNutritionCalendar();
}

// ── EINGEBETTETER KALENDER (gleichrangiger Tab, kein Liste/Kalender-Toggle
// mehr innerhalb "Heute" - das duplizierte vorher "Heute" und "Liste", da
// beide dieselbe Mahlzeitenliste zeigten). Nutzt dieselbe gemeinsame
// Grid-Engine (buildCalendarGrid aus calendar.js) wie Workout > Verlauf.
// Ein Tag-Klick führt DIREKT und EINMALIG zur Tagesansicht
// (mo-nutrition-review) - kein Kalender-Modal, das erst geschlossen werden
// müsste, um zur eigentlichen Ansicht zu gelangen.
async function renderNutritionCalendar() {
  document.getElementById('ncal-month-label').textContent = `${MONTH_NAMES[nutrCalMonth]} ${nutrCalYear}`;
  document.getElementById('ncal-grid').innerHTML = `<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px">Lädt...</div>`;

  const fromDate = new Date(nutrCalYear, nutrCalMonth, 1).toISOString();
  const toDate = new Date(nutrCalYear, nutrCalMonth + 1, 0, 23, 59, 59).toISOString();
  try {
    nutrCalDataCache = await getCalendarData(currentUser.id, fromDate, toDate);
  } catch (e) {
    nutrCalDataCache = {};
  }

  document.getElementById('ncal-grid').innerHTML = buildCalendarGrid(nutrCalYear, nutrCalMonth, (dateStr) => {
    if (!nutrCalDataCache[dateStr]?.hasMeals) return { clickable: false };
    return { icons: ['🥗'], clickable: true };
  });

  document.querySelectorAll('#ncal-grid [data-cal-day]').forEach((el) => {
    el.addEventListener('click', () => showNutritionForDate(el.dataset.calDay));
  });
}

export function nutritionCalPrevMonth() {
  nutrCalMonth--;
  if (nutrCalMonth < 0) { nutrCalMonth = 11; nutrCalYear--; }
  renderNutritionCalendar();
}

export function nutritionCalNextMonth() {
  nutrCalMonth++;
  if (nutrCalMonth > 11) { nutrCalMonth = 0; nutrCalYear++; }
  renderNutritionCalendar();
}

// Merkt sich pro Slot, welche Lebensmittel-Kombination gerade angezeigt wird
// (per "Andere Kombination"-Button durchwechselbar) - rein clientseitig,
// kein Speicherbedarf, wird beim Verlassen des Tabs zurückgesetzt.
let coachComboIndex = {};

function renderCoachNutritionPlan() {
  const dailyMacros = {
    kcal: currentProfile.macro_kcal || 2000,
    protein: currentProfile.macro_protein || 150,
    carbs: currentProfile.macro_carbs || 200,
    fat: currentProfile.macro_fat || 60,
    fiber: currentProfile.macro_fiber || 30,
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
        <div class="row" style="align-items:center">
          <div style="flex:1">
            <div class="day-name">${slot.label}</div>
            <div style="font-size:13px;font-weight:800;color:var(--orange);margin-top:2px">${slot.kcal} kcal</div>
            ${macroLegendHTML(slot.protein, slot.carbs, slot.fat)}
            <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--sub);margin-top:3px">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--blue);flex-shrink:0"></span>
              <span style="flex:1 1 auto;min-width:88px">Ballaststoffe</span>
              <span style="color:var(--text);font-weight:700;flex-shrink:0">${slot.fiber}g</span>
            </div>
          </div>
          ${macroDonutHTML(slot.protein, slot.carbs, slot.fat)}
        </div>
        ${foodComboHTML(slot)}
      </div>`).join('')}`;

  document.querySelectorAll('[data-combo-shuffle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const slotId = btn.dataset.comboShuffle;
      coachComboIndex[slotId] = (coachComboIndex[slotId] || 0) + 1;
      renderCoachNutritionPlan();
    });
  });
}

// Zeigt zum Makro-Vorschlag eines Slots eine konkrete Lebensmittel-
// Kombination mit Grammangaben (siehe buildFoodCombo in coachData.js).
function foodComboHTML(slot) {
  const category = comboCategoryForSlot(slot);
  const templateCount = comboTemplateCount(category);
  const index = coachComboIndex[slot.id] || 0;
  const combo = buildFoodCombo({ protein: slot.protein, carbs: slot.carbs, fat: slot.fat }, category, index);
  if (!combo) return '';

  return `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
    ${combo.items.map((it) => `
      <div class="row" style="align-items:center;margin-bottom:4px">
        <div style="flex:1;font-size:12px">${it.name} <span style="color:var(--sub)">· ${it.grams}g</span></div>
        <div style="font-size:11px;color:var(--sub);flex-shrink:0">${it.kcal} kcal</div>
      </div>`).join('')}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
      <div style="font-size:10px;color:var(--muted)">≈ ${combo.totals.kcal} kcal · P ${combo.totals.protein}g · K ${combo.totals.carbs}g · F ${combo.totals.fat}g · B ${combo.totals.fiber}g</div>
      ${templateCount > 1 ? `<button data-combo-shuffle="${slot.id}" style="border:none;background:transparent;color:var(--accent2);font-size:11px;font-weight:700;cursor:pointer;padding:2px 4px">🔀 Andere Kombination</button>` : ''}
    </div>
  </div>`;
}

// ── SLOT-VERWALTUNG (Umbenennen/Hinzufügen/Entfernen je einzelnem Slot) ──
// Ersetzt das frühere Sammel-Verwaltungs-Modal: jede Mahlzeit hat jetzt ihr
// eigenes Stift- (umbenennen) und X-Symbol (löschen), neue Mahlzeiten werden
// direkt inline am Ende der Liste hinzugefügt (siehe renderMealsBySlot).
let renamingSlotId = null;

export function openSlotRename(slotId) {
  const slot = getSlots().find((s) => s.id === slotId);
  if (!slot) return;
  renamingSlotId = slotId;
  document.getElementById('slot-rename-input').value = slot.label;
  openMo('mo-slot-rename');
}

export async function saveSlotRename() {
  const newLabel = document.getElementById('slot-rename-input').value.trim();
  if (!newLabel) { showToast('⚠️ Name darf nicht leer sein'); return; }
  try {
    assertOnline();
    const slots = getSlots().map((s) => (s.id === renamingSlotId ? { ...s, label: newLabel } : s));
    const updated = await updateProfile(currentUser.id, { meal_slots: slots });
    currentProfile = updated;
    closeMo('mo-slot-rename');
    await renderNutrition();
    showToast('✅ Umbenannt');
  } catch (e) {
    showToast('⚠️ Speichern fehlgeschlagen');
  }
}

// X-Button im selben Modal - konsistent an einer Stelle statt eines
// zusätzlichen Symbols direkt in der Mahlzeitenliste.
export async function deleteSlotFromRenameModal() {
  if (getSlots().length <= 1) { showToast('Mindestens eine Mahlzeit muss bestehen bleiben'); return; }
  if (!(await confirmDialog('Diese Mahlzeit wirklich löschen? Bereits eingetragene Lebensmittel bleiben erhalten, aber ohne Zuordnung.'))) return;
  try {
    assertOnline();
    const slots = removeMealSlot(getSlots(), renamingSlotId);
    const updated = await updateProfile(currentUser.id, { meal_slots: slots });
    currentProfile = updated;
    closeMo('mo-slot-rename');
    await renderNutrition();
    showToast('Mahlzeit gelöscht');
  } catch (e) {
    showToast('⚠️ Löschen fehlgeschlagen');
  }
}

async function confirmAddSlot() {
  const name = document.getElementById('new-slot-name-input').value.trim();
  if (!name) return;
  try {
    assertOnline();
    const slots = addMealSlot(getSlots(), name);
    const updated = await updateProfile(currentUser.id, { meal_slots: slots });
    currentProfile = updated;
    await renderNutrition();
    showToast('✅ Mahlzeit hinzugefügt');
  } catch (e) {
    showToast('⚠️ Hinzufügen fehlgeschlagen');
  }
}

function populateSlotSelect(selectId, currentSlotId) {
  const select = document.getElementById(selectId);
  const slots = getSlots();
  select.innerHTML = slots.map((s) => `<option value="${s.id}" ${s.id === currentSlotId ? 'selected' : ''}>${s.label}</option>`).join('');
}

// ── MODAL: TAB-STEUERUNG (Suche / Scannen / Manuell) ────────────────────
function resetMealModal() {
  switchMealTab('search');
  document.getElementById('food-search-input').value = '';
  document.getElementById('food-search-brand-input').value = '';
  document.getElementById('food-search-results').innerHTML = '';
  document.getElementById('food-search-status').style.display = 'none';
  document.getElementById('mn-edit-id').value = '';
  ['mn-name', 'mn-cal', 'mn-p', 'mn-c', 'mn-f', 'mn-fiber'].forEach((id) => (document.getElementById(id).value = ''));
  document.getElementById('mn-save-generic').checked = false;
  document.getElementById('mn-generic-grams').value = '100';
  document.getElementById('mn-generic-grams-wrap').style.display = 'none';
  populateSlotSelect('mn-slot-select', preselectedSlotId);
  selectedProduct = null;
  stopScanner();
  loadAndShowFrequentFoods();
}

// ── HÄUFIG VERWENDETE LEBENSMITTEL ────────────────────────────────────────
// Zeigt die 10 häufigsten Lebensmittel der letzten 30 Tage direkt beim
// Öffnen der Suche - noch bevor überhaupt etwas eingetippt wurde. Erspart
// bei wiederkehrenden Mahlzeiten das erneute Suchen/Eintippen.
async function loadAndShowFrequentFoods() {
  const el = document.getElementById('food-frequent-list');
  if (!el) return;
  try {
    frequentFoodsCache = await getFrequentFoods(currentUser.id, 30, 10);
  } catch (e) {
    frequentFoodsCache = [];
  }
  renderFrequentFoods();
}

function renderFrequentFoods() {
  const wrap = document.getElementById('food-frequent-wrap');
  const el = document.getElementById('food-frequent-list');
  if (!wrap || !el) return;
  if (!frequentFoodsCache.length) { wrap.style.display = 'none'; return; }

  wrap.style.display = '';
  el.innerHTML = frequentFoodsCache.map((f, i) => `
    <div class="card" data-frequent-idx="${i}" style="margin-bottom:8px;cursor:pointer;padding:12px 14px">
      <div class="row">
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700">${f.name}</div>
          <div style="font-size:11px;color:var(--sub);margin-top:1px">Häufig verwendet</div>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:8px">
          <div style="font-size:14px;font-weight:800;color:var(--orange)">${f.kcal}</div>
          <div style="font-size:10px;color:var(--sub)">kcal${f.grams ? ` / ${f.grams}g` : ''}</div>
        </div>
      </div>
    </div>`).join('');

  el.querySelectorAll('[data-frequent-idx]').forEach((card) => {
    card.addEventListener('click', () => {
      const f = frequentFoodsCache[parseInt(card.dataset.frequentIdx)];
      selectProduct(frequentFoodToProduct(f), f.grams && f.grams > 0 ? f.grams : 100);
    });
  });
}

// Rechnet ein häufig verwendetes Lebensmittel (absolute Werte für die
// zuletzt verwendete Grammzahl) auf "pro 100g" zurück, damit es dieselbe
// Form wie Such-/generische/eigene Ergebnisse hat und denselben
// Grammzahl-Anpassungs-Dialog nutzen kann.
function frequentFoodToProduct(f) {
  const grams = f.grams && f.grams > 0 ? f.grams : 100;
  const factor = 100 / grams;
  return {
    id: `frequent_${f.name.toLowerCase().replace(/[^a-zäöüß0-9]+/g, '_')}`,
    name: f.name,
    brand: 'Häufig verwendet',
    imageUrl: null,
    per100: {
      kcal: Math.round(f.kcal * factor),
      protein: Math.round((f.protein || 0) * factor * 10) / 10,
      carbs: Math.round((f.carbs || 0) * factor * 10) / 10,
      fat: Math.round((f.fat || 0) * factor * 10) / 10,
      fiber: Math.round((f.fiber || 0) * factor * 10) / 10,
    },
  };
}

// Blendet das Mengenfeld nur ein, wenn "Als eigenes Lebensmittel speichern"
// aktiviert ist - hält das Formular im Normalfall kompakt.
export function toggleSaveGenericGrams() {
  const checked = document.getElementById('mn-save-generic').checked;
  document.getElementById('mn-generic-grams-wrap').style.display = checked ? '' : 'none';
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
// Liest Produktname (Pflicht, min. 3 Zeichen) und Hersteller (optional) aus
// den beiden getrennten Feldern - beide Felder lösen dieselbe Suche aus.
// Durchsucht die eigenen, vom Nutzer gespeicherten Lebensmittel (Cache aus
// initNutritionModule) - gleiche Teilstring-Logik wie bei den generischen
// Grundnahrungsmitteln, damit z.B. Mehrzahlformen ebenfalls treffen.
function searchCustomFoods(query) {
  const q = (query || '').trim();
  if (q.length < 2) return [];
  return customFoodsCache
    .filter((f) => matchesQuery(f.name, q))
    .map((f) => ({
      id: `custom_${f.id}`,
      name: f.name,
      brand: 'Eigenes Lebensmittel',
      imageUrl: null,
      per100: { kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, fiber: f.fiber || 0 },
    }));
}

export function onFoodSearchInput() {
  clearTimeout(searchDebounceTimer);
  const statusEl = document.getElementById('food-search-status');
  const resultsEl = document.getElementById('food-search-results');
  const query = document.getElementById('food-search-input').value;
  const brand = document.getElementById('food-search-brand-input')?.value || '';

  if (!query || query.trim().length < 2) {
    resultsEl.innerHTML = '';
    statusEl.style.display = 'none';
    renderFrequentFoods(); // Suchfeld leer -> häufig verwendete Lebensmittel wieder zeigen
    return;
  }

  document.getElementById('food-frequent-wrap').style.display = 'none';
  statusEl.style.display = 'block';
  statusEl.textContent = '🔍 Suche läuft...';

  const thisRequestId = ++searchRequestId;

  searchDebounceTimer = setTimeout(async () => {
    try {
      // Eigene Lebensmittel zuerst (lokal, aus dem Cache, kein Netzwerk
      // nötig) - dann generische Grundnahrungsmittel + Open Food Facts
      // (beides bereits in searchFoodByName kombiniert).
      const customMatches = brand ? [] : searchCustomFoods(query);
      const results = [...customMatches, ...(await searchFoodByName(query, 20, brand))];
      // Nur rendern, wenn zwischenzeitlich keine neuere Suche gestartet wurde -
      // verhindert, dass eine langsame ältere Antwort eine neuere überschreibt
      // und die Oberfläche dadurch "hängen" lässt.
      if (thisRequestId !== searchRequestId) return;
      renderFoodResults(results);
      statusEl.style.display = results.length ? 'none' : 'block';
      if (!results.length) statusEl.textContent = 'Keine Treffer gefunden. Versuch einen anderen Suchbegriff oder trage es manuell ein.';
    } catch (err) {
      if (thisRequestId !== searchRequestId) return;
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
function selectProduct(product, defaultGrams = 100) {
  selectedProduct = product;
  document.getElementById('mv-search').style.display = 'none';
  document.getElementById('mv-scan').style.display = 'none';
  document.getElementById('mv-manual').style.display = 'none';
  document.getElementById('mv-product-detail').style.display = '';

  document.getElementById('product-detail-card').innerHTML = `
    <div style="font-size:15px;font-weight:800">${product.name}</div>
    ${product.brand ? `<div style="font-size:12px;color:var(--sub);margin-top:2px">${product.brand}</div>` : ''}
    <div style="font-size:11px;color:var(--muted);margin-top:6px">Pro 100g: ${product.per100.kcal} kcal · P ${product.per100.protein}g · K ${product.per100.carbs}g · F ${product.per100.fat}g</div>`;

  document.getElementById('food-grams').value = String(defaultGrams);
  populateSlotSelect('food-slot-select', preselectedSlotId);
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
      cal: scaled.kcal, protein: scaled.protein, carbs: scaled.carbs, fat: scaled.fat, fiber: scaled.fiber,
      type: 'Mahlzeit', slotId, foodId: selectedProduct.id, grams,
      measuredAtOverride: calendarDayContext ? calendarDayContext.dateStr + 'T12:00:00' : undefined,
    });
    closeMo('mo-meal');
    if (calendarDayContext) await showNutritionForDate(calendarDayContext.dateStr);
    else await renderNutrition();
    showToast('✅ Mahlzeit gespeichert');
  } catch (err) {
    // Echte Fehlermeldung anzeigen statt generischem Text - hilft bei der
    // Diagnose, falls z.B. die Datenbank ein bestimmtes Format ablehnt.
    console.error('saveSelectedProduct error:', err);
    const detail = err.message?.includes('Internet') ? err.message : (err.message || 'Unbekannter Fehler');
    showToast(`⚠️ Speichern fehlgeschlagen: ${detail}`);
  }
}

// ── BARCODE-SCANNER ───────────────────────────────────────────────────────
// Performance-Optimierung: html5-qrcode versucht standardmäßig ALLE
// unterstützten Formate (QR, Aztec, PDF417, ...) pro Frame zu dekodieren -
// das kostet Zeit, die bei Lebensmittel-Barcodes (immer EAN/UPC) verschwendet
// ist. Auf die tatsächlich relevanten Formate einzuschränken beschleunigt
// die Erkennung pro Frame spürbar. Zusätzlich werden höhere Auflösung und
// kontinuierlicher Autofokus angefordert (sofern vom Gerät unterstützt),
// was die Zeit bis zum scharfen Bild bei Nahaufnahmen (Barcode aus
// wenigen cm Entfernung) verkürzt.
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

    const qrcodeConfig = { verbose: false };
    // Nur Produkt-Barcode-Formate zulassen, falls die Library diese Konstante
    // bereitstellt (defensiv: Feature-Check statt harter Annahme).
    if (typeof Html5QrcodeSupportedFormats !== 'undefined') {
      qrcodeConfig.formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
      ];
    }
    html5QrCode = new Html5Qrcode('scanner-video', qrcodeConfig);

    await html5QrCode.start(
      {
        facingMode: 'environment',
        // Kontinuierlicher Autofokus + höhere Auflösung: reduziert die
        // "Scharfstell-Zeit" bei Nahaufnahmen. Wird von iOS Safari nicht
        // überall unterstützt - nicht unterstützte Constraints werden von
        // getUserMedia automatisch ignoriert, kein zusätzliches Fallback nötig.
        advanced: [{ focusMode: 'continuous' }],
      },
      {
        fps: 15,
        qrbox: { width: 260, height: 160 },
        disableFlip: false,
        videoConstraints: {
          facingMode: 'environment',
          focusMode: 'continuous',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      },
      async (decodedText) => {
        statusEl.textContent = '✅ Barcode erkannt, suche Produkt...';
        await onBarcodeDetected(decodedText);
      },
      () => {}
    );
    statusEl.textContent = 'Richte die Kamera ca. 10cm über den Barcode - ruhig halten für schnellen Fokus.';
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
  const protein = parseInt(document.getElementById('mn-p').value) || 0;
  const carbs = parseInt(document.getElementById('mn-c').value) || 0;
  const fat = parseInt(document.getElementById('mn-f').value) || 0;
  const fiberRaw = document.getElementById('mn-fiber').value;
  const fiber = fiberRaw ? parseInt(fiberRaw) || 0 : null;
  const payload = { name, cal, protein, carbs, fat, fiber, slotId };

  try {
    assertOnline();
    if (editId) {
      await updateMeal(editId, payload);
    } else {
      await addMeal(currentUser.id, {
        ...payload, type: 'Mahlzeit',
        measuredAtOverride: calendarDayContext ? calendarDayContext.dateStr + 'T12:00:00' : undefined,
      });
    }

    // Optional: als eigenes Lebensmittel für spätere Suchen speichern.
    // Die eingegebenen Werte beziehen sich auf die angegebene Menge (Default
    // 100g) und werden auf "pro 100g" umgerechnet, damit sie zum Schema der
    // generischen/OFF-Ergebnisse passen (scaleNutrients invers).
    const saveGeneric = document.getElementById('mn-save-generic')?.checked;
    if (saveGeneric) {
      const grams = Math.max(1, parseInt(document.getElementById('mn-generic-grams').value) || 100);
      const factor = 100 / grams;
      try {
        const newFood = await addCustomFood(currentUser.id, {
          name,
          kcal: Math.round(cal * factor),
          protein: Math.round(protein * factor * 10) / 10,
          carbs: Math.round(carbs * factor * 10) / 10,
          fat: Math.round(fat * factor * 10) / 10,
          fiber: fiber !== null ? Math.round(fiber * factor * 10) / 10 : null,
        });
        customFoodsCache = [newFood, ...customFoodsCache];
      } catch (e) {
        // Der Mahlzeit-Eintrag selbst hat bereits geklappt - ein Fehler beim
        // Speichern als wiederverwendbares Lebensmittel soll das nicht
        // überschatten, daher nur ein separater, klar unterscheidbarer Hinweis.
        showToast('⚠️ Mahlzeit gespeichert, aber nicht als eigenes Lebensmittel übernommen');
      }
    }

    closeMo('mo-meal');
    if (calendarDayContext) await showNutritionForDate(calendarDayContext.dateStr);
    else await renderNutrition();
    showToast('✅ Mahlzeit gespeichert');
  } catch (err) {
    showToast(err.message?.includes('Internet') ? err.message : '⚠️ Speichern fehlgeschlagen');
  }
}

export function getMealsCache() { return mealsCache; }

// ── RÜCKBLICK: MAHLZEITEN EINES VERGANGENEN TAGES (Sprung aus dem Kalender) ─
// Zeigt die Mahlzeiten dieses Tages jetzt nach Slot gruppiert (wie "Heute"),
// statt einer reinen Auflistung aller Lebensmittel - und sie lassen sich
// direkt hier bearbeiten/löschen (siehe calendarDayContext oben).
export function closeNutritionReview() {
  calendarDayContext = null;
  closeMo('mo-nutrition-review');
}

// Schließt das Eintragen/Bearbeiten-Modal - kehrt bei Aufruf aus der
// Kalender-Tagesansicht heraus (calendarDayContext gesetzt) wieder zu dieser
// zurück, statt den Nutzer unvermittelt auf der "Heute"-Ansicht landen zu
// lassen (relevant beim Abbrechen ohne zu speichern, siehe btn-close-meal-modal).
export function closeMealModal() {
  closeMo('mo-meal');
  if (calendarDayContext) openMo('mo-nutrition-review');
}

export async function showNutritionForDate(dateStr) {
  try {
    const meals = await getMealsForDate(currentUser.id, dateStr);
    calendarDayContext = { dateStr, meals };
    const t = mealTotals(meals);
    const dateLabel = new Date(dateStr + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });

    const slots = getSlots();
    const byslot = {};
    slots.forEach((s) => (byslot[s.id] = []));
    const unassigned = [];
    meals.forEach((meal) => {
      if (meal.meal_slot_id && byslot[meal.meal_slot_id]) byslot[meal.meal_slot_id].push(meal);
      else unassigned.push(meal);
    });

    let slotsHtml = slots.map((slot) => {
      const slotMeals = byslot[slot.id] || [];
      const slotTotal = mealTotals(slotMeals);
      const hasData = slotMeals.length > 0;
      return `<div class="day-card" style="margin-bottom:10px">
        <div class="row" style="align-items:center;margin-bottom:${hasData ? '10px' : '0'}">
          <div style="flex:1">
            <div class="day-name">${slot.label}</div>
            <div style="font-size:13px;font-weight:800;color:var(--orange);margin-top:2px">${slotTotal.cal} kcal</div>
            ${hasData ? macroLegendHTML(slotTotal.protein, slotTotal.carbs, slotTotal.fat) : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            ${hasData ? macroDonutHTML(slotTotal.protein, slotTotal.carbs, slotTotal.fat) : ''}
            <button data-add-to-slot-date="${slot.id}" style="width:32px;height:32px;border-radius:10px;border:none;background:var(--accentBg);color:var(--accent2);font-size:18px;font-weight:700;cursor:pointer;flex-shrink:0">+</button>
          </div>
        </div>
        ${slotMeals.length ? slotMeals.map((ml) => mealRowHTML(ml)).join('') : `<div style="font-size:12px;color:var(--muted);padding:4px 0 0">Noch nichts eingetragen</div>`}
      </div>`;
    }).join('');

    if (unassigned.length) {
      slotsHtml += `<div class="day-card" style="margin-bottom:10px;border-left:3px solid var(--muted)">
        <div class="day-hdr"><div class="day-name">Ohne Zuordnung</div></div>
        ${unassigned.map((ml) => mealRowHTML(ml)).join('')}
      </div>`;
    }

    document.getElementById('nutrition-review-title').textContent = dateLabel;
    document.getElementById('nutrition-review-content').innerHTML = `
      <div class="card" style="margin-bottom:14px">
        <div style="font-size:24px;font-weight:900">${t.cal} kcal</div>
        ${macroLegendHTML(t.protein, t.carbs, t.fat)}
      </div>
      ${slotsHtml || `<div style="text-align:center;color:var(--muted);padding:24px;font-size:13px">Keine Mahlzeiten an diesem Tag.</div>`}`;

    document.querySelectorAll('#nutrition-review-content [data-edit-meal]').forEach((btn) => {
      btn.addEventListener('click', () => openEditMeal(btn.dataset.editMeal));
    });
    document.querySelectorAll('#nutrition-review-content [data-del-meal]').forEach((btn) => {
      btn.addEventListener('click', () => confirmDeleteMeal(btn.dataset.delMeal));
    });
    document.querySelectorAll('#nutrition-review-content [data-add-to-slot-date]').forEach((btn) => {
      btn.addEventListener('click', () => openMealModalForSlotOnDate(btn.dataset.addToSlotDate));
    });

    openMo('mo-nutrition-review');
  } catch (e) {
    showToast('⚠️ Konnte Ernährungstag nicht laden');
  }
}
