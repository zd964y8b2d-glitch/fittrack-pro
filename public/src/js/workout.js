// ═══════════════════════════════════════════════════════════════════════════
// workout.js
// Aktives Workout (Sätze/Wdh./Gewicht live anpassbar), Coach-Plan-Ansicht,
// individueller "Mein Plan" (frei erstellbar inkl. Coach-Warnungen),
// Workout-Verlauf, Progressions-Charts.
// ═══════════════════════════════════════════════════════════════════════════
import {
  getMyPlan, addPlanExercise, updatePlanExercise, deletePlanExercise,
  appendExerciseHistory, getWorkoutLogs, addWorkoutLog,
} from './api.js';
import { MUSCLE_COLORS, MUSCLE_GROUPS_IMPORTANT, coachPlanDays, analyzeMyPlan } from './coachData.js';
import { showToast, openMo, closeMo, fmtTime, todayLbl, typeLbl, showApp } from './ui.js';
import { assertOnline } from './offline.js';

let currentUser = null;
let currentProfile = null;
let myPlanCache = [];
let wActive = false, wTimer = null, wSecs = 0, wDone = 0;
let sessData = {}; // index -> {weight, sets, reps} während einer aktiven Session
let activeWTab = 'active';

export function initWorkoutModule(user, profile) {
  currentUser = user;
  currentProfile = profile;
}

export async function refreshMyPlan() {
  myPlanCache = await getMyPlan(currentUser.id);
  return myPlanCache;
}

export function wTab(t) {
  activeWTab = t;
  ['active', 'coach', 'mine', 'history'].forEach((x) => {
    document.getElementById('wtab-' + x).classList.toggle('active', x === t);
    document.getElementById('wv-' + x).style.display = x === t ? '' : 'none';
  });
  if (t === 'coach') renderCoachPlan();
  else if (t === 'mine') renderMyPlan();
  else if (t === 'history') renderWorkoutHistory();
  else renderActiveWorkout();
}

// ── AKTIVES WORKOUT ──────────────────────────────────────────────────────
function getSess(i) {
  const ex = myPlanCache[i];
  return {
    weight: sessData[i]?.weight ?? Number(ex.weight_kg) ?? 0,
    sets: sessData[i]?.sets ?? ex.sets,
    reps: sessData[i]?.reps ?? ex.reps,
  };
}

function calcVol(c, bw) { return bw ? c.sets * c.reps : c.sets * c.reps * c.weight; }

window.stepEx = function (i, f, d) {
  const ex = myPlanCache[i];
  if (!sessData[i]) sessData[i] = { weight: Number(ex.weight_kg) || 0, sets: ex.sets, reps: ex.reps };
  const s = sessData[i];
  if (f === 'weight') s.weight = Math.max(0, Math.round((s.weight + d * 2.5) * 10) / 10);
  else if (f === 'sets') s.sets = Math.max(1, s.sets + d);
  else s.reps = Math.max(1, s.reps + d);
  const el = document.getElementById(`sv-${i}-${f}`);
  if (el) el.textContent = f === 'weight' ? s.weight + ' kg' : (f === 'sets' ? s.sets : s.reps);
  const cur = getSess(i);
  const vol = calcVol(cur, ex.is_bodyweight);
  const ve = document.getElementById(`sv-${i}-vol`);
  if (ve) ve.textContent = `Vol: ${vol}${ex.is_bodyweight ? ' Wdh.' : ' kg'}`;
};

function stepperHTML(i) {
  const ex = myPlanCache[i];
  const cur = getSess(i);
  const vol = calcVol(cur, ex.is_bodyweight);
  const mk = (f, v, l) => `<div class="sb"><div class="sb-lbl">${l}</div><div class="sb-row">
    <button class="sp sp-m" onclick="stepEx(${i},'${f}',-1)">−</button>
    <div class="sv2" id="sv-${i}-${f}">${v}</div>
    <button class="sp sp-p" onclick="stepEx(${i},'${f}',1)">+</button>
  </div></div>`;
  return `<div class="sg2">${mk('sets', cur.sets, 'SÄTZE')}${mk('reps', cur.reps, 'WDH.')}${ex.is_bodyweight ? '' : mk('weight', cur.weight + ' kg', 'GEWICHT')}</div>
  <div class="vol-badge" id="sv-${i}-vol">Vol: ${vol}${ex.is_bodyweight ? ' Wdh.' : ' kg'}</div>`;
}

