// ═══════════════════════════════════════════════════════════════════════════
// workout.js
// Aktives Workout (Sätze/Wdh./Gewicht live anpassbar), Coach-Plan-Ansicht, // individueller "Mein Plan" (frei erstellbar inkl. Coach-Warnungen), // Workout-Verlauf, Progressions-Charts.
// ═══════════════════════════════════════════════════════════════════════════
import {
  getMyPlan, addPlanExercise, updatePlanExercise, deletePlanExercise,
  appendExerciseHistory, getWorkoutLogs, addWorkoutLog, deleteWorkoutLog, } from './api.js'; import { MUSCLE_COLORS, MUSCLE_GROUPS_IMPORTANT, coachPlanDays, analyzeMyPlan, GOAL_OPTS, analyzePlanByGoal } from './coachData.js'; import { showToast, openMo, closeMo, fmtTime, todayLbl, typeLbl, showApp } from './ui.js'; import { assertOnline } from './offline.js';

let currentUser = null;
let currentProfile = null;
let myPlanCache = [];
let wActive = false, wTimer = null, wSecs = 0, wDone = 0; let sessData = {}; // index -> {weight, sets, reps} während einer aktiven Session let activeWTab = 'active';

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
// sessData[i] = Array individueller Sätze: [{reps, weight, done}, ...] let expandedEx = {}; // index -> bool (aufgeklappt?) let activeDayLabel = 'Workout';

function getSessSets(i) {
  if (!sessData[i]) {
    const ex = myPlanCache[i];
    let details = [];
    try { details = ex.set_details ? JSON.parse(ex.set_details) : null; } catch(e) { details = null; }
    if (!details || !details.length) {
      details = Array.from({length: ex.sets || 1}, () => ({ reps: ex.reps, weight: Number(ex.weight_kg) || 0 }));
    }
    sessData[i] = details.map(s => ({ reps: s.reps, weight: s.weight, done: false }));
  }
  return sessData[i];
}

function calcVolFromSets(sets, bw) {
  return sets.reduce((sum, s) => sum + (bw ? s.reps : s.reps * s.weight), 0); }

window.toggleExPanel = function(i) {
  expandedEx[i] = !expandedEx[i];
  renderActiveWorkout();
};

window.stepSet = function(i, si, field, delta) {
  const sets = getSessSets(i);
  const s = sets[si];
  if (field === 'weight') s.weight = Math.max(0, Math.round((s.weight + delta * 2.5) * 10) / 10);
  else s.reps = Math.max(1, s.reps + delta);
  const el = document.getElementById(`sv-${i}-${si}-${field}`);
  if (el) el.textContent = field === 'weight' ? s.weight + ' kg' : s.reps;
  const volEl = document.getElementById(`vol-${i}`);
  if (volEl) {
    const ex = myPlanCache[i];
    volEl.textContent = 'Vol: ' + calcVolFromSets(sets, ex.is_bodyweight) + (ex.is_bodyweight ? ' Wdh.' : ' kg');
  }
};

window.toggleSetDone = function(i, si) {
  const sets = getSessSets(i);
  sets[si].done = !sets[si].done;
  renderActiveWorkout();
};

window.addSetToActive = function(i) {
  const sets = getSessSets(i);
  const last = sets[sets.length - 1];
  sets.push({ reps: last?.reps ?? 10, weight: last?.weight ?? 0, done: false });
  renderActiveWorkout();
};

