// ═══════════════════════════════════════════════════════════════════════════
// onboarding.js
// Coach-Onboarding nach Registrierung: Ziele (max. 3), Trainingsarten
// (max. 3), Level, Körperdaten, Trainingstage, Zusammenfassung.
// Schreibt am Ende das Profil + den initialen Plan nach Supabase.
// ═══════════════════════════════════════════════════════════════════════════
import { updateProfile } from './api.js';
import { GOAL_OPTS, TYPE_OPTS, LEVEL_OPTS, calcMacros, dayTip, getCoachPlan } from './coachData.js';
import { showPage, showToast } from './ui.js';
import { addPlanExercise } from './api.js';

const OB_STEPS = ['goals', 'trainingTypes', 'level', 'profile', 'days', 'summary'];
let obStep = 0;
let obData = {};
let currentUserId = null;
let onFinishCallback = null;

const OB_INFO = {
  goals: { title: 'Deine Ziele', coach: 'Ich brauche deine Ziele, um deinen Plan maßzuschneidern. Du kannst bis zu 3 Ziele wählen – sei ehrlich, das ist die Basis für alles. Primär zählt die erste Auswahl.' },
  trainingTypes: { title: 'Trainingsumgebung', coach: 'Wo und wie trainierst du? Bis zu 3 Umgebungen möglich. Der Plan wird auf die verfügbaren Ressourcen optimiert.' },
  level: { title: 'Trainingserfahrung', coach: 'Dein Level bestimmt Volumen, Intensität und Progression im Plan. Sei realistisch.' },
  profile: { title: 'Dein Körper', coach: 'Exakte Körperdaten = exakte Kalorien. Ich berechne deinen TDEE per Mifflin-St-Jeor und passe ihn an dein Ziel an.' },
  days: { title: 'Trainingstage', coach: 'Lieber 3 Tage konsequent als 6 Tage halbherzig. Wähle was du wirklich durchhalten kannst.' },
  summary: { title: 'Dein persönlicher Plan', coach: 'Auf Basis deiner Daten habe ich deinen individualisierten Plan erstellt. Starten wir!' },
};

export function startOnboarding(userId, existingProfile, onFinish) {
  currentUserId = userId;
  onFinishCallback = onFinish;
  obStep = 0;
  obData = {
    goals: [], trainingTypes: [], level: null,
    profile: {
      name: existingProfile?.name || '',
      age: existingProfile?.age || 0,
      weight: existingProfile?.weight_kg || 0,
      height: existingProfile?.height_cm || 0,
      sex: existingProfile?.sex || 'male',
    },
    days: 4,
  };
  showPage('onboarding');
  renderOb();
}