async function renderActiveWorkout() {
  const box = document.getElementById('wv-active');
  if (!myPlanCache.length) await refreshMyPlan();

  if (wActive) {
    box.innerHTML = `<div class="card active-card" style="margin-bottom:12px">
      <div class="row" style="align-items:flex-start;margin-bottom:12px">
        <div>
          <div class="active-pill"><span class="pulse">●</span> AKTIV</div>
          <div style="font-size:17px;font-weight:800">${typeLbl(currentProfile.training_types)} Workout</div>
          <div style="font-size:12px;color:var(--sub);margin-top:2px" id="timer">${fmtTime(wSecs)} · ${wDone}/${myPlanCache.length}</div>
        </div>
        <button onclick="window.stopWorkout()" style="background:var(--redBg);border:1px solid rgba(231,76,60,.3);border-radius:11px;padding:8px 13px;color:var(--red);font-size:12px;font-weight:700;cursor:pointer">Beenden</button>
      </div>
      ${myPlanCache.map((ex, i) => {
        const done = i < wDone, active = i === wDone, cur = getSess(i), vol = calcVol(cur, ex.is_bodyweight);
        const mc = MUSCLE_COLORS[ex.muscle_group] || '#8888A0';
        return `<div class="ex-row">
          <div class="row">
            <div>
              <div class="ex-name" style="color:${done ? 'var(--green)' : 'var(--text)'}">${done ? '✓ ' : ''}${ex.exercise_name}</div>
              <span class="ex-muscle" style="background:${mc}22;color:${mc}">${ex.muscle_group}</span>
            </div>
            ${done ? `<span style="font-size:12px;color:var(--green);font-weight:700">✓ ${cur.sets}×${cur.reps} ${ex.is_bodyweight ? 'KG' : cur.weight + 'kg'}</span>` : ''}
          </div>
          ${!done ? `${stepperHTML(i)}${active ? `<button onclick="window.doneEx()" style="margin-top:9px;width:100%;background:var(--accentBg);border:1px solid var(--accentBd);border-radius:11px;padding:10px;color:var(--accent2);font-size:13px;font-weight:800;cursor:pointer">✓ Übung abschließen</button>` : ''}` : ''}
        </div>`;
      }).join('')}
    </div>`;
  } else {
    box.innerHTML = `<button class="btn-p" onclick="window.startWorkout()" style="margin-bottom:14px">⚡ Workout starten</button>
      <div class="coach-tip"><div class="ct-icon">💡</div><div><div class="ct-lbl">TIPP</div><div class="ct-txt">Starte das Workout und passe Gewicht, Sätze und Wiederholungen direkt während dem Training an. Die Werte werden automatisch für die Progression gespeichert.</div></div></div>`;
  }
}

window.startWorkout = async function () {
  if (!myPlanCache.length) await refreshMyPlan();
  if (!myPlanCache.length) { showToast('⚠️ Dein Plan ist leer. Füge zuerst Übungen hinzu.'); return; }
  wActive = true; wSecs = 0; wDone = 0; sessData = {};
  showApp('workout'); wTab('active');
  wTimer = setInterval(() => {
    wSecs++;
    const el = document.getElementById('timer');
    if (el) el.textContent = `${fmtTime(wSecs)} · ${wDone}/${myPlanCache.length}`;
  }, 1000);
  renderActiveWorkout();
};

window.doneEx = async function () {
  if (wDone < myPlanCache.length) { wDone++; renderActiveWorkout(); }
  if (wDone === myPlanCache.length) setTimeout(finishWorkout, 300);
};

window.stopWorkout = finishWorkout;

async function finishWorkout() {
  try {
    assertOnline();
    await saveSessionToHistory();
    await addWorkoutLog(currentUser.id, {
      workoutName: typeLbl(currentProfile.training_types) + ' Workout',
      durationMin: Math.round(wSecs / 60),
      exerciseCount: myPlanCache.length,
    });
    wActive = false; clearInterval(wTimer);
    showToast('🎉 Workout gespeichert!');
    showApp('progress');
    await renderProgression();
  } catch (err) {
    showToast(err.message?.includes('Internet') ? err.message : '⚠️ Fehler beim Speichern');
  }
}

async function saveSessionToHistory() {
  const today = todayLbl();
  for (let i = 0; i < myPlanCache.length; i++) {
    const ex = myPlanCache[i];
    const cur = getSess(i);
    const vol = calcVol(cur, ex.is_bodyweight);
    const entry = { date: today, weight: cur.weight, sets: cur.sets, reps: cur.reps, volume: vol };
    await appendExerciseHistory(ex.id, ex.history, entry);
  }
  sessData = {};
  await refreshMyPlan();
}

