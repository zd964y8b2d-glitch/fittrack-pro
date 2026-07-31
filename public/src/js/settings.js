// ═══════════════════════════════════════════════════════════════════════════
// settings.js
// Profil-Einstellungen: Körperdaten, Ziele (max. 3), Trainingsarten (max. 3),
// Trainingstage, Makros (manuell ODER per Coach-Formel neu berechnet).
// ═══════════════════════════════════════════════════════════════════════════
import { updateProfile, addMeasurement, getMeasurementHistory } from './api.js';
import { GOAL_OPTS, TYPE_OPTS, calcMacros } from './coachData.js';
import { showToast, openMo, closeMo, confirmDialog } from './ui.js';
import { assertOnline } from './offline.js';
import { refreshMyPlan } from './workout.js';

let currentUser = null;
let currentProfile = null;
let onProfileUpdated = null;

let _editKey = '', _editType = 'text', _choiceArr = [], _choiceMax = 1;

export function initSettingsModule(user, profile, onUpdate) {
  currentUser = user;
  currentProfile = profile;
  onProfileUpdated = onUpdate;
}

// Kalorien, die Protein/Kohlenhydrate/Fett (4/4/9 kcal je Gramm) ergeben -
// Basis für den Abgleich mit dem eingestellten Kalorienziel unten.
function impliedKcal(protein, carbs, fat) {
  return Math.round((protein || 0) * 4 + (carbs || 0) * 4 + (fat || 0) * 9);
}

export function renderSettings() {
  const u = currentProfile;
  document.getElementById('set-sub').textContent = u.name;

  document.getElementById('set-profile').innerHTML =
    si('Name', u.name, 'name', 'Name', 'text', u.name) +
    si('Gewicht', u.weight_kg + ' kg', 'weight', 'Gewicht (kg)', 'number', u.weight_kg) +
    siWeightHistory() +
    si('Alter', u.age + ' J.', 'age', 'Alter', 'number', u.age) +
    si('Größe', u.height_cm + ' cm', 'height', 'Größe (cm)', 'number', u.height_cm) +
    siToggle('Wöchentliche Gewichts-Erinnerung', 'weekly_weight_reminder', u.weekly_weight_reminder);

  const gls = (u.goals || []).map((v) => GOAL_OPTS.find((o) => o.v === v)?.l || v).join(', ');
  const tps = (u.training_types || []).map((v) => TYPE_OPTS.find((o) => o.v === v)?.l || v).join(', ');
  document.getElementById('set-goals').innerHTML =
    siChoice('Ziele', gls, 'goals') +
    si('Kalorien', u.macro_kcal + ' kcal', 'm_kcal', 'Kalorien (kcal)', 'number', u.macro_kcal) +
    si('Protein', u.macro_protein + ' g', 'm_protein', 'Protein (g)', 'number', u.macro_protein) +
    si('Kohlenhydrate', u.macro_carbs + ' g', 'm_carbs', 'Kohlenhydrate (g)', 'number', u.macro_carbs) +
    si('Fett', u.macro_fat + ' g', 'm_fat', 'Fett (g)', 'number', u.macro_fat) +
    macroShortfallHint(u) +
    si('Ballaststoffe', u.macro_fiber + ' g', 'm_fiber', 'Ballaststoffe (g)', 'number', u.macro_fiber) +
    `<div class="si" style="border:none"><div class="si-l"><div class="si-name">Coach-Makros neu berechnen</div><div class="si-val">Optimal für dein Ziel</div></div><div class="si-r" id="recalc-btn">↻</div></div>`;

  document.getElementById('set-train').innerHTML =
    siChoice('Trainingsarten', tps, 'trainingTypes') +
    si('Trainingstage', u.training_days + '× / Woche', 'days', 'Trainingstage/Woche', 'number', u.training_days);

  attachSettingsListeners();
}

// Warnt, wenn Protein/Kohlenhydrate/Fett rechnerisch WENIGER kcal ergeben
// als das eingestellte Kalorienziel (z.B. nach manueller Einzel-Anpassung
// ohne Übernahme des Angleich-Vorschlags aus saveGoalEdit).
function macroShortfallHint(u) {
  const sum = impliedKcal(u.macro_protein, u.macro_carbs, u.macro_fat);
  const shortfall = (u.macro_kcal || 0) - sum;
  if (!u.macro_kcal || shortfall <= 5) return '';
  return `<div class="si" style="border:none;padding-top:0;padding-bottom:6px">
    <div style="font-size:11px;color:var(--orange)">⚠️ Makros ergeben nur ${sum} von ${u.macro_kcal} kcal (${shortfall} kcal fehlen)</div>
  </div>`;
}

