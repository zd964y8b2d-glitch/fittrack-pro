// ═══════════════════════════════════════════════════════════════════════════
// workout.js
// Aktives Workout (Sätze/Wdh./Gewicht live anpassbar), Coach-Plan-Ansicht,
// individueller "Mein Plan" (frei erstellbar inkl. Coach-Warnungen),
// Workout-Verlauf, Progressions-Charts.
// ═══════════════════════════════════════════════════════════════════════════
import {
  getMyPlan, addPlanExercise, updatePlanExercise, deletePlanExercise,
  appendExerciseHistory, getWorkoutLogs, addWorkoutLog, deleteWorkoutLog,
  resetAllProgressHistory, getMealsForToday, getWorkoutLogById,
  getBurnedCaloriesForToday, setBurnedCaloriesForToday,
  removeExerciseHistoryForDate,
} from './api.js';
import {
  MUSCLE_COLORS, MUSCLE_GROUPS_IMPORTANT, coachPlanDays, analyzeMyPlan, GOAL_OPTS, analyzePlanByGoal,
  evaluateWorkoutSession, addNutritionContextToEvaluation, getNextWorkoutTip, analyzeExercisePatterns, RPE_LABELS,
} from './coachData.js';
import { showToast, openMo, closeMo, confirmDialog, fmtTime, todayLbl, dayMonthLbl, typeLbl, showApp, mealTotals } from './ui.js';
import { assertOnline } from './offline.js';
import { buildCalendarGrid, toLocalDateStr, MONTH_NAMES, GOAL_ICONS } from './calendar.js';

let currentUser = null;
let currentProfile = null;
let myPlanCache = [];
let wActive = false, wTimer = null, wSecs = 0, wDone = 0;
let wStartTimestamp = null; // Date.now() beim Start - Timer wird daraus berechnet, nicht hochgezählt
let sessData = {}; // index -> {weight, sets, reps} während einer aktiven Session
let activeWTab = 'active';
let workoutLogCache = []; // Cache der Workout-Logs, für Muster-Erkennung und Verlauf-Anzeige
let removedEmptyDays = new Set(); // Tage, die der Nutzer bewusst entfernt hat
let collapsedGoalSections = new Set(); // Ziel-Sektionen, die eingeklappt sind
let myPlanTipsTimer = null; // Karussell-Intervall für die Tipp-/Warnkarten in "Mein Plan"
let myPlanTipItems = [];
let myPlanTipIndex = 0;
let activeExercises = []; // NUR die Übungen des gestarteten Tages (nicht der komplette Plan)

export function initWorkoutModule(user, profile) {
  currentUser = user;
  currentProfile = profile;
}

// Aktualisiert die lokale Profil-Referenz, nachdem das Profil an anderer
// Stelle (Settings) geändert wurde - z.B. neue Ziele oder neu berechnete
// Makros. Ohne diese Funktion blieb workout.js dauerhaft auf dem Stand des
// allerersten App-Starts (Coach-Plan/Zielfarben zeigten dann veraltete
// Ziele), bis die Seite manuell neu geladen wurde.
export function updateProfileRef(profile) {
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
// sessData[i] = Array individueller Sätze: [{reps, weight, done}, ...]
let expandedEx = {}; // index -> bool (aufgeklappt?)
let activeDayLabel = 'Workout';

function getSessSets(i) {
  if (!sessData[i]) {
    const ex = activeExercises[i];
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
  return sets.reduce((sum, s) => sum + (bw ? s.reps : s.reps * s.weight), 0);
}

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
    const ex = activeExercises[i];
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
    const totalSets = activeExercises.reduce((sum, ex, i) => sum + getSessSets(i).length, 0);
    const doneSets  = activeExercises.reduce((sum, ex, i) => sum + getSessSets(i).filter(s=>s.done).length, 0);
    box.innerHTML = `<div class="card active-card" style="margin-bottom:12px">
      <div class="row" style="align-items:flex-start;margin-bottom:12px">
        <div>
          <div class="active-pill"><span class="pulse">●</span> AKTIV</div>
          <div style="font-size:17px;font-weight:800">${activeDayLabel}</div>
          <div style="font-size:12px;color:var(--sub);margin-top:2px" id="timer">${fmtTime(getElapsedSeconds())} · ${doneSets}/${totalSets} Sätze</div>
        </div>
        <button onclick="window.stopWorkout()" style="background:var(--redBg);border:1px solid rgba(231,69,58,.3);border-radius:11px;padding:8px 13px;color:var(--red);font-size:12px;font-weight:700;cursor:pointer">Beenden</button>
      </div>
      ${activeExercises.map((ex, i) => exerciseCardHTML(ex, i)).join('')}
    </div>`;
  } else {
    box.innerHTML = `<div class="coach-tip"><div class="ct-icon">💡</div><div><div class="ct-lbl">TIPP</div><div class="ct-txt">Starte einen Tag direkt aus "Mein Plan" über den Button "⚡ [Tagname] starten". Tippe auf eine Übung um sie aufzuklappen, jeder Satz ist einzeln anpassbar.</div></div></div>`;
  }
}

// Berechnet die verstrichene Zeit aus dem tatsächlichen Startzeitpunkt statt
// hochzuzählen. Das ist robust gegen von Safari gedrosselte/pausierte
// Timer (z.B. bei gesperrtem Display) - die Anzeige "holt" nach dem
// Entsperren sofort die korrekte, tatsächlich verstrichene Zeit nach,
// statt Sekunden zu verlieren.
function getElapsedSeconds() {
  if (!wStartTimestamp) return 0;
  return Math.floor((Date.now() - wStartTimestamp) / 1000);
}