// ── COACH-PLAN (read-only Vorlage) ──────────────────────────────────────
function renderCoachPlan() {
  const goals = currentProfile.goals?.length ? currentProfile.goals : ['muscle'];
  const days = coachPlanDays(goals, currentProfile.training_types, currentProfile.training_days);
  let html = `<div class="coach-tip"><div class="ct-icon">🏆</div><div><div class="ct-lbl">COACH-PLAN</div>
    <div class="ct-txt">Dieser Plan ist auf deine Ziele optimiert. Jede Einheit baut auf Antagonisten-Balance und progressiver Überladung auf. Du kannst jede Übung im "Mein Plan"-Tab frei anpassen.</div></div></div>`;
  days.forEach((day) => {
    const cols = [...new Set(day.exercises.map((e) => MUSCLE_COLORS[e.muscle] || '#8888A0'))];
    html += `<div class="day-card">
      <div class="day-hdr">
        <div><div class="day-name">Tag ${day.key}</div><div class="day-focus">${day.focus}</div></div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">${cols.map((c) => `<span style="width:10px;height:10px;border-radius:50%;background:${c};display:inline-block"></span>`).join('')}</div>
      </div>
      ${day.exercises.map((ex) => {
        const col = MUSCLE_COLORS[ex.muscle] || '#8888A0';
        return `<div class="ex-row"><div class="row">
          <div><div class="ex-name">${ex.name}</div>
          <div class="ex-sub">${ex.sets} Sätze × ${ex.reps} Wdh. ${ex.bodyweight ? '· Körpergewicht' : '· ' + ex.weight + ' kg'}</div></div>
          <span class="ex-muscle" style="background:${col}22;color:${col}">${ex.muscle}</span>
        </div></div>`;
      }).join('')}
      <button class="add-inline-btn" data-day="${day.key}">+ Übung zu Mein Plan hinzufügen</button>
    </div>`;
  });
  document.getElementById('wv-coach').innerHTML = html;
  document.querySelectorAll('#wv-coach [data-day]').forEach((btn) => btn.addEventListener('click', () => openAddExToMine(btn.dataset.day)));
}

// ── MEIN PLAN (frei erstellbar) ─────────────────────────────────────────
async function renderMyPlan() {
  if (!myPlanCache.length) await refreshMyPlan();
  const { byDay, warnings } = analyzeMyPlan(myPlanCache);
  const days = ['A', 'B', 'C', 'D'];
  let html = '';

  if (warnings['_global']) {
    html += warnings['_global'].map((w) => `<div class="coach-warn" style="margin-bottom:12px"><div class="cw-icon">⚠️</div><div class="cw-txt">${w}</div></div>`).join('');
  }
  if (myPlanCache.length === 0) {
    html += `<div class="coach-tip"><div class="ct-icon">🏆</div><div><div class="ct-lbl">COACH</div>
      <div class="ct-txt">Erstelle deinen eigenen Trainingsplan! Füge Übungen pro Tag hinzu. Ich analysiere deinen Plan und gebe dir Feedback zu fehlenden Muskelgruppen, Volumen und Balance.</div></div></div>`;
  }

  days.forEach((d) => {
    const exes = byDay[d] || [];
    html += `<div class="day-card">
      <div class="day-hdr">
        <div><div class="day-name">Tag ${d}</div><div class="day-focus">${exes.length > 0 ? [...new Set(exes.map((e) => e.muscle_group))].join(', ') : 'Noch leer'}</div></div>
        <span class="tag ${exes.length > 0 ? 'tg' : 'tr'}">${exes.length} Übungen</span>
      </div>
      ${exes.map((ex) => {
        const col = MUSCLE_COLORS[ex.muscle_group] || '#8888A0';
        return `<div class="ex-row"><div class="row" style="align-items:flex-start">
          <div style="flex:1">
            <div class="ex-name">${ex.exercise_name}</div>
            <div class="ex-sub">${ex.sets}×${ex.reps} ${ex.is_bodyweight ? 'KG' : ex.weight_kg + 'kg'}</div>
            <span class="ex-muscle" style="background:${col}22;color:${col}">${ex.muscle_group}</span>
          </div>
          <div style="display:flex;gap:5px;flex-shrink:0;margin-left:8px">
            <button class="edit-btn" data-edit="${ex.id}">✏️</button>
            <button class="del-btn" data-del="${ex.id}">✕</button>
          </div>
        </div></div>`;
      }).join('')}
      ${warnings[d] ? warnings[d].map((w) => `<div class="coach-warn"><div class="cw-icon">⚠️</div><div class="cw-txt">${w}</div></div>`).join('') : ''}
      <button class="add-inline-btn" data-day="${d}">+ Übung zu Tag ${d} hinzufügen</button>
    </div>`;
  });

  document.getElementById('wv-mine').innerHTML = html;
  document.querySelectorAll('#wv-mine [data-day]').forEach((btn) => btn.addEventListener('click', () => openAddExToMine(btn.dataset.day)));
  document.querySelectorAll('#wv-mine [data-edit]').forEach((btn) => btn.addEventListener('click', () => editMyEx(btn.dataset.edit)));
  document.querySelectorAll('#wv-mine [data-del]').forEach((btn) => btn.addEventListener('click', () => delMyEx(btn.dataset.del)));
}