function si(lbl, val, key, label, type, cur) {
  return `<div class="si" data-field-key="${key}" data-field-label="${label}" data-field-type="${type}" data-field-cur="${cur}">
    <div class="si-l"><div class="si-name">${lbl}</div><div class="si-val">${val}</div></div>
    <div class="si-r">›</div>
  </div>`;
}

// Öffnet statt des Bearbeitungsfelds eine Liste der letzten Gewichtseinträge
// - jede Gewichtsänderung (siehe saveGoalEdit) wird zusätzlich historisiert.
function siWeightHistory() {
  return `<div class="si" id="btn-open-weight-history" style="cursor:pointer">
    <div class="si-l"><div class="si-name">Gewichtsverlauf</div><div class="si-val">Verlauf ansehen</div></div>
    <div class="si-r">›</div>
  </div>`;
}

// Toggle-Zeile, speichert sofort bei Änderung (kein Umweg über das
// generische Bearbeitungs-Modal nötig für einen einfachen Ein/Aus-Wert).
function siToggle(lbl, key, checked) {
  return `<div class="si" style="border:none">
    <div class="si-l"><div class="si-name">${lbl}</div><div class="si-val">Einmal pro Woche ans Wiegen erinnern</div></div>
    <label class="toggle-switch"><input type="checkbox" id="toggle-${key}" ${checked ? 'checked' : ''}><span class="slider"></span></label>
  </div>`;
}

export async function openWeightHistory() {
  const modalBody = document.getElementById('weight-history-content');
  modalBody.innerHTML = `<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px">Lädt...</div>`;
  openMo('mo-weight-history');
  try {
    const history = await getMeasurementHistory(currentUser.id, 30);
    if (!history.length) {
      modalBody.innerHTML = `<div style="text-align:center;color:var(--muted);padding:24px;font-size:13px">Noch keine Einträge. Ändere dein Gewicht oben, um den Verlauf zu starten.</div>`;
      return;
    }

    // Trend: Gesamtveränderung vom ältesten zum neuesten gezeigten Eintrag
    // (history ist neueste-zuerst sortiert, siehe getMeasurementHistory).
    const oldest = history[history.length - 1];
    const newest = history[0];
    const totalDiff = Math.round((newest.weight_kg - oldest.weight_kg) * 10) / 10;
    const trendColor = totalDiff > 0 ? 'var(--orange)' : totalDiff < 0 ? 'var(--green)' : 'var(--sub)';
    const trendSign = totalDiff > 0 ? '+' : '';
    const trendHtml = history.length > 1
      ? `<div style="text-align:center;padding:12px;margin-bottom:14px;background:var(--card2);border-radius:12px">
          <div style="font-size:11px;color:var(--sub)">Trend seit ${new Date(oldest.measured_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</div>
          <div style="font-size:22px;font-weight:900;color:${trendColor}">${trendSign}${totalDiff} kg</div>
        </div>`
      : '';

    // Je Eintrag zusätzlich die Veränderung gegenüber dem NÄCHSTÄLTEREN
    // Eintrag (nicht dem allerersten) - zeigt den Verlauf Schritt für Schritt.
    const rows = history.map((h, i) => {
      const older = history[i + 1];
      const diff = older ? Math.round((h.weight_kg - older.weight_kg) * 10) / 10 : null;
      const diffColor = diff > 0 ? 'var(--orange)' : diff < 0 ? 'var(--green)' : 'var(--sub)';
      const diffSign = diff > 0 ? '+' : '';
      return `<div class="si" style="border:none">
          <div class="si-l"><div class="si-name">${new Date(h.measured_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div></div>
          <div style="text-align:right">
            <div style="font-size:15px;font-weight:800">${h.weight_kg} kg</div>
            ${diff !== null ? `<div style="font-size:11px;color:${diffColor}">${diffSign}${diff} kg</div>` : ''}
          </div>
        </div>`;
    }).join('');

    modalBody.innerHTML = trendHtml + rows;
  } catch (e) {
    modalBody.innerHTML = `<div style="text-align:center;color:var(--sub);padding:24px;font-size:13px">⚠️ Verlauf konnte nicht geladen werden.</div>`;
  }
}