// Grobe Kalorienschätzung nach MET-Prinzip (Metabolic Equivalent of Task).
// MET 5.0 entspricht etwa moderatem Krafttraining. kcal = MET × Gewicht(kg) × Stunden.
// Das ist eine anerkannte Standard-Schätzformel, keine exakte Messung -
// für eine exakte Messung wäre ein Herzfrequenzsensor nötig (siehe
// "Verbrannte Kalorien" manuelles Feld in der Ernährung für echte Wearable-Daten).
const WORKOUT_MET = 5.0;
function estimateBurnedCalories(durationMin, bodyWeightKg) {
  const weight = bodyWeightKg || 75; // Fallback falls kein Gewicht im Profil hinterlegt
  const hours = durationMin / 60;
  return Math.round(WORKOUT_MET * weight * hours);
}

window.startWorkout = async function (dayLabel, day) {
  if (!myPlanCache.length) await refreshMyPlan();

  // NUR die Übungen des angeklickten Tages verwenden, nicht den ganzen Plan.
  // Ohne day-Parameter (Fallback/Altverhalten) wird der erste vorhandene Tag genommen.
  const targetDay = day || myPlanCache[0]?.plan_day;
  activeExercises = targetDay ? myPlanCache.filter((e) => e.plan_day === targetDay) : myPlanCache;

  if (!activeExercises.length) { showToast('⚠️ Dieser Tag ist leer. Füge zuerst Übungen hinzu.'); return; }

  wActive = true; wStartTimestamp = Date.now(); wSecs = 0; wDone = 0; sessData = {}; expandedEx = {};
  activeDayLabel = dayLabel || (activeExercises[0]?.day_name || 'Workout');
  showApp('workout'); wTab('active');
  wTimer = setInterval(() => {
    const el = document.getElementById('timer');
    if (el) {
      const totalSets = activeExercises.reduce((sum, ex, i) => sum + getSessSets(i).length, 0);
      const doneSets  = activeExercises.reduce((sum, ex, i) => sum + getSessSets(i).filter(s=>s.done).length, 0);
      el.textContent = `${fmtTime(getElapsedSeconds())} · ${doneSets}/${totalSets} Sätze`;
    }
  }, 1000);
  renderActiveWorkout();
};

// Schritt 1: Bestätigung "Workout jetzt beenden?"
window.stopWorkout = async function () {
  if (!(await confirmDialog('Workout jetzt beenden?'))) return;
  openMo('mo-rpe');
};

// Schritt 2: RPE-Auswahl (wird per Button-Klick im Modal aufgerufen)
window.selectRpeAndFinish = async function (rpe) {
  closeMo('mo-rpe');
  await finishWorkout(rpe);
};

// Schritt 3: Speichern + Coach-Auswertung berechnen und anzeigen
async function finishWorkout(rpe) {
  try {
    assertOnline();
    const durationMin = Math.round(getElapsedSeconds() / 60);
    const burnedKcal = estimateBurnedCalories(durationMin, currentProfile?.weight_kg);
    // Ziel des trainierten Tages ermitteln (für Kalender-Icon) - alle
    // Übungen eines Tages teilen sich dasselbe Ziel.
    const sessionGoal = activeExercises[0]?.plan_goal || currentProfile?.goals?.[0] || null;
    // Snapshot MUSS vor saveSessionToHistory() erstellt werden, da diese
    // Funktion sessData danach zurücksetzt.
    const sessionSnapshot = activeExercises.map((ex, i) => ({
      name: ex.exercise_name, muscle: ex.muscle_group,
      isBodyweight: ex.is_bodyweight, sets: getSessSets(i),
    }));
    await saveSessionToHistory();
    await addWorkoutLog(currentUser.id, {
      workoutName: activeDayLabel,
      durationMin,
      exerciseCount: activeExercises.length,
      burnedKcal,
      rpe,
      goal: sessionGoal,
      sessionSnapshot,
    });
    wActive = false; clearInterval(wTimer); wStartTimestamp = null;

    await showWorkoutEvaluation(rpe, burnedKcal, durationMin);
  } catch (err) {
    showToast(err.message?.includes('Internet') ? err.message : '⚠️ Fehler beim Speichern');
  }
}