function renderOb() {
  const key = OB_STEPS[obStep];
  const info = OB_INFO[key];
  document.getElementById('ob-bar').innerHTML = OB_STEPS.map((_, i) => `<div class="ob-step-dot${i <= obStep ? ' done' : ''}"></div>`).join('');
  document.getElementById('ob-title').textContent = info.title;
  document.getElementById('ob-msg').textContent = info.coach;
  document.getElementById('ob-back').style.display = obStep > 0 ? '' : 'none';
  document.getElementById('ob-next').textContent = obStep === OB_STEPS.length - 1 ? '🚀 Plan aktivieren' : 'Weiter →';
  const body = document.getElementById('ob-body');

  if (key === 'goals') {
    body.innerHTML = `<p class="ob-section-sub">Wähle 1–3 Ziele (Priorität = Reihenfolge)</p>
      <div class="choice-grid">${GOAL_OPTS.map((o) => `
        <div class="cc${obData.goals.includes(o.v) ? ' sel' : ''}" data-field="goals" data-val="${o.v}">
          <div class="ck">✓</div><div class="cc-icon">${o.i}</div>
          <div class="cc-lbl">${o.l}</div><div class="cc-sub">${o.s}</div>
        </div>`).join('')}</div>`;
    body.querySelectorAll('.cc').forEach((el) => el.addEventListener('click', () => obMultiSel('goals', el, el.dataset.val, 3)));
  } else if (key === 'trainingTypes') {
    body.innerHTML = `<p class="ob-section-sub">Wähle 1–3 Umgebungen</p>
      <div class="choice-grid">${TYPE_OPTS.map((o) => `
        <div class="cc${obData.trainingTypes.includes(o.v) ? ' sel' : ''}" data-field="trainingTypes" data-val="${o.v}">
          <div class="ck">✓</div><div class="cc-icon">${o.i}</div>
          <div class="cc-lbl">${o.l}</div><div class="cc-sub">${o.s}</div>
        </div>`).join('')}</div>`;
    body.querySelectorAll('.cc').forEach((el) => el.addEventListener('click', () => obMultiSel('trainingTypes', el, el.dataset.val, 3)));
  } else if (key === 'level') {
    body.innerHTML = `<div class="choice-grid cols1">${LEVEL_OPTS.map((o) => `
      <div class="cc${obData.level === o.v ? ' sel' : ''}" data-val="${o.v}" style="text-align:left;display:flex;align-items:center;gap:12px">
        <span style="font-size:26px">${o.i}</span>
        <div><div class="cc-lbl">${o.l}</div><div class="cc-sub">${o.s}</div></div>
      </div>`).join('')}</div>`;
    body.querySelectorAll('.cc').forEach((el) => el.addEventListener('click', () => obSingleSel('level', el.dataset.val, el)));
  } else if (key === 'profile') {
    const p = obData.profile;
    body.innerHTML = `<div class="ir">
      <div class="ig"><label>Alter</label><input id="ob-age" class="oi" type="number" inputmode="numeric" placeholder="25" value="${p.age || ''}"></div>
      <div class="ig"><label>Gewicht (kg)</label><input id="ob-weight" class="oi" type="number" inputmode="decimal" placeholder="80" value="${p.weight || ''}"></div>
    </div>
    <div class="ir">
      <div class="ig"><label>Größe (cm)</label><input id="ob-height" class="oi" type="number" inputmode="numeric" placeholder="180" value="${p.height || ''}"></div>
      <div class="ig"><label>Geschlecht</label>
        <select id="ob-sex" class="oi">
          <option value="male" ${p.sex === 'male' ? 'selected' : ''}>Männlich</option>
          <option value="female" ${p.sex === 'female' ? 'selected' : ''}>Weiblich</option>
        </select>
      </div>
    </div>`;
  } else if (key === 'days') {
    const d = obData.days;
    body.innerHTML = `<div style="text-align:center;margin-bottom:20px">
      <div style="font-size:60px;font-weight:900;color:var(--accent);letter-spacing:-2px" id="day-disp">${d}</div>
      <div style="font-size:13px;color:var(--sub)">Trainingstage / Woche</div>
    </div>
    <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px">
      ${[1, 2, 3, 4, 5, 6, 7].map((n) => `<button data-day="${n}" style="width:36px;height:36px;border-radius:10px;border:1.5px solid ${n === d ? 'var(--accent)' : 'var(--border)'};background:${n === d ? 'var(--accentBg)' : 'var(--card)'};color:${n === d ? 'var(--accent2)' : 'var(--sub)'};font-size:13px;font-weight:800;cursor:pointer">${n}</button>`).join('')}
    </div>
    <div class="coach-tip"><div class="ct-icon">💡</div><div><div class="ct-lbl">COACH</div><div class="ct-txt" id="day-tip">${dayTip(d)}</div></div></div>`;
    body.querySelectorAll('[data-day]').forEach((btn) => btn.addEventListener('click', () => setDays(parseInt(btn.dataset.day))));
  } else if (key === 'summary') {
    const macros = calcMacros({ weight_kg: obData.profile.weight, height_cm: obData.profile.height, age: obData.profile.age, sex: obData.profile.sex }, obData.goals, obData.days);
    obData.macros = macros;
    const gls = obData.goals.map((v) => GOAL_OPTS.find((o) => o.v === v)?.l).join(', ');
    const tps = obData.trainingTypes.map((v) => TYPE_OPTS.find((o) => o.v === v)?.l).join(', ');
    const lvl = LEVEL_OPTS.find((o) => o.v === obData.level)?.l;
    body.innerHTML = `
      <div class="sum-card">
        <div class="sum-row"><span class="sum-key">Ziele</span><span class="sum-val">${gls}</span></div>
        <div class="sum-row"><span class="sum-key">Training</span><span class="sum-val">${tps}</span></div>
        <div class="sum-row"><span class="sum-key">Level</span><span class="sum-val">${lvl}</span></div>
        <div class="sum-row"><span class="sum-key">Trainingstage</span><span class="sum-val">${obData.days}× / Woche</span></div>
        <div class="sum-row"><span class="sum-key">Gewicht</span><span class="sum-val">${obData.profile.weight} kg</span></div>
      </div>
      <div class="slbl">Coach-Makros (täglich)</div>
      <div class="sum-card">
        <div class="sum-row"><span class="sum-key">Kalorien</span><span class="sum-val" style="color:var(--orange)">${macros.kcal} kcal</span></div>
        <div class="sum-row"><span class="sum-key">Protein</span><span class="sum-val" style="color:var(--accent2)">${macros.protein} g</span></div>
        <div class="sum-row"><span class="sum-key">Kohlenhydrate</span><span class="sum-val" style="color:var(--green)">${macros.carbs} g</span></div>
        <div class="sum-row"><span class="sum-key">Fett</span><span class="sum-val" style="color:var(--orange)">${macros.fat} g</span></div>
      </div>
      <div class="coach-tip"><div class="ct-icon">🏆</div><div><div class="ct-lbl">COACH</div>
      <div class="ct-txt">Diese Werte sind deine Startbasis. In 2-3 Wochen passen wir sie an deinen Fortschritt an.</div></div></div>`;
  }
}