function openAddExToMine(day) {
  document.getElementById('mo-ex-title').textContent = 'Übung hinzufügen – Tag ' + day;
  document.getElementById('ex-name').value = '';
  document.getElementById('ex-muscle').value = 'Brust';
  document.getElementById('ex-sets').value = '3';
  document.getElementById('ex-reps').value = '10';
  document.getElementById('ex-weight').value = '0';
  document.getElementById('ex-day').value = day;
  document.getElementById('ex-edit-id').value = '';

  const dayExes = myPlanCache.filter((e) => e.plan_day === day);
  const dayMuscles = [...new Set(dayExes.map((e) => e.muscle_group))];
  const missing = MUSCLE_GROUPS_IMPORTANT.filter((m) => !dayMuscles.includes(m));
  document.getElementById('mo-ex-coach').innerHTML = missing.length
    ? `<div class="coach-tip"><div class="ct-icon">💡</div><div><div class="ct-lbl">COACH-HINWEIS</div><div class="ct-txt">Tag ${day} fehlt noch: <strong>${missing.slice(0, 3).join(', ')}</strong>. Denk an Antagonisten-Balance!</div></div></div>`
    : '';
  openMo('mo-ex');
}

function editMyEx(id) {
  const ex = myPlanCache.find((e) => e.id === id);
  if (!ex) return;
  document.getElementById('mo-ex-title').textContent = 'Übung bearbeiten';
  document.getElementById('ex-name').value = ex.exercise_name;
  document.getElementById('ex-muscle').value = ex.muscle_group;
  document.getElementById('ex-sets').value = ex.sets;
  document.getElementById('ex-reps').value = ex.reps;
  document.getElementById('ex-weight').value = ex.weight_kg;
  document.getElementById('ex-day').value = ex.plan_day;
  document.getElementById('ex-edit-id').value = ex.id;
  document.getElementById('mo-ex-coach').innerHTML = '';
  openMo('mo-ex');
}

async function delMyEx(id) {
  try {
    assertOnline();
    await deletePlanExercise(id);
    await refreshMyPlan();
    renderMyPlan();
    showToast('Übung entfernt');
  } catch (err) {
    showToast('⚠️ Löschen fehlgeschlagen');
  }
}

export async function saveExerciseFromModal() {
  const name = document.getElementById('ex-name').value.trim();
  if (!name) { showToast('⚠️ Übungsname erforderlich'); return; }
  const weight = parseFloat(document.getElementById('ex-weight').value) || 0;
  const payload = {
    name,
    muscle: document.getElementById('ex-muscle').value,
    sets: parseInt(document.getElementById('ex-sets').value) || 3,
    reps: parseInt(document.getElementById('ex-reps').value) || 10,
    weight,
    bodyweight: weight === 0,
    day: document.getElementById('ex-day').value || 'A',
  };
  const editId = document.getElementById('ex-edit-id').value;

  try {
    assertOnline();
    if (editId) {
      await updatePlanExercise(editId, {
        exercise_name: payload.name, muscle_group: payload.muscle, sets: payload.sets,
        reps: payload.reps, weight_kg: payload.weight, is_bodyweight: payload.bodyweight, plan_day: payload.day,
      });
    } else {
      await addPlanExercise(currentUser.id, payload);
    }
    await refreshMyPlan();
    closeMo('mo-ex');
    renderMyPlan();
    showToast('✅ Übung gespeichert');
  } catch (err) {
    showToast(err.message?.includes('Internet') ? err.message : '⚠️ Speichern fehlgeschlagen');
  }
}