// Baut die Coach-Auswertung auf (Punkte 3-5): Bewertung anhand Historie,
// optional Ernährungs-Kontext, und ein Tipp fürs nächste Training.
async function showWorkoutEvaluation(rpe, burnedKcal, durationMin) {
  const goal = currentProfile?.goals?.[0] || 'muscle';
  const planDaysPerWeek = currentProfile?.training_days || 3;

  // Kalorien dieser Einheit automatisch zum heutigen Tageswert addieren -
  // dieselbe Quelle (body_measurements/kind='burned'), die Home und
  // Ernährung anzeigen. Ein bereits gesetzter Quellen-Wert (z.B. "Apple
  // Health") bleibt erhalten, nur die Zahl erhöht sich; ohne bestehenden
  // Eintrag wird die Quelle "Workout" gesetzt. Ein Fehler hier ist nicht
  // kritisch - das Workout selbst ist zu diesem Zeitpunkt schon gespeichert.
  try {
    const existingBurned = await getBurnedCaloriesForToday(currentUser.id);
    const newTotal = (existingBurned?.burned_kcal || 0) + burnedKcal;
    const source = existingBurned?.burned_source || 'Workout';
    await setBurnedCaloriesForToday(currentUser.id, newTotal, source, existingBurned?.id);
  } catch (e) {
    // War bisher komplett stumm - dadurch nicht erkennbar, WARUM die
    // Synchronisation fehlschlägt. Jetzt sichtbar (Konsole + Toast), damit
    // sich das beim nächsten Test diagnostizieren lässt. Blockiert die
    // Auswertung selbst weiterhin nicht (kein "return"/"throw").
    console.error('Kalorien-Sync (Workout -> Tageswert) fehlgeschlagen:', e);
    showToast('⚠️ Verbrannte Kalorien konnten nicht mit Start/Ernährung synchronisiert werden');
  }

  const allLogs = await getWorkoutLogs(currentUser.id, 60);
  let evaluation = evaluateWorkoutSession(allLogs, planDaysPerWeek);

  // Ernährung des Tages einbeziehen, falls getrackt (Punkt 4)
  try {
    const todaysMeals = await getMealsForToday(currentUser.id);
    if (todaysMeals.length) {
      const totals = mealTotals(todaysMeals);
      const macroGoals = {
        kcal: currentProfile.macro_kcal || 2000,
        protein: currentProfile.macro_protein || 150,
      };
      evaluation = addNutritionContextToEvaluation(evaluation, totals, macroGoals);
    }
  } catch (e) { /* Ernährungsdaten optional - Fehler hier blockiert die Auswertung nicht */ }

  const nextTip = getNextWorkoutTip(goal, rpe);

  document.getElementById('eval-content').innerHTML = `
    <div class="card" style="margin-bottom:14px">
      <div class="row">
        <div><div style="font-size:24px;font-weight:900">${durationMin} Min</div><div style="font-size:11px;color:var(--sub)">Dauer</div></div>
        <div><div style="font-size:24px;font-weight:900;color:var(--orange)">~${burnedKcal}</div><div style="font-size:11px;color:var(--sub)">kcal verbrannt</div></div>
        <div><div style="font-size:24px;font-weight:900">${RPE_LABELS[rpe] || '–'}</div><div style="font-size:11px;color:var(--sub)">Einschätzung</div></div>
      </div>
    </div>
    <div id="workout-eval-tips" style="margin-bottom:10px"></div>
    <div class="coach-tip" style="margin-bottom:10px;background:var(--accentBg);border-color:var(--accentBd)">
      <div class="ct-icon">🎯</div><div><div class="ct-lbl">TIPP FÜR NÄCHSTES MAL</div><div class="ct-txt">${nextTip}</div></div>
    </div>`;

  startWorkoutEvalCarousel(evaluation.lines);
  openMo('mo-workout-eval');
}

// Zeigt die Coach-Bewertungen dieser Session nacheinander (alle 12 Sekunden)
// statt alle gleichzeitig gestapelt - analog zu Ernährung und Mein Plan.
let workoutEvalTimer = null;
let workoutEvalLines = [];
let workoutEvalIndex = 0;

function startWorkoutEvalCarousel(lines) {
  if (workoutEvalTimer) { clearInterval(workoutEvalTimer); workoutEvalTimer = null; }
  workoutEvalLines = lines;
  workoutEvalIndex = 0;
  if (!workoutEvalLines.length) return;
  renderWorkoutEvalSlide();
  if (workoutEvalLines.length > 1) {
    workoutEvalTimer = setInterval(() => {
      workoutEvalIndex = (workoutEvalIndex + 1) % workoutEvalLines.length;
      renderWorkoutEvalSlide();
    }, 12000);
  }
}

function renderWorkoutEvalSlide() {
  const el = document.getElementById('workout-eval-tips');
  if (!el || !workoutEvalLines.length) return;
  const dots = workoutEvalLines.length > 1
    ? `<div style="display:flex;gap:5px;margin-top:8px">${workoutEvalLines.map((_, i) =>
        `<span style="width:6px;height:6px;border-radius:50%;background:${i === workoutEvalIndex ? 'var(--accent2)' : 'var(--border)'}"></span>`).join('')}</div>`
    : '';
  el.innerHTML = `<div class="coach-tip"><div class="ct-icon">🏆</div><div><div class="ct-lbl">COACH-BEWERTUNG</div><div class="ct-txt">${workoutEvalLines[workoutEvalIndex]}</div>${dots}</div></div>`;
}

// Wird geklickt, wenn der Nutzer die Auswertung schließt - erst DANN zur
// Progression navigieren, damit die Auswertung nicht sofort verschwindet.
window.closeWorkoutEvaluation = async function () {
  if (workoutEvalTimer) { clearInterval(workoutEvalTimer); workoutEvalTimer = null; }
  closeMo('mo-workout-eval');
  showApp('progress');
  await renderProgression();
};