async function toggleWeeklyReminder(checked) {
  try {
    assertOnline();
    const updated = await updateProfile(currentUser.id, { weekly_weight_reminder: checked });
    currentProfile = updated;
    if (onProfileUpdated) onProfileUpdated(updated);
  } catch (e) {
    showToast('⚠️ Einstellung konnte nicht gespeichert werden');
  }
}

function siChoice(lbl, val, key) {
  return `<div class="si" data-choice-key="${key}">
    <div class="si-l"><div class="si-name">${lbl}</div><div class="si-val">${val}</div></div>
    <div class="si-r">›</div>
  </div>`;
}

function attachSettingsListeners() {
  document.querySelectorAll('[data-field-key]').forEach((el) => {
    el.addEventListener('click', () => editField(el.dataset.fieldKey, el.dataset.fieldLabel, el.dataset.fieldType, el.dataset.fieldCur));
  });
  document.querySelectorAll('[data-choice-key]').forEach((el) => {
    const key = el.dataset.choiceKey;
    const opts = key === 'goals' ? GOAL_OPTS : TYPE_OPTS;
    const label = key === 'goals' ? 'Ziele (max. 3)' : 'Trainingsarten (max. 3)';
    el.addEventListener('click', () => editChoice(key, label, opts, 3));
  });
  document.getElementById('recalc-btn')?.addEventListener('click', recalc);
  document.getElementById('btn-open-weight-history')?.addEventListener('click', openWeightHistory);
  document.getElementById('toggle-weekly_weight_reminder')?.addEventListener('change', (e) => toggleWeeklyReminder(e.target.checked));
}

export function editField(key, label, type, cur) {
  _editKey = key; _editType = type;
  document.getElementById('mg-title').textContent = label + ' ändern';
  document.getElementById('mg-body').innerHTML = `<input id="gv" class="oi" type="${type}" inputmode="${type === 'number' ? 'decimal' : 'text'}" value="${cur}" style="width:100%;margin-bottom:8px">`;
  openMo('mo-goal');
  setTimeout(() => document.getElementById('gv')?.focus(), 100);
}

function editChoice(key, label, opts, max) {
  _editKey = key; _editType = 'choice'; _choiceMax = max;
  _choiceArr = [...(currentProfile[key === 'goals' ? 'goals' : 'training_types'] || [])];
  document.getElementById('mg-title').textContent = label;
  document.getElementById('mg-body').innerHTML = `<p style="font-size:12px;color:var(--sub);margin-bottom:10px">Wähle bis zu ${max}</p>
    <div class="choice-grid" id="choice-grid">${opts.map((o) => `
      <div class="cc${_choiceArr.includes(o.v) ? ' sel' : ''}" data-val="${o.v}">
        <div class="ck">✓</div><div class="cc-icon">${o.i}</div>
        <div class="cc-lbl">${o.l}</div><div class="cc-sub">${o.s}</div>
      </div>`).join('')}</div>`;
  document.querySelectorAll('#choice-grid .cc').forEach((el) => el.addEventListener('click', () => toggleChoice(el.dataset.val, el)));
  openMo('mo-goal');
}

function toggleChoice(val, el) {
  if (_choiceArr.includes(val)) {
    _choiceArr = _choiceArr.filter((v) => v !== val);
    el.classList.remove('sel');
  } else {
    if (_choiceArr.length >= _choiceMax) { showToast('⚠️ Max ' + _choiceMax + ' Auswahl'); return; }
    _choiceArr.push(val);
    el.classList.add('sel');
  }
}