function exerciseCardHTML(ex, i) {
  const sets = getSessSets(i);
  const allDone = sets.every(s => s.done);
  const doneCount = sets.filter(s => s.done).length;
  const mc = MUSCLE_COLORS[ex.muscle_group] || '#8888A0';
  const vol = calcVolFromSets(sets, ex.is_bodyweight);
  const isOpen = !!expandedEx[i];

  return `<div class="ex-row">
    <div class="row" style="cursor:pointer" onclick="toggleExPanel(${i})">
      <div style="flex:1">
        <div class="ex-name" style="color:${allDone ? 'var(--green)' : 'var(--text)'}">${allDone ? '✓ ' : ''}${ex.exercise_name}</div>
        <span class="ex-muscle" style="background:${mc}22;color:${mc}">${ex.muscle_group}</span>
        <span style="font-size:11px;color:var(--sub);margin-left:6px">${doneCount}/${sets.length} Sätze</span>
      </div>
      <span style="font-size:18px;color:var(--sub);transform:rotate(${isOpen?90:0}deg);transition:transform .2s;display:inline-block">›</span>
    </div>
    ${isOpen ? `
      <div style="margin-top:10px">
        ${sets.map((s, si) => `
          <div class="row" style="margin-bottom:8px;padding:8px 10px;background:var(--surface);border-radius:10px;${s.done?'opacity:0.55':''}">
            <div style="font-size:11px;font-weight:700;color:var(--sub);width:44px;flex-shrink:0">Satz ${si+1}</div>
            <div class="sg2" style="margin-top:0;flex:1;justify-content:flex-end">
              <div class="sb"><div class="sb-lbl">WDH.</div><div class="sb-row">
                <button class="sp sp-m" onclick="event.stopPropagation();stepSet(${i},${si},'reps',-1)">−</button>
                <div class="sv2" id="sv-${i}-${si}-reps">${s.reps}</div>
                <button class="sp sp-p" onclick="event.stopPropagation();stepSet(${i},${si},'reps',1)">+</button>
              </div></div>
              ${!ex.is_bodyweight ? `<div class="sb"><div class="sb-lbl">KG</div><div class="sb-row">
                <button class="sp sp-m" onclick="event.stopPropagation();stepSet(${i},${si},'weight',-1)">−</button>
                <div class="sv2" id="sv-${i}-${si}-weight">${s.weight}</div>
                <button class="sp sp-p" onclick="event.stopPropagation();stepSet(${i},${si},'weight',1)">+</button>
              </div></div>` : ''}
            </div>
            <button onclick="event.stopPropagation();toggleSetDone(${i},${si})" style="margin-left:8px;flex-shrink:0;width:32px;height:32px;border-radius:9px;border:none;cursor:pointer;background:${s.done?'var(--greenBg)':'var(--border)'};color:${s.done?'var(--green)':'var(--sub)'};font-size:16px">✓</button>
          </div>`).join('')}
        <button onclick="event.stopPropagation();addSetToActive(${i})" style="width:100%;background:var(--accentBg);border:1px dashed var(--accentBd);border-radius:10px;padding:8px;color:var(--accent2);font-size:12px;font-weight:700;cursor:pointer;margin-top:2px">+ Satz</button>
        <div class="vol-badge" id="vol-${i}" style="margin-top:8px">Vol: ${vol}${ex.is_bodyweight ? ' Wdh.' : ' kg'}</div>
      </div>` : ''}
  </div>`;
}

async function renderActiveWorkout() {
  const box = document.getElementById('wv-active');
  if (!myPlanCache.length) await refreshMyPlan();

  if (wActive) {
    const totalSets = myPlanCache.reduce((sum, ex, i) => sum + getSessSets(i).length, 0);
    const doneSets  = myPlanCache.reduce((sum, ex, i) => sum + getSessSets(i).filter(s=>s.done).length, 0);
    box.innerHTML = `<div class="card active-card" style="margin-bottom:12px">
      <div class="row" style="align-items:flex-start;margin-bottom:12px">
        <div>
          <div class="active-pill"><span class="pulse">●</span> AKTIV</div>
          <div style="font-size:17px;font-weight:800">${activeDayLabel}</div>
          <div style="font-size:12px;color:var(--sub);margin-top:2px" id="timer">${fmtTime(wSecs)} · ${doneSets}/${totalSets} Sätze</div>
        </div>
        <button onclick="window.stopWorkout()" style="background:var(--redBg);border:1px solid rgba(231,69,58,.3);border-radius:11px;padding:8px 13px;color:var(--red);font-size:12px;font-weight:700;cursor:pointer">Beenden</button>
      </div>
      ${myPlanCache.map((ex, i) => exerciseCardHTML(ex, i)).join('')}
    </div>`;
  } else {
    box.innerHTML = `<button class="btn-p" onclick="window.startWorkout()" style="margin-bottom:14px">⚡ Workout starten</button>
      <div class="coach-tip"><div class="ct-icon">💡</div><div><div class="ct-lbl">TIPP</div><div class="ct-txt">Tippe auf eine Übung um sie aufzuklappen. Jeder Satz ist einzeln anpassbar – hake ihn ab sobald du ihn geschafft hast.</div></div></div>`;
  }
}