async function saveSessionToHistory() {
  const today = todayLbl();
  for (let i = 0; i < activeExercises.length; i++) {
    const ex = activeExercises[i];
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
// Zeigt die gesammelten Tipp-/Warnkarten nacheinander (alle 12 Sekunden),
// statt alle gleichzeitig gestapelt - siehe tipItems in renderMyPlan.
function startMyPlanTipsCarousel() {
  if (myPlanTipsTimer) { clearInterval(myPlanTipsTimer); myPlanTipsTimer = null; }
  if (!myPlanTipItems.length) return;
  renderMyPlanTipSlide();
  if (myPlanTipItems.length > 1) {
    myPlanTipsTimer = setInterval(() => {
      myPlanTipIndex = (myPlanTipIndex + 1) % myPlanTipItems.length;
      renderMyPlanTipSlide();
    }, 12000);
  }
}

function renderMyPlanTipSlide() {
  const el = document.getElementById('wv-mine-tips');
  if (!el || !myPlanTipItems.length) return;
  const item = myPlanTipItems[myPlanTipIndex];
  const dots = myPlanTipItems.length > 1
    ? `<div style="display:flex;gap:5px;margin-top:8px">${myPlanTipItems.map((_, i) =>
        `<span style="width:6px;height:6px;border-radius:50%;background:${i === myPlanTipIndex ? (item.color || 'var(--accent2)') : 'var(--border)'}"></span>`).join('')}</div>`
    : '';
  el.innerHTML = item.warn
    ? `<div class="coach-warn" style="${item.color ? `border-color:${item.color}44` : ''}"><div class="cw-icon">${item.icon}</div><div><div class="cw-txt" style="${item.color ? `color:${item.color}` : ''}">${item.txt}</div>${dots}</div></div>`
    : `<div class="coach-tip"><div class="ct-icon">${item.icon}</div><div>${item.label ? `<div class="ct-lbl">${item.label}</div>` : ''}<div class="ct-txt">${item.txt}</div>${dots}</div></div>`;
}

async function renderMyPlan() {
  if (!myPlanCache.length) await refreshMyPlan();
  const u = currentProfile;
  const goals = u?.goals?.length ? u.goals : ['muscle'];
  const { byDay, warnings } = analyzeMyPlan(myPlanCache, goals);
  const goalAnalysis = analyzePlanByGoal(myPlanCache, goals);

  // Alle Tipp-/Warnkarten werden gesammelt und als Karussell gezeigt (siehe
  // renderMyPlanTipSlide unten) statt gleichzeitig gestapelt - das wirkte bei
  // mehreren zutreffenden Hinweisen überladen.
  const tipItems = [];

  if (myPlanCache.length === 0) {
    tipItems.push({ icon: '🏆', label: 'COACH', txt: 'Erstelle deinen eigenen Trainingsplan! Deine Ziele bestimmen die Struktur – Kraft- und Ausdauertage werden getrennt angezeigt und analysiert.' });
  }

  if (warnings['_global']) {
    warnings['_global'].forEach((w) => tipItems.push({ icon: '⚠️', txt: w, warn: true }));
  }

  // Übungs-Muster-Erkennung (Punkt 4): Lieblingsübungen + Alternativvorschläge
  if (!workoutLogCache.length) {
    try { workoutLogCache = await getWorkoutLogs(currentUser.id, 60); } catch (e) { /* optional */ }
  }
  if (workoutLogCache.length >= 3) {
    const snapshots = workoutLogCache.map((log) => {
      try { return log.session_snapshot ? JSON.parse(log.session_snapshot) : []; } catch (e) { return []; }
    }).filter((s) => s.length);
    const patterns = analyzeExercisePatterns(myPlanCache, snapshots);

    if (patterns.favorites.length) {
      tipItems.push({ icon: '⭐', label: 'DEINE LIEBLINGSÜBUNGEN', txt: patterns.favorites.map(f => `${f.name} (${f.pct}% deiner Sessions)`).join(', ') });
    }
    if (patterns.lowVariation.length) {
      patterns.lowVariation.slice(0, 2).forEach((lv) => {
        tipItems.push({ icon: '💡', label: `ABWECHSLUNG FÜR ${lv.muscle.toUpperCase()}`, txt: `Du nutzt bisher nur "${lv.usedName}". Zur Abwechslung: ${lv.alternatives.join(' oder ')}.` });
      });
    }
  }

  // Anstrengungs-Trend (RPE) der letzten Einheiten - dieselbe Konsistenz-
  // Logik wie in der einmaligen Workout-Bewertung (evaluateWorkoutSession),
  // hier aber dauerhaft im Hintergrund sichtbar statt nur direkt nach einer
  // Session. workoutLogCache ist neueste-zuerst sortiert (siehe getWorkoutLogs).
  const recentRpeValues = workoutLogCache.slice(0, 5).map((l) => l.rpe).filter(Boolean);
  if (recentRpeValues.length >= 3) {
    const avgRpe = recentRpeValues.reduce((s, r) => s + r, 0) / recentRpeValues.length;
    if (avgRpe >= 3.5) {
      tipItems.push({ icon: '🔋', label: 'REGENERATION', txt: 'Deine letzten Einheiten waren durchgehend sehr anstrengend. Plane bewusst einen Ruhetag oder eine leichtere Einheit (Deload) ein, um Übertraining zu vermeiden.', warn: true });
    } else if (avgRpe <= 1.5) {
      tipItems.push({ icon: '📈', label: 'TRAININGSREIZ', txt: 'Deine letzten Einheiten fühlten sich eher leicht an. Steigere Gewicht, Wiederholungen oder Sätze, um den Fortschritt zu beschleunigen.' });
    }
  }

  goalAnalysis.forEach(ga => {
    if (ga.warnings.length) {
      ga.warnings.forEach(w => tipItems.push({ icon: ga.icon, txt: w, warn: true, color: ga.color }));
    }
  });

  myPlanTipItems = tipItems;
  myPlanTipIndex = 0;
  let html = tipItems.length ? '<div id="wv-mine-tips" style="margin-bottom:10px"></div>' : '';

  const allDays = ['A','B','C','D','E','F','G'];
  const usedDays = [...new Set(myPlanCache.map(e => e.plan_day))].sort();
  // Anzahl der vorausgefüllten leeren Tage richtet sich nach der im Profil
  // gewählten Trainingshäufigkeit (z.B. 2x/Woche -> Tag A+B statt fix 4 Tage).
  // Bereits befüllte Tage zählen natürlich immer, auch wenn es mehr sind
  // als die ursprünglich gewählte Häufigkeit.
  const targetDayCount = Math.max(u?.training_days || 3, usedDays.length);
  const displayDays = [...new Set([...usedDays, ...allDays.slice(0, targetDayCount)])].filter(d => usedDays.includes(d) || !removedEmptyDays.has(d));

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

    const isCollapsed = collapsedGoalSections.has(goal);
    html += `<div style="margin-bottom:6px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:10px 14px;background:${gc}15;border-radius:13px;border:1px solid ${gc}33">
        <div data-toggle-goal-section="${goal}" style="display:flex;align-items:center;gap:8px;flex:1;cursor:pointer">
          <span style="font-size:20px">${gInfo.i}</span>
          <div>
            <div style="font-size:14px;font-weight:800;color:${gc}">${gInfo.l}</div>
            <div style="font-size:11px;color:var(--sub)">${goalTypeHint(goal)}</div>
          </div>
          <span style="margin-left:6px;font-size:16px;color:${gc};transform:rotate(${isCollapsed ? -90 : 0}deg);transition:transform .2s;display:inline-block">▾</span>
        </div>
        <button onclick="openAddExToMineGoal('${goal}')" style="background:${gc}22;border:1px solid ${gc}44;border-radius:9px;padding:6px 12px;color:${gc};font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0">+ Tag</button>
      </div>`;

    if (!isCollapsed) {
    goalDays.forEach((d) => {
      const exes = (byDay[d] || []).filter(e => !e.plan_goal || e.plan_goal === goal || (gi === 0 && !e.plan_goal));
      const dayLabel = exes[0]?.day_name || ('Tag ' + d);
      const goalOptionsHtml = GOAL_OPTS.map(g => `<option value="${g.v}" ${g.v === goal ? 'selected' : ''}>${g.i} ${g.l}</option>`).join('');
      html += `<div class="day-card" style="margin-left:8px;border-left:3px solid ${gc}44">
        <div class="day-hdr">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:6px">
              <div class="day-name">${dayLabel}</div>
              <button data-edit-dayname="${d}" data-dayname-current="${dayLabel.replace(/"/g,'&quot;')}" style="background:none;border:none;color:var(--sub);font-size:12px;cursor:pointer;padding:2px">✏️</button>
            </div>
            <div class="day-focus">${exes.length > 0
              ? isEndurance ? exes.map(e => e.exercise_name).slice(0,2).join(', ') : [...new Set(exes.map((e) => e.muscle_group))].join(', ')
              : 'Noch leer'}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <span class="tag" style="background:${gc}15;color:${gc}">${exes.length} Einheiten</span>
            ${exes.length === 0 ? `<button data-del-day="${d}" style="background:var(--redBg);border:none;border-radius:8px;width:26px;height:26px;color:var(--red);font-size:13px;cursor:pointer">✕</button>` : ''}
          </div>
        </div>
        <div class="ig" style="margin-top:8px;margin-bottom:8px">
          <select class="oi" data-day-goal-select="${d}" style="font-size:12px;padding:8px 10px">${goalOptionsHtml}</select>
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
    } // Ende if (!isCollapsed)
    html += '</div>';
  });

  document.getElementById('wv-mine').innerHTML = html;
  startMyPlanTipsCarousel();
  document.querySelectorAll('#wv-mine [data-day]').forEach((btn) => {
    btn.addEventListener('click', () => openAddExToMine(btn.dataset.day, btn.dataset.goal));
  });
  document.querySelectorAll('#wv-mine [data-edit]').forEach((btn) => btn.addEventListener('click', () => editMyEx(btn.dataset.edit)));
  document.querySelectorAll('#wv-mine [data-del]').forEach((btn) => btn.addEventListener('click', () => delMyEx(btn.dataset.del)));
  document.querySelectorAll('#wv-mine [data-del-day]').forEach((btn) => btn.addEventListener('click', () => deleteEmptyDay(btn.dataset.delDay)));
  document.querySelectorAll('#wv-mine [data-day-goal-select]').forEach((sel) => {
    sel.addEventListener('change', () => reassignDayGoal(sel.dataset.dayGoalSelect, sel.value));
  });
  document.querySelectorAll('#wv-mine [data-toggle-goal-section]').forEach((el) => {
    el.addEventListener('click', () => toggleGoalSection(el.dataset.toggleGoalSection));
  });
  document.querySelectorAll('#wv-mine [data-edit-dayname]').forEach((btn) => {
    btn.addEventListener('click', () => editDayName(btn.dataset.editDayname, btn.dataset.daynameCurrent));
  });
  document.querySelectorAll('#wv-mine [data-start-day]').forEach((btn) => {
    btn.addEventListener('click', () => {
      // Startet NUR die Übungen dieses einen Tages (day-Parameter),
      // nicht den kompletten "Mein Plan" über alle Tage/Ziele hinweg.
      window.startWorkout(btn.dataset.dayLabel, btn.dataset.startDay);
    });
  });
}

// Löscht einen leeren Tag - da ohne Übungen kein DB-Eintrag existiert,
// muss hier nur der lokale Tag aus der Anzeige entfernt werden. Da Tage
// rein aus den vorhandenen Übungen abgeleitet werden (kein eigener
// Datensatz pro Tag), reicht ein Re-Render nach kurzer Bestätigung.
async function deleteEmptyDay(day) {
  if (!(await confirmDialog(`Tag ${day} wirklich entfernen?`))) return;
  // Leere Tage haben keine Übungen und damit keine DB-Einträge zum Löschen.
  // Wir merken uns den entfernten Tag, damit er nicht erneut als "leerer
  // Vorschlag" auftaucht, bis der Nutzer bewusst einen neuen Tag anlegt.
  removedEmptyDays.add(day);
  renderMyPlan();
  showToast('Tag entfernt');
}

// Ändert das Ziel, dem ein kompletter Tag zugeordnet ist - wirkt sich auf
// ALLE Übungen dieses Tages aus (plan_goal wird für jede Übung aktualisiert).
async function reassignDayGoal(day, newGoal) {
  const dayExercises = myPlanCache.filter((e) => e.plan_day === day);
  if (!dayExercises.length) return;
  try {
    assertOnline();
    for (const ex of dayExercises) {
      await updatePlanExercise(ex.id, { plan_goal: newGoal });
    }
    await refreshMyPlan();
    renderMyPlan();
    showToast('✅ Ziel-Zuordnung aktualisiert');
  } catch (e) {
    showToast('⚠️ Aktualisierung fehlgeschlagen');
  }
}

function toggleGoalSection(goal) {
  if (collapsedGoalSections.has(goal)) collapsedGoalSections.delete(goal);
  else collapsedGoalSections.add(goal);
  renderMyPlan();
}

// Benennt einen kompletten Plan-Tag um (wirkt sich auf ALLE Übungen dieses
// Tages aus, da day_name pro Übung gespeichert wird, aber logisch dem
// ganzen Tag gehört).
let renamingDay = null; // Tag-Schlüssel (z.B. "A"), während mo-day-rename offen ist

function editDayName(day, currentName) {
  renamingDay = day;
  document.getElementById('day-rename-input').value = currentName;
  openMo('mo-day-rename');
}

export async function saveDayRename() {
  const newName = document.getElementById('day-rename-input').value.trim();
  if (!newName) { showToast('⚠️ Name darf nicht leer sein'); return; }
  const dayExercises = myPlanCache.filter((e) => e.plan_day === renamingDay);
  if (!dayExercises.length) { closeMo('mo-day-rename'); return; }
  try {
    assertOnline();
    for (const ex of dayExercises) {
      await updatePlanExercise(ex.id, { day_name: newName });
    }
    await refreshMyPlan();
    closeMo('mo-day-rename');
    renderMyPlan();
    showToast('✅ Name geändert');
  } catch (e) {
    showToast('⚠️ Umbenennen fehlgeschlagen');
  }
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
  workoutLogCache = await getWorkoutLogs(currentUser.id, 60);
  renderHistoryList();
}

function renderHistoryList() {
  const log = workoutLogCache;
  document.getElementById('hv-list').innerHTML = log.length
    ? log.map((w) => `<div class="card" data-open-session="${w.id}" style="cursor:pointer">
        <div class="row" style="align-items:flex-start">
          <div>
            <div style="font-size:14px;font-weight:800">${w.workout_name}</div>
            <div style="font-size:12px;color:var(--sub);margin-top:2px">${w.duration_min} Min · ${w.exercise_count} Übungen${w.burned_kcal ? ` · 🔥 ~${w.burned_kcal} kcal` : ''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="tag ta">${new Date(w.performed_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
            <button data-del-log="${w.id}" data-del-date="${dayMonthLbl(new Date(w.performed_at))}" data-del-kcal="${w.burned_kcal || 0}" style="background:var(--redBg);border:none;border-radius:8px;width:28px;height:28px;color:var(--red);font-size:14px;cursor:pointer">✕</button>
          </div>
        </div>
      </div>`).join('')
    : `<div style="text-align:center;color:var(--muted);padding:32px;font-size:13px">Noch keine Workouts. Starte dein erstes!</div>`;

  document.querySelectorAll('#hv-list [data-open-session]').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-del-log]')) return; // Löschen-Klick nicht als "öffnen" werten
      openSessionDetail(card.dataset.openSession);
    });
  });

  document.querySelectorAll('[data-del-log]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!(await confirmDialog('Diesen Workout-Eintrag löschen?'))) return;
      try {
        await deleteWorkoutLog(btn.dataset.delLog);
        // Zugehörige Fortschritts-Datenpunkte (je Übung) für dasselbe Datum
        // ebenfalls entfernen - sonst zeigt "Fortschritt" weiterhin einen
        // Datenpunkt für ein bereits gelöschtes Workout.
        if (btn.dataset.delDate) {
          await removeExerciseHistoryForDate(currentUser.id, btn.dataset.delDate);
        }
        // War die gelöschte Einheit von HEUTE, auch ihren Kalorien-Beitrag
        // aus dem heutigen "Verbrannte Kalorien"-Wert wieder herausrechnen -
        // sonst bleibt er dort fälschlich stehen (siehe Anforderung 4).
        const delKcal = parseInt(btn.dataset.delKcal) || 0;
        if (delKcal > 0 && btn.dataset.delDate === todayLbl()) {
          try {
            const existingBurned = await getBurnedCaloriesForToday(currentUser.id);
            if (existingBurned) {
              const newTotal = Math.max(0, existingBurned.burned_kcal - delKcal);
              await setBurnedCaloriesForToday(currentUser.id, newTotal, existingBurned.burned_source, existingBurned.id);
            }
          } catch (e) { /* nicht kritisch - Löschen selbst war bereits erfolgreich */ }
        }
        renderWorkoutHistory();
        showToast('Eintrag gelöscht');
      } catch (e) {
        showToast('⚠️ Löschen fehlgeschlagen');
      }
    });
  });
}

// ── VERLAUF: DETAIL-ANSICHT EINER SESSION ────────────────────────────────
async function openSessionDetail(logId) {
  let log = workoutLogCache.find((w) => w.id === logId);
  // Fallback: Log nicht im Cache (z.B. Sprung aus dem Kalender für einen
  // Monat, der noch nicht per renderWorkoutHistory geladen wurde) - direkt
  // per ID nachladen statt einfach nichts zu tun.
  if (!log) {
    try { log = await getWorkoutLogById(logId); } catch (e) { log = null; }
  }
  if (!log) { showToast('⚠️ Workout nicht gefunden'); return; }

  document.getElementById('session-detail-title').textContent = log.workout_name;

  let snapshot = [];
  try { snapshot = log.session_snapshot ? JSON.parse(log.session_snapshot) : []; } catch (e) { snapshot = []; }

  const dateLabel = new Date(log.performed_at).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const header = `<div class="card" style="margin-bottom:14px">
    <div style="font-size:12px;color:var(--sub);margin-bottom:8px">${dateLabel}</div>
    <div class="row">
      <div><div style="font-size:20px;font-weight:900">${log.duration_min}</div><div style="font-size:10px;color:var(--sub)">Minuten</div></div>
      <div><div style="font-size:20px;font-weight:900;color:var(--orange)">${log.burned_kcal || 0}</div><div style="font-size:10px;color:var(--sub)">kcal</div></div>
      <div><div style="font-size:20px;font-weight:900">${log.exercise_count}</div><div style="font-size:10px;color:var(--sub)">Übungen</div></div>
    </div>
  </div>`;

  const exercisesHtml = snapshot.length
    ? snapshot.map((ex) => {
        const col = MUSCLE_COLORS[ex.muscle] || '#8888A0';
        const setsLine = (ex.sets || []).map((s) => ex.isBodyweight ? `${s.reps}` : `${s.reps}×${s.weight}kg`).join(' · ');
        return `<div class="ex-row">
          <div class="ex-name">${ex.name}</div>
          <span class="ex-muscle" style="background:${col}22;color:${col}">${ex.muscle}</span>
          <div class="ex-sub" style="margin-top:4px">${setsLine}</div>
        </div>`;
      }).join('')
    : `<div style="text-align:center;color:var(--muted);padding:16px;font-size:12px">Für dieses Workout sind keine Detaildaten gespeichert (z.B. weil es vor diesem Feature abgeschlossen wurde).</div>`;

  document.getElementById('session-detail-content').innerHTML = header + exercisesHtml;
  openMo('mo-session-detail');
}

// ── MANUELLES TRAINING NACHTRAGEN (inkl. Gehen/Laufen) ───────────────────
// Distanz-basierte Kalorienschätzung für Gehen/Laufen - präziser als eine
// reine Zeit-MET-Schätzung, da sie die tatsächliche Strecke berücksichtigt.
// Werte aus etablierter Sportmedizin: ca. 0.5 kcal/kg/km beim Gehen,
// ca. 1.0 kcal/kg/km beim Laufen (relativ tempo-unabhängig, da höheres
// Tempo zwar mehr Energie/Zeit kostet, aber auch die Zeit verkürzt).
const KCAL_PER_KG_PER_KM = { walk: 0.5, run: 1.0 };

// Durchschnittliche Schrittlänge zur Schätzung der Schrittzahl aus der
// Distanz. Wird an die Körpergröße angepasst, falls im Profil vorhanden
// (größere Menschen haben tendenziell längere Schritte).
function estimateStepsFromDistance(km, heightCm) {
  const heightM = (heightCm || 175) / 100;
  const strideLength = heightM * 0.414; // gängige biomechanische Schätzformel
  return Math.round((km * 1000) / strideLength);
}

export function openManualWorkoutModal() {
  document.getElementById('mw-date').value = toLocalDateInputValue(new Date());
  document.getElementById('mw-type').value = 'strength';
  document.getElementById('mw-name').value = '';
  document.getElementById('mw-duration').value = '';
  document.getElementById('mw-distance').value = '';
  document.getElementById('mw-steps').value = '';
  document.getElementById('mw-rpe').value = '2';
  toggleManualWorkoutFields();
  updateManualWorkoutPreview();
  openMo('mo-manual-workout');
}

function toLocalDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Zeigt/versteckt die Distanz- und Schritte-Felder je nach gewählter Art,
// und befüllt die Schrittzahl automatisch vor (bleibt editierbar).
export function toggleManualWorkoutFields() {
  const type = document.getElementById('mw-type').value;
  const isWalkOrRun = type === 'walk' || type === 'run';
  document.getElementById('mw-distance-group').style.display = isWalkOrRun ? '' : 'none';
  document.getElementById('mw-steps-group').style.display = isWalkOrRun ? '' : 'none';
  updateManualWorkoutPreview();
}

export function onManualWorkoutDistanceInput() {
  const type = document.getElementById('mw-type').value;
  const distance = parseFloat(document.getElementById('mw-distance').value) || 0;
  if ((type === 'walk' || type === 'run') && distance > 0) {
    const steps = estimateStepsFromDistance(distance, currentProfile?.height_cm);
    document.getElementById('mw-steps').value = steps;
  }
  updateManualWorkoutPreview();
}

function updateManualWorkoutPreview() {
  const type = document.getElementById('mw-type').value;
  const duration = parseInt(document.getElementById('mw-duration').value) || 0;
  const distance = parseFloat(document.getElementById('mw-distance').value) || 0;
  const weight = currentProfile?.weight_kg || 75;

  let kcal;
  if (type === 'walk' || type === 'run') {
    kcal = Math.round(distance * weight * KCAL_PER_KG_PER_KM[type]);
  } else {
    kcal = estimateBurnedCalories(duration, weight);
  }
  document.getElementById('mw-kcal-preview').textContent = `${kcal} kcal`;
}

export async function saveManualWorkout() {
  const type = document.getElementById('mw-type').value;
  const name = document.getElementById('mw-name').value.trim() ||
    { strength: 'Krafttraining', walk: 'Spaziergang', run: 'Lauftraining', other: 'Ausdauertraining' }[type];
  const duration = parseInt(document.getElementById('mw-duration').value) || 0;
  const distance = parseFloat(document.getElementById('mw-distance').value) || 0;
  const steps = parseInt(document.getElementById('mw-steps').value) || 0;
  const rpe = parseInt(document.getElementById('mw-rpe').value);
  const dateStr = document.getElementById('mw-date').value;

  if (!duration && !distance) { showToast('⚠️ Bitte Dauer oder Strecke angeben'); return; }

  const weight = currentProfile?.weight_kg || 75;
  const isWalkOrRun = type === 'walk' || type === 'run';
  const burnedKcal = isWalkOrRun
    ? Math.round(distance * weight * KCAL_PER_KG_PER_KM[type])
    : estimateBurnedCalories(duration, weight);

  const goalMap = { strength: currentProfile?.goals?.[0] || 'muscle', walk: 'endurance', run: 'endurance', other: 'endurance' };

  try {
    assertOnline();
    const performedAt = new Date(dateStr + 'T12:00:00').toISOString();
    await addWorkoutLog(currentUser.id, {
      workoutName: name,
      durationMin: duration,
      exerciseCount: isWalkOrRun ? 1 : 0,
      burnedKcal,
      rpe,
      goal: goalMap[type],
      sessionSnapshot: isWalkOrRun
        ? [{ name, muscle: 'Ganzkörper', isBodyweight: true, sets: [{ reps: 1, weight: 0, done: true }], distanceKm: distance, steps }]
        : [],
      performedAtOverride: performedAt,
    });
    closeMo('mo-manual-workout');
    renderWorkoutHistory();
    showToast('✅ Training nachgetragen');
  } catch (e) {
    showToast('⚠️ Speichern fehlgeschlagen');
  }
}

// Öffentlicher Einstiegspunkt: springt direkt zu einer Session-Detailansicht,
// z.B. von einem "Öffnen"-Button im Kalender-Tagesdetail aus.
export async function jumpToWorkoutLog(logId) {
  closeMo('mo-cal-day-detail');
  closeMo('mo-calendar');
  showApp('workout');
  wTab('history');
  await openSessionDetail(logId);
}

// ── VERLAUF: LISTE / KALENDER TOGGLE ──────────────────────────────────────
let historyCalMonth = new Date().getMonth();
let historyCalYear = new Date().getFullYear();

export function switchHistoryTab(tab) {
  document.getElementById('htab-list').classList.toggle('active', tab === 'list');
  document.getElementById('htab-calendar').classList.toggle('active', tab === 'calendar');
  document.getElementById('hv-list').style.display = tab === 'list' ? '' : 'none';
  document.getElementById('hv-calendar').style.display = tab === 'calendar' ? '' : 'none';
  if (tab === 'calendar') renderHistoryCalendar();
}

// Nutzt die gemeinsame Grid-Engine aus calendar.js - keine eigene Kalender-
// Logik mehr. Vorher war hier eine komplette Zweit-Implementierung des
// Monatsrasters dupliziert (eigene toLocalDateStr, eigene Monatsnamen,
// eigene Zell-Loop), die optisch fast, aber nicht ganz identisch zur
// Übersicht war (nur generisches 🏋️ statt zielspezifischer Icons).
function renderHistoryCalendar() {
  document.getElementById('hcal-month-label').textContent = `${MONTH_NAMES[historyCalMonth]} ${historyCalYear}`;

  // Log-Einträge des sichtbaren Monats nach Tag gruppieren
  const byDay = {};
  workoutLogCache.forEach((w) => {
    const d = new Date(w.performed_at);
    if (d.getMonth() === historyCalMonth && d.getFullYear() === historyCalYear) {
      const key = toLocalDateStr(d);
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(w);
    }
  });

  document.getElementById('hcal-grid').innerHTML = buildCalendarGrid(historyCalYear, historyCalMonth, (dateStr) => {
    const dayLogs = byDay[dateStr] || [];
    if (!dayLogs.length) return { clickable: false };
    const uniqueGoals = [...new Set(dayLogs.map((w) => w.log_goal || '_generic'))];
    const icons = uniqueGoals.slice(0, 2).map((g) => GOAL_ICONS[g] || '🏋️');
    return { icons, clickable: true };
  });

  document.querySelectorAll('#hcal-grid [data-cal-day]').forEach((el) => {
    el.addEventListener('click', () => {
      const dayLogs = byDay[el.dataset.calDay];
      if (dayLogs?.length) openSessionDetail(dayLogs[0].id); // Erstes Workout des Tages öffnen
    });
  });
}

export function historyCalPrevMonth() {
  historyCalMonth--;
  if (historyCalMonth < 0) { historyCalMonth = 11; historyCalYear--; }
  renderHistoryCalendar();
}

export function historyCalNextMonth() {
  historyCalMonth++;
  if (historyCalMonth > 11) { historyCalMonth = 0; historyCalYear++; }
  renderHistoryCalendar();
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

export async function resetProgress() {
  if (!(await confirmDialog('Möchtest du wirklich deinen gesamten Trainingsfortschritt zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden.'))) return;
  try {
    assertOnline();
    await resetAllProgressHistory(currentUser.id);
    await refreshMyPlan();
    await renderProgression();
    showToast('✅ Fortschritt zurückgesetzt');
  } catch (e) {
    showToast('⚠️ Zurücksetzen fehlgeschlagen');
  }
}

export function renderWorkout() {
  renderActiveWorkout();
  if (activeWTab === 'coach') renderCoachPlan();
  else if (activeWTab === 'mine') renderMyPlan();
  else if (activeWTab === 'history') renderWorkoutHistory();
}