function obMultiSel(field, el, val, max) {
  const arr = obData[field];
  if (arr.includes(val)) {
    obData[field] = arr.filter((v) => v !== val);
    el.classList.remove('sel');
  } else {
    if (arr.length >= max) { showToast(`⚠️ Max. ${max} Auswahl`); return; }
    obData[field] = [...arr, val];
    el.classList.add('sel');
  }
}

function obSingleSel(field, val, el) {
  obData[field] = val;
  el.closest('.choice-grid').querySelectorAll('.cc').forEach((c) => c.classList.remove('sel'));
  el.classList.add('sel');
}

function setDays(n) {
  obData.days = n;
  document.getElementById('day-disp').textContent = n;
  document.querySelectorAll('[data-day]').forEach((b) => {
    const isA = parseInt(b.dataset.day) === n;
    b.style.borderColor = isA ? 'var(--accent)' : 'var(--border)';
    b.style.background = isA ? 'var(--accentBg)' : 'var(--card)';
    b.style.color = isA ? 'var(--accent2)' : 'var(--sub)';
  });
  const tip = document.getElementById('day-tip');
  if (tip) tip.textContent = dayTip(n);
}

export function obNext() {
  const key = OB_STEPS[obStep];
  if (key === 'goals' && !obData.goals.length) { showToast('⚠️ Mindestens 1 Ziel wählen'); return; }
  if (key === 'trainingTypes' && !obData.trainingTypes.length) { showToast('⚠️ Mindestens 1 Trainingsart wählen'); return; }
  if (key === 'level' && !obData.level) { showToast('⚠️ Bitte Level auswählen'); return; }
  if (key === 'profile') {
    const age = parseInt(document.getElementById('ob-age').value) || 0;
    const weight = parseFloat(document.getElementById('ob-weight').value) || 0;
    const height = parseInt(document.getElementById('ob-height').value) || 0;
    const sex = document.getElementById('ob-sex').value;
    if (!age || !weight || !height) { showToast('⚠️ Alle Körperdaten erforderlich'); return; }
    obData.profile = { ...obData.profile, age, weight, height, sex };
  }
  if (obStep < OB_STEPS.length - 1) { obStep++; renderOb(); }
  else finishOnboarding();
}

export function obBack() {
  if (obStep > 0) { obStep--; renderOb(); }
}

async function finishOnboarding() {
  try {
    const p = obData.profile;
    await updateProfile(currentUserId, {
      name: p.name, age: p.age, weight_kg: p.weight, height_cm: p.height, sex: p.sex,
      goals: obData.goals, training_types: obData.trainingTypes, level: obData.level,
      training_days: obData.days,
      macro_kcal: obData.macros.kcal, macro_protein: obData.macros.protein,
      macro_carbs: obData.macros.carbs, macro_fat: obData.macros.fat,
      onboarding_done: true,
    });

    // Coach-Plan als initialen "Mein Plan" in workouts anlegen,
    // damit der Nutzer sofort lostrainieren und individuell anpassen kann.
    const plan = getCoachPlan(obData.goals, obData.trainingTypes);
    const days = Object.keys(plan).slice(0, Math.min(obData.days, Object.keys(plan).length));
    for (const dayKey of days) {
      for (const ex of plan[dayKey].exercises) {
        await addPlanExercise(currentUserId, { ...ex, day: dayKey });
      }
    }

    showToast('🎉 Plan aktiviert!');
    if (onFinishCallback) onFinishCallback();
  } catch (err) {
    console.error(err);
    showToast('⚠️ Fehler beim Speichern – bitte erneut versuchen');
  }
}