window.startWorkout = async function (dayLabel) {
  if (!myPlanCache.length) await refreshMyPlan();
  if (!myPlanCache.length) { showToast('⚠️ Dein Plan ist leer. Füge zuerst Übungen hinzu.'); return; }
  wActive = true; wSecs = 0; wDone = 0; sessData = {}; expandedEx = {};
  activeDayLabel = dayLabel || (myPlanCache[0]?.day_name || 'Workout');
  showApp('workout'); wTab('active');
  wTimer = setInterval(() => {
    wSecs++;
    const el = document.getElementById('timer');
    if (el) {
      const totalSets = myPlanCache.reduce((sum, ex, i) => sum + getSessSets(i).length, 0);
      const doneSets  = myPlanCache.reduce((sum, ex, i) => sum + getSessSets(i).filter(s=>s.done).length, 0);
      el.textContent = `${fmtTime(wSecs)} · ${doneSets}/${totalSets} Sätze`;
    }
  }, 1000);
  renderActiveWorkout();
};

window.stopWorkout = finishWorkout;

async function finishWorkout() {
  try {
    assertOnline();
    await saveSessionToHistory();
    await addWorkoutLog(currentUser.id, {
      workoutName: activeDayLabel,
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
    const sets = getSessSets(i);
    const vol = calcVolFromSets(sets, ex.is_bodyweight);
    const avgReps = Math.round(sets.reduce((s,x)=>s+x.reps,0) / sets.length);
    const avgWeight = Math.round((sets.reduce((s,x)=>s+x.weight,0) / sets.length) * 10) / 10;
    const entry = { date: today, weight: avgWeight, sets: sets.length, reps: avgReps, volume: vol };
    await appendExerciseHistory(ex.id, ex.history, entry);
    // Auch set_details in der DB aktualisieren, damit nächstes Mal diese Werte vorbefüllt sind
    await updatePlanExercise(ex.id, {
      set_details: JSON.stringify(sets.map(s => ({ reps: s.reps, weight: s.weight }))),
      sets: sets.length, reps: avgReps, weight_kg: avgWeight,
    });
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
  const u = currentProfile;
  const goals = u?.goals?.length ? u.goals : ['muscle'];
  const { byDay, warnings } = analyzeMyPlan(myPlanCache, goals);
  const goalAnalysis = analyzePlanByGoal(myPlanCache, goals);
  let html = '';

  if (myPlanCache.length === 0) {
    html += `<div class="coach-tip"><div class="ct-icon">🏆</div><div><div class="ct-lbl">COACH</div>
      <div class="ct-txt">Erstelle deinen eigenen Trainingsplan! Deine Ziele bestimmen die Struktur – Kraft- und Ausdauertage werden getrennt angezeigt und analysiert.</div></div></div>`;
  }

  if (warnings['_global']) {
    html += warnings['_global'].map((w) => `<div class="coach-warn" style="margin-bottom:12px"><div class="cw-icon">⚠️</div><div class="cw-txt">${w}</div></div>`).join('');
  }

  goalAnalysis.forEach(ga => {
    if (ga.warnings.length) {
      html += ga.warnings.map(w => `<div class="coach-warn" style="margin-bottom:10px;border-color:${ga.color}44">
        <div class="cw-icon">${ga.icon}</div><div class="cw-txt" style="color:${ga.color}">${w}</div>
      </div>`).join('');
    }
  });

  const allDays = ['A','B','C','D','E','F','G'];
  const usedDays = [...new Set(myPlanCache.map(e => e.plan_day))].sort();
  const displayDays = [...new Set([...usedDays, ...allDays.slice(0, Math.max(4, usedDays.length + 1))])];

  const dayGoalMap = {};
  myPlanCache.forEach(ex => { if (ex.plan_goal) dayGoalMap[ex.plan_day] = ex.plan_goal; });

  const GOAL_COLORS = { muscle: '#7B6EF6', cut: '#E74C3C', recomp: '#F5A623', endurance: '#2ECC71', health: '#3498DB' };

  goals.forEach((goal, gi) => {
    const gInfo = GOAL_OPTS.find(o => o.v === goal) || { l: goal, i: '🎯', v: goal };
    const gc = GOAL_COLORS[goal] || '#7B6EF6';
    const isEndurance = goal === 'endurance' || goal === 'cut';

    const goalDays = displayDays.filter(d => {
      const assigned = dayGoalMap[d];
      return assigned === goal || (!assigned && gi === 0);
    });

    html += `<div style="margin-bottom:6px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:10px 14px;background:${gc}15;border-radius:13px;border:1px solid ${gc}33">
        <span style="font-size:20px">${gInfo.i}</span>
        <div>
          <div style="font-size:14px;font-weight:800;color:${gc}">${gInfo.l}</div>
          <div style="font-size:11px;color:var(--sub)">${goalTypeHint(goal)}</div>
        </div>
        <button onclick="openAddExToMineGoal('${goal}')" style="margin-left:auto;background:${gc}22;border:1px solid ${gc}44;border-radius:9px;padding:6px 12px;color:${gc};font-size:12px;font-weight:700;cursor:pointer">+ Tag</button>
      </div>`;

    goalDays.forEach((d) => {
      const exes = (byDay[d] || []).filter(e => !e.plan_goal || e.plan_goal === goal || (gi === 0 && !e.plan_goal));
      const dayLabel = exes[0]?.day_name || ('Tag ' + d);
      html += `<div class="day-card" style="margin-left:8px;border-left:3px solid ${gc}44">
        <div class="day-hdr">
          <div>
            <div class="day-name">${dayLabel}</div>
            <div class="day-focus">${exes.length > 0
              ? isEndurance ? exes.map(e => e.exercise_name).slice(0,2).join(', ') : [...new Set(exes.map((e) => e.muscle_group))].join(', ')
              : 'Noch leer'}</div>
          </div>
          <span class="tag" style="background:${gc}15;color:${gc}">${exes.length} Einheiten</span>
        </div>
        ${exes.map((ex) => {
          const col = MUSCLE_COLORS[ex.muscle_group] || gc;
          let setDetails = [];
          try { setDetails = ex.set_details ? JSON.parse(ex.set_details) : null; } catch(e) { setDetails = null; }
          const setsLine = setDetails && setDetails.length
            ? setDetails.map(s => ex.is_bodyweight ? `${s.reps}` : `${s.reps}×${s.weight}kg`).join(' · ')
            : `${ex.sets}×${ex.reps} ${ex.is_bodyweight ? 'KG' : ex.weight_kg + 'kg'}`;
          return `<div class="ex-row"><div class="row" style="align-items:flex-start">
            <div style="flex:1">
              <div class="ex-name">${ex.exercise_name}</div>
              <div class="ex-sub">${setsLine}</div>
              ${!isEndurance ? `<span class="ex-muscle" style="background:${col}22;color:${col}">${ex.muscle_group}</span>` : ''}
            </div>
            <div style="display:flex;gap:5px;flex-shrink:0;margin-left:8px">
              <button class="edit-btn" data-edit="${ex.id}">✏️</button>
              <button class="del-btn" data-del="${ex.id}">✕</button>
            </div>
          </div></div>`;
        }).join('')}
        ${warnings[d] ? warnings[d].map((w) => `<div class="coach-warn"><div class="cw-icon">⚠️</div><div class="cw-txt">${w}</div></div>`).join('') : ''}
        <button class="add-inline-btn" data-day="${d}" data-goal="${goal}">+ Übung zu ${dayLabel} hinzufügen</button>
        ${exes.length > 0 ? `<button data-start-day="${d}" data-day-label="${dayLabel.replace(/"/g,'&quot;')}" style="width:100%;margin-top:8px;background:${gc};border:none;border-radius:11px;padding:10px;color:#fff;font-size:13px;font-weight:800;cursor:pointer">⚡ ${dayLabel} starten</button>` : ''}
      </div>`;
    });
    html += '</div>';
  });

  document.getElementById('wv-mine').innerHTML = html;
  document.querySelectorAll('#wv-mine [data-day]').forEach((btn) => {
    btn.addEventListener('click', () => openAddExToMine(btn.dataset.day, btn.dataset.goal));
  });
  document.querySelectorAll('#wv-mine [data-edit]').forEach((btn) => btn.addEventListener('click', () => editMyEx(btn.dataset.edit)));
  document.querySelectorAll('#wv-mine [data-del]').forEach((btn) => btn.addEventListener('click', () => delMyEx(btn.dataset.del)));
  document.querySelectorAll('#wv-mine [data-start-day]').forEach((btn) => {
    btn.addEventListener('click', () => {
      // Filtert myPlanCache serverseitig NICHT - Start-Button startet den kompletten aktuellen Plan
      // (myPlanCache enthält bereits alle Übungen; Nutzer kann während des Workouts durchklicken)
      window.startWorkout(btn.dataset.dayLabel);
    });
  });
}

function goalTypeHint(goal) {
  const hints = {
    muscle: 'Kraft- & Hypertrophie-Training', cut: 'Kraft + Kardio (mind. 2× / Woche)',
    recomp: 'Kraft + Kardio (1–2× / Woche)', endurance: 'Ausdauer- & Kardio-Training',
    health: 'Flexibler Mix: Kraft & Ausdauer',
  };
  return hints[goal] || '';
}

function openAddExToMine(day, goal) {
  const goalLabels = {muscle:'💪 Muskelaufbau',cut:'🔥 Fettabbau',recomp:'⚖️ Rekomposition',endurance:'🏃 Ausdauer',health:'❤️ Gesundheit'};
  const isEndurance = goal === 'endurance' || goal === 'cut';

  // Bestehenden Tag-Namen übernehmen, falls der Tag schon Übungen hat (nicht doppelt abfragen)
  const dayExes = myPlanCache.filter((e) => e.plan_day === day);
  const existingDayName = dayExes[0]?.day_name || '';
  const existingGoal = dayExes[0]?.plan_goal || goal || '';

  document.getElementById('mo-ex-title').textContent = 'Übung hinzufügen – Tag ' + day + (goal ? ' · ' + (goalLabels[goal]||goal) : '');
  document.getElementById('ex-name').value = '';
  document.getElementById('ex-day').value = day;
  const dayNameEl = document.getElementById('ex-day-name');
  if (dayNameEl) dayNameEl.value = existingDayName;
  const goalHidden = document.getElementById('ex-goal-hidden');
  if (goalHidden) goalHidden.value = existingGoal;
  document.getElementById('ex-edit-id').value = '';

  // Kraft/Ausdauer-Modus umschalten (setzt auch die Muskelgruppen-Optionen neu)
  if (typeof window.setExMode === 'function') {
    window.setExMode(isEndurance);
  }
  // Muskelgruppe & Übung IMMER leer lassen -> nichts wird aus vorherigen Eingaben übernommen
  document.getElementById('ex-muscle').value = '';
  if (typeof window.updateExerciseDropdown === 'function') window.updateExerciseDropdown();

  // Sätze zurücksetzen (leer, Nutzer fügt manuell hinzu oder wählt Vorlage)
  window._setRows = [];
  window._exBodyweight = false;
  if (typeof window.setExBodyweight === 'function') window.setExBodyweight(false);

  const dayMuscles = [...new Set(dayExes.map((e) => e.muscle_group))];
  const missing = MUSCLE_GROUPS_IMPORTANT.filter((m) => !dayMuscles.includes(m));
  document.getElementById('mo-ex-coach').innerHTML = (!isEndurance && missing.length)
    ? `<div class="coach-tip"><div class="ct-icon">💡</div><div><div class="ct-lbl">COACH-HINWEIS</div><div class="ct-txt">Tag ${day} fehlt noch: <strong>${missing.slice(0, 3).join(', ')}</strong>. Denk an Antagonisten-Balance!</div></div></div>`
    : '';
  openMo('mo-ex');
}

function openAddExToMineGoal(goal) {
  const usedDays = [...new Set(myPlanCache.map(e => e.plan_day))];
  const allDays = ['A','B','C','D','E','F','G'];
  const nextDay = allDays.find(d => !usedDays.includes(d)) || 'A';
  openAddExToMine(nextDay, goal);
}
window.openAddExToMineGoal = openAddExToMineGoal;

function editMyEx(id) {
  const ex = myPlanCache.find((e) => e.id === id);
  if (!ex) return;
  document.getElementById('mo-ex-title').textContent = 'Übung bearbeiten';
  document.getElementById('ex-day').value = ex.plan_day;
  const dayNameEl = document.getElementById('ex-day-name');
  if (dayNameEl) dayNameEl.value = ex.day_name || '';
  const goalHidden = document.getElementById('ex-goal-hidden');
  if (goalHidden) goalHidden.value = ex.plan_goal || '';
  document.getElementById('ex-edit-id').value = ex.id;

  const isEndurance = ex.plan_goal === 'endurance' || ex.plan_goal === 'cut';
  if (typeof window.setExMode === 'function') window.setExMode(isEndurance);
  document.getElementById('ex-muscle').value = ex.muscle_group;
  if (typeof window.updateExerciseDropdown === 'function') window.updateExerciseDropdown();

  // Sätze aus gespeicherten Details laden (Fallback: aus sets/reps/weight generieren)
  let setDetails = [];
  try { setDetails = ex.set_details ? JSON.parse(ex.set_details) : null; } catch(e) { setDetails = null; }
  if (!setDetails || !setDetails.length) {
    setDetails = Array.from({length: ex.sets || 1}, () => ({ reps: ex.reps, weight: ex.weight_kg }));
  }
  window._setRows = setDetails;
  window._exBodyweight = !!ex.is_bodyweight;
  if (typeof window.setExBodyweight === 'function') window.setExBodyweight(window._exBodyweight);

  // Übungsname erst NACH Dropdown-Aufbau setzen, damit er nicht überschrieben wird
  setTimeout(() => { document.getElementById('ex-name').value = ex.exercise_name; }, 0);

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

  const setRows = window._setRows || [];
  if (!setRows.length) { showToast('⚠️ Mindestens 1 Satz hinzufügen'); return; }

  const isBw = !!window._exBodyweight;
  const dayName = document.getElementById('ex-day-name')?.value?.trim() || '';
  const planGoal = document.getElementById('ex-goal-hidden')?.value || '';

  // Für Rückwärtskompatibilität: sets/reps/weight aus dem ersten Satz ableiten
  const firstSet = setRows[0];
  const payload = {
    name,
    muscle: document.getElementById('ex-muscle').value || 'Ganzkörper',
    sets: setRows.length,
    reps: firstSet.reps,
    weight: isBw ? 0 : firstSet.weight,
    bodyweight: isBw,
    day: document.getElementById('ex-day').value || 'A',
    dayName,
    goal: planGoal,
    setDetails: setRows.map(s => ({ reps: s.reps, weight: isBw ? 0 : s.weight })),
  };
  const editId = document.getElementById('ex-edit-id').value;

  try {
    assertOnline();
    if (editId) {
      await updatePlanExercise(editId, {
        exercise_name: payload.name, muscle_group: payload.muscle, sets: payload.sets,
        reps: payload.reps, weight_kg: payload.weight, is_bodyweight: payload.bodyweight,
        plan_day: payload.day, day_name: payload.dayName, plan_goal: payload.goal,
        set_details: JSON.stringify(payload.setDetails),
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
  const log = await getWorkoutLogs(currentUser.id, 30);
  document.getElementById('wv-history').innerHTML = log.length
    ? log.map((w) => `<div class="card">
        <div class="row" style="align-items:flex-start">
          <div>
            <div style="font-size:14px;font-weight:800">${w.workout_name}</div>
            <div style="font-size:12px;color:var(--sub);margin-top:2px">${w.duration_min} Min · ${w.exercise_count} Übungen</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="tag ta">${new Date(w.performed_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
            <button data-del-log="${w.id}" style="background:var(--redBg);border:none;border-radius:8px;width:28px;height:28px;color:var(--red);font-size:14px;cursor:pointer">✕</button>
          </div>
        </div>
      </div>`).join('')
    : `<div style="text-align:center;color:var(--muted);padding:32px;font-size:13px">Noch keine Workouts. Starte dein erstes!</div>`;

  document.querySelectorAll('[data-del-log]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Diesen Workout-Eintrag löschen?')) return;
      try {
        await deleteWorkoutLog(btn.dataset.delLog);
        renderWorkoutHistory();
        showToast('Eintrag gelöscht');
      } catch (e) {
        showToast('⚠️ Löschen fehlgeschlagen');
      }
    });
  });
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
  }).join('') || `<div style="text-align:center;color:var(--muted);padding:32px;font-size:13px">Führe dein erstes Workout durch um Daten zu sehen.</div>`; }

export function renderWorkout() {
  renderActiveWorkout();
  if (activeWTab === 'coach') renderCoachPlan();
  else if (activeWTab === 'mine') renderMyPlan();
  else if (activeWTab === 'history') renderWorkoutHistory(); }
