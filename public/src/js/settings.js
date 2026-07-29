// ═══════════════════════════════════════════════════════════════════════════
// settings.js
// Profil-Einstellungen: Körperdaten, Ziele (max. 3), Trainingsarten (max. 3),
// Trainingstage, Makros (manuell ODER per Coach-Formel neu berechnet).
// ═══════════════════════════════════════════════════════════════════════════
import { updateProfile, addMeasurement, getMeasurementHistory } from './api.js';
import { GOAL_OPTS, TYPE_OPTS, calcMacros } from './coachData.js';
import { showToast, openMo, closeMo } from './ui.js';
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
    `<div class="si" style="border:none"><div class="si-l"><div class="si-name">Coach-Makros neu berechnen</div><div class="si-val">Optimal für dein Ziel</div></div><div class="si-r" id="recalc-btn">↻</div></div>`;

  document.getElementById('set-train').innerHTML =
    siChoice('Trainingsarten', tps, 'trainingTypes') +
    si('Trainingstage', u.training_days + '× / Woche', 'days', 'Trainingstage/Woche', 'number', u.training_days);

  attachSettingsListeners();
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
    modalBody.innerHTML = history.length
      ? history.map((h) => `<div class="si" style="border:none">
          <div class="si-l"><div class="si-name">${new Date(h.measured_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div></div>
          <div style="font-size:15px;font-weight:800">${h.weight_kg} kg</div>
        </div>`).join('')
      : `<div style="text-align:center;color:var(--muted);padding:24px;font-size:13px">Noch keine Einträge. Ändere dein Gewicht oben, um den Verlauf zu starten.</div>`;
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
      else if (_editKey === 'm_kcal') patch.macro_kcal = val;
      else if (_editKey === 'm_protein') patch.macro_protein = val;
      else if (_editKey === 'm_carbs') patch.macro_carbs = val;
      else if (_editKey === 'm_fat') patch.macro_fat = val;
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