export async function saveGoalEdit() {
  try {
    assertOnline();
    const patch = {};
    if (_editType === 'choice') {
      if (!_choiceArr.length) { showToast('⚠️ Mindestens 1 wählen'); return; }
      if (_editKey === 'goals') patch.goals = [..._choiceArr];
      if (_editKey === 'trainingTypes') {
        patch.training_types = [..._choiceArr];
        // Hinweis: bestehender "Mein Plan" bleibt unverändert – Nutzer
        // entscheidet selbst, ob er neue Coach-Übungen manuell ergänzt.
      }
    } else {
      const raw = document.getElementById('gv')?.value;
      const val = _editType === 'number' ? parseFloat(raw) || 0 : raw?.trim() || '';
      if (_editKey === 'name') patch.name = val;
      else if (_editKey === 'weight') patch.weight_kg = val;
      else if (_editKey === 'age') patch.age = val;
      else if (_editKey === 'height') patch.height_cm = val;
      else if (_editKey === 'days') patch.training_days = Math.max(1, Math.min(7, parseInt(val)));
      else if (_editKey === 'm_kcal') {
        patch.macro_kcal = val;
        const currentSum = impliedKcal(currentProfile.macro_protein, currentProfile.macro_carbs, currentProfile.macro_fat);
        // Nur fragen, wenn überhaupt schon Makros gesetzt sind und sich das
        // neue Kalorienziel spürbar von deren Summe unterscheidet.
        if (currentSum > 0 && val > 0 && Math.abs(currentSum - val) > 5) {
          const adjust = await confirmDialog(`Deine aktuellen Makros ergeben ${currentSum} kcal, dein neues Kalorienziel ist ${val} kcal. Makros im gleichen Verhältnis anpassen?`);
          if (adjust) {
            const factor = val / currentSum;
            patch.macro_protein = Math.round((currentProfile.macro_protein || 0) * factor);
            patch.macro_carbs = Math.round((currentProfile.macro_carbs || 0) * factor);
            patch.macro_fat = Math.round((currentProfile.macro_fat || 0) * factor);
          }
        }
      } else if (_editKey === 'm_protein' || _editKey === 'm_carbs' || _editKey === 'm_fat') {
        const macroField = _editKey === 'm_protein' ? 'macro_protein' : _editKey === 'm_carbs' ? 'macro_carbs' : 'macro_fat';
        patch[macroField] = val;
        const protein = macroField === 'macro_protein' ? val : (currentProfile.macro_protein || 0);
        const carbs = macroField === 'macro_carbs' ? val : (currentProfile.macro_carbs || 0);
        const fat = macroField === 'macro_fat' ? val : (currentProfile.macro_fat || 0);
        const newSum = impliedKcal(protein, carbs, fat);
        const currentTarget = currentProfile.macro_kcal || 0;
        if (currentTarget > 0 && Math.abs(newSum - currentTarget) > 5) {
          const adjust = await confirmDialog(`Diese Änderung ergibt ${newSum} kcal, dein Kalorienziel ist aktuell ${currentTarget} kcal. Kalorienziel auf ${newSum} kcal anpassen?`);
          if (adjust) patch.macro_kcal = newSum;
        }
      } else if (_editKey === 'm_fiber') patch.macro_fiber = val;
    }
    const updated = await updateProfile(currentUser.id, patch);
    currentProfile = updated;
    // Jede Gewichtsänderung zusätzlich historisieren, damit "Gewichtsverlauf"
    // und die wöchentliche Erinnerung echte Daten haben. Nicht kritisch für
    // den eigentlichen Speichervorgang - Fehler hier blockieren ihn nicht.
    if (_editKey === 'weight') {
      addMeasurement(currentUser.id, patch.weight_kg).catch(() => {});
    }
    closeMo('mo-goal');
    renderSettings();
    if (onProfileUpdated) onProfileUpdated(updated);
    showToast('✅ Gespeichert');
  } catch (err) {
    showToast(err.message?.includes('Internet') ? err.message : '⚠️ Speichern fehlgeschlagen');
  }
}

async function recalc() {
  try {
    assertOnline();
    const macros = calcMacros(currentProfile, currentProfile.goals, currentProfile.training_days);
    const updated = await updateProfile(currentUser.id, {
      macro_kcal: macros.kcal, macro_protein: macros.protein, macro_carbs: macros.carbs, macro_fat: macros.fat,
      macro_fiber: macros.fiber,
    });
    currentProfile = updated;
    renderSettings();
    if (onProfileUpdated) onProfileUpdated(updated);
    showToast('✅ Makros neu berechnet');
  } catch (err) {
    showToast('⚠️ Berechnung fehlgeschlagen');
  }
}

export function updateProfileRef(profile) {
  currentProfile = profile;
}
