// ═══════════════════════════════════════════════════════════════════════════
// nutrition.js
// Ernährungstracking: Mahlzeiten des Tages, Makro-Fortschritt ggü. den
// Coach-Zielwerten aus dem Profil.
// ═══════════════════════════════════════════════════════════════════════════
import { getMealsForToday, addMeal } from './api.js';
import { ringHTML, pbar, showToast, closeMo, mealTotals } from './ui.js';
import { assertOnline } from './offline.js';

let currentUser = null;
let currentProfile = null;
let mealsCache = [];

export function initNutritionModule(user, profile) {
  currentUser = user;
  currentProfile = profile;
}

export function updateProfileRef(profile) {
  currentProfile = profile;
}

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