// ── VERLAUF ──────────────────────────────────────────────────────────────
async function renderWorkoutHistory() {
  const log = await getWorkoutLogs(currentUser.id, 15);
  document.getElementById('wv-history').innerHTML = log.length
    ? log.map((w) => `<div class="card"><div class="row">
        <div><div style="font-size:14px;font-weight:800">${w.workout_name}</div>
        <div style="font-size:12px;color:var(--sub);margin-top:2px">${w.duration_min} Min · ${w.exercise_count} Übungen</div></div>
        <span class="tag ta">${new Date(w.performed_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
      </div></div>`).join('')
    : `<div style="text-align:center;color:var(--muted);padding:32px;font-size:13px">Noch keine Workouts. Starte dein erstes!</div>`;
}

// ── PROGRESSION ──────────────────────────────────────────────────────────
export async function renderProgression() {
  if (!myPlanCache.length) await refreshMyPlan();
  const BAR = 56;
  document.getElementById('prog-list').innerHTML = myPlanCache.map((ex) => {
    const hist = ex.history || [];
    if (!hist.length) return `<div class="card"><div style="font-size:14px;font-weight:700">${ex.exercise_name}</div><div style="font-size:12px;color:var(--muted);margin-top:3px">Noch keine Daten</div></div>`;
    const shown = hist.slice(-5);
    const maxV = Math.max(...shown.map((h) => h.volume), 1);
    const first = hist[0], last = hist[hist.length - 1];
    const vG = last.volume - first.volume;
    const wG = !ex.is_bodyweight ? last.weight - first.weight : null;
    const rG = last.reps - first.reps, sG = last.sets - first.sets;
    const cls = vG > 0 ? 'pb-up' : vG < 0 ? 'pb-dn' : 'pb-eq';
    const mc = MUSCLE_COLORS[ex.muscle_group] || '#8888A0';
    return `<div class="card">
      <div class="row" style="margin-bottom:3px">
        <div style="font-size:14px;font-weight:800">${ex.exercise_name}</div>
        <span class="pbadge ${cls}">${vG > 0 ? '↑' : vG < 0 ? '↓' : '→'} ${(vG > 0 ? '+' : '') + vG}${ex.is_bodyweight ? ' Wdh.' : ' kg'}</span>
      </div>
      <span class="ex-muscle" style="background:${mc}22;color:${mc};display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;margin-bottom:4px">${ex.muscle_group}</span>
      <div class="prog-chart">
        ${shown.map((h) => {
          const bH = Math.max(4, Math.round((h.volume / maxV) * BAR));
          const iL = h === shown[shown.length - 1];
          return `<div class="prog-col"><div class="prog-vlbl">${h.volume}</div>
            <div class="prog-bar" style="height:${bH}px;background:${iL ? 'var(--accent)' : 'var(--border)'};border:1px solid ${iL ? 'var(--accent)' : 'var(--border2)'}"></div>
            <div class="prog-dlbl">${h.date}</div></div>`;
        }).join('')}
      </div>
      <div class="prog-kpi">
        ${wG !== null ? `<div class="pk"><div class="pk-l">Gewicht</div><div class="pk-v" style="color:${wG > 0 ? 'var(--green)' : wG < 0 ? 'var(--red)' : 'var(--sub)'}">${first.weight}→${last.weight} kg ${wG > 0 ? '↑' : wG < 0 ? '↓' : ''}</div></div>` : ''}
        <div class="pk"><div class="pk-l">Sätze</div><div class="pk-v" style="color:${sG > 0 ? 'var(--green)' : sG < 0 ? 'var(--red)' : 'var(--sub)'}">${first.sets}→${last.sets} ${sG > 0 ? '↑' : sG < 0 ? '↓' : ''}</div></div>
        <div class="pk"><div class="pk-l">Wdh.</div><div class="pk-v" style="color:${rG > 0 ? 'var(--green)' : rG < 0 ? 'var(--red)' : 'var(--sub)'}">${first.reps}→${last.reps} ${rG > 0 ? '↑' : rG < 0 ? '↓' : ''}</div></div>
        <div class="pk"><div class="pk-l">Sessions</div><div class="pk-v" style="color:var(--sub)">${hist.length}</div></div>
      </div>
    </div>`;
  }).join('') || `<div style="text-align:center;color:var(--muted);padding:32px;font-size:13px">Führe dein erstes Workout durch um Daten zu sehen.</div>`;
}

export function renderWorkout() {
  renderActiveWorkout();
  if (activeWTab === 'coach') renderCoachPlan();
  else if (activeWTab === 'mine') renderMyPlan();
  else if (activeWTab === 'history') renderWorkoutHistory();
}
