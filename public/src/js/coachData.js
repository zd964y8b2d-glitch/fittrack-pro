// ═══════════════════════════════════════════════════════════════════════════
// coachData.js
// Statische Coach-Vorlagen (Trainingspläne, Übungslisten, Makro-Formeln, // Tipps). Bewusst im Code gehalten statt in der DB, da es sich um // Anwendungslogik/Inhalte handelt, die mit jedem Deploy aktualisiert // werden und für ALLE Nutzer gleich sind (siehe Architekturentscheidung).
// Nutzer-spezifische Daten (eigener Plan, Verlauf, Mahlzeiten) liegen // dagegen in Supabase – siehe api.js.
// ═══════════════════════════════════════════════════════════════════════════

export const MUSCLE_COLORS = {
  Brust: '#E74C3C', Rücken: '#3498DB', Schultern: '#9B59B6',
  Bizeps: '#E67E22', Trizeps: '#F39C12', Beine: '#2ECC71',
  Gesäß: '#1ABC9C', Bauch: '#E91E8C', Waden: '#00BCD4', Ganzkörper: '#7B6EF6', };

export const MUSCLE_GROUPS_IMPORTANT = ['Brust', 'Rücken', 'Schultern', 'Beine', 'Gesäß', 'Bauch'];

export const GOAL_OPTS = [
  { v: 'muscle', i: '💪', l: 'Muskelaufbau', s: 'Masse & Kraft aufbauen' },
  { v: 'cut', i: '🔥', l: 'Fettabbau', s: 'Definiert & schlank werden' },
  { v: 'recomp', i: '⚖️', l: 'Rekomposition', s: 'Muskeln + Fett gleichzeitig' },
  { v: 'endurance', i: '🏃', l: 'Ausdauer', s: 'Kondition & Leistung steigern' },
  { v: 'health', i: '❤️', l: 'Gesundheit', s: 'Fit & vital bleiben' }, ];

export const TYPE_OPTS = [
  { v: 'gym', i: '🏋️', l: 'Fitnessstudio', s: 'Geräte & freie Gewichte' },
  { v: 'freeletics', i: '🔄', l: 'Freeletics', s: 'HIIT & Bodyweight' },
  { v: 'home', i: '🏠', l: 'Home-Workout', s: 'Zuhause ohne Geräte' },
  { v: 'outdoor', i: '🌳', l: 'Outdoor / Calisthenics', s: 'Park & Barren' }, ];

export const LEVEL_OPTS = [
  { v: 'beginner', i: '🌱', l: 'Anfänger', s: '< 1 Jahr Training' },
  { v: 'intermediate', i: '⚡', l: 'Fortgeschritten', s: '1–3 Jahre' },
  { v: 'advanced', i: '🏆', l: 'Erfahren', s: '> 3 Jahre' }, ];

export const COACH_PLANS = {
  gym: {
    muscle: {
      A: { focus: 'Brust & Trizeps', exercises: [
        { name: 'Bankdrücken (Langhantel)', muscle: 'Brust', sets: 4, reps: 8, weight: 80, bodyweight: false },
        { name: 'Schrägbankdrücken', muscle: 'Brust', sets: 3, reps: 10, weight: 65, bodyweight: false },
        { name: 'Kabelfliegende', muscle: 'Brust', sets: 3, reps: 12, weight: 20, bodyweight: false },
        { name: 'Trizeps Seilzug', muscle: 'Trizeps', sets: 3, reps: 12, weight: 25, bodyweight: false },
        { name: 'Dips', muscle: 'Trizeps', sets: 3, reps: 10, weight: 0, bodyweight: true },
      ]},
      B: { focus: 'Rücken & Bizeps', exercises: [
        { name: 'Klimmzüge', muscle: 'Rücken', sets: 4, reps: 8, weight: 0, bodyweight: true },
        { name: 'Langhantelrudern', muscle: 'Rücken', sets: 4, reps: 8, weight: 70, bodyweight: false },
        { name: 'Latzug', muscle: 'Rücken', sets: 3, reps: 10, weight: 60, bodyweight: false },
        { name: 'Kurzhantel-Curls', muscle: 'Bizeps', sets: 3, reps: 12, weight: 16, bodyweight: false },
        { name: 'Hammer Curls', muscle: 'Bizeps', sets: 3, reps: 12, weight: 14, bodyweight: false },
      ]},
      C: { focus: 'Schultern & Bauch', exercises: [
        { name: 'Schulterdrücken (LH)', muscle: 'Schultern', sets: 4, reps: 8, weight: 50, bodyweight: false },
        { name: 'Seitheben', muscle: 'Schultern', sets: 4, reps: 15, weight: 10, bodyweight: false },
        { name: 'Face Pulls', muscle: 'Schultern', sets: 3, reps: 15, weight: 15, bodyweight: false },
        { name: 'Plank', muscle: 'Bauch', sets: 3, reps: 60, weight: 0, bodyweight: true },
        { name: 'Crunch', muscle: 'Bauch', sets: 3, reps: 20, weight: 0, bodyweight: true },
      ]},
      D: { focus: 'Beine & Gesäß', exercises: [
        { name: 'Kniebeuge (LH)', muscle: 'Beine', sets: 4, reps: 8, weight: 90, bodyweight: false },
        { name: 'Beinpresse', muscle: 'Beine', sets: 4, reps: 10, weight: 120, bodyweight: false },
        { name: 'Rumänisches Kreuzheben', muscle: 'Gesäß', sets: 3, reps: 10, weight: 70, bodyweight: false },
        { name: 'Beinbeuger', muscle: 'Beine', sets: 3, reps: 12, weight: 40, bodyweight: false },
        { name: 'Wade (stehend)', muscle: 'Waden', sets: 4, reps: 20, weight: 50, bodyweight: false },
      ]},
    },
    cut: {
      A: { focus: 'Oberkörper Push + Cardio', exercises: [
        { name: 'Bankdrücken', muscle: 'Brust', sets: 4, reps: 12, weight: 70, bodyweight: false },
        { name: 'Schulterdrücken', muscle: 'Schultern', sets: 3, reps: 12, weight: 40, bodyweight: false },
        { name: 'Trizeps Seilzug', muscle: 'Trizeps', sets: 4, reps: 15, weight: 20, bodyweight: false },
        { name: 'Liegestütze', muscle: 'Brust', sets: 3, reps: 20, weight: 0, bodyweight: true },
      ]},
      B: { focus: 'Oberkörper Pull + HIIT', exercises: [
        { name: 'Klimmzüge', muscle: 'Rücken', sets: 4, reps: 10, weight: 0, bodyweight: true },
        { name: 'Rudern Kabelzug', muscle: 'Rücken', sets: 4, reps: 12, weight: 55, bodyweight: false },
        { name: 'Kurzhantel-Curls', muscle: 'Bizeps', sets: 3, reps: 15, weight: 14, bodyweight: false },
      ]},
      C: { focus: 'Beine + Cardio', exercises: [
        { name: 'Kniebeuge', muscle: 'Beine', sets: 4, reps: 12, weight: 70, bodyweight: false },
        { name: 'Ausfallschritte', muscle: 'Beine', sets: 3, reps: 12, weight: 20, bodyweight: false },
        { name: 'Beinpresse', muscle: 'Beine', sets: 3, reps: 15, weight: 100, bodyweight: false },
        { name: 'Burpees', muscle: 'Ganzkörper', sets: 3, reps: 15, weight: 0, bodyweight: true },
      ]},
    },
    recomp: {
      A: { focus: 'Push (Brust/Schulter/Trizeps)', exercises: [
        { name: 'Bankdrücken', muscle: 'Brust', sets: 4, reps: 10, weight: 75, bodyweight: false },
        { name: 'Schulterdrücken', muscle: 'Schultern', sets: 3, reps: 10, weight: 45, bodyweight: false },
        { name: 'Trizeps Seilzug', muscle: 'Trizeps', sets: 3, reps: 12, weight: 22, bodyweight: false },
        { name: 'Kabelfliegende', muscle: 'Brust', sets: 3, reps: 12, weight: 18, bodyweight: false },
      ]},
      B: { focus: 'Pull (Rücken/Bizeps)', exercises: [
        { name: 'Klimmzüge', muscle: 'Rücken', sets: 4, reps: 8, weight: 0, bodyweight: true },
        { name: 'Rudern LH', muscle: 'Rücken', sets: 4, reps: 10, weight: 65, bodyweight: false },
        { name: 'Bizeps Curls', muscle: 'Bizeps', sets: 3, reps: 12, weight: 15, bodyweight: false },
      ]},
      C: { focus: 'Legs (Beine/Gesäß/Waden)', exercises: [
        { name: 'Kniebeuge', muscle: 'Beine', sets: 4, reps: 10, weight: 80, bodyweight: false },
        { name: 'Rumänisches Kreuzheben', muscle: 'Gesäß', sets: 3, reps: 10, weight: 65, bodyweight: false },
        { name: 'Beinbeuger', muscle: 'Beine', sets: 3, reps: 12, weight: 38, bodyweight: false },
        { name: 'Wadenheben', muscle: 'Waden', sets: 4, reps: 20, weight: 40, bodyweight: false },
      ]},
    },
  },
  freeletics: {
    muscle: {
      A: { focus: 'Oberkörper Power', exercises: [
        { name: 'Liegestütze', muscle: 'Brust', sets: 5, reps: 20, weight: 0, bodyweight: true },
        { name: 'Dips (Stuhl)', muscle: 'Trizeps', sets: 4, reps: 15, weight: 0, bodyweight: true },
        { name: 'Schulter Pike Push-Up', muscle: 'Schultern', sets: 4, reps: 12, weight: 0, bodyweight: true },
        { name: 'Enge Liegestütze', muscle: 'Trizeps', sets: 3, reps: 15, weight: 0, bodyweight: true },
      ]},
      B: { focus: 'Rücken & Core', exercises: [
        { name: 'Klimmzüge', muscle: 'Rücken', sets: 5, reps: 8, weight: 0, bodyweight: true },
        { name: 'Inverted Rows', muscle: 'Rücken', sets: 4, reps: 12, weight: 0, bodyweight: true },
        { name: 'Plank', muscle: 'Bauch', sets: 4, reps: 60, weight: 0, bodyweight: true },
        { name: 'Superman', muscle: 'Rücken', sets: 3, reps: 15, weight: 0, bodyweight: true },
      ]},
      C: { focus: 'HIIT Ganzkörper', exercises: [
        { name: 'Burpees', muscle: 'Ganzkörper', sets: 5, reps: 15, weight: 0, bodyweight: true },
        { name: 'Mountain Climbers', muscle: 'Bauch', sets: 4, reps: 30, weight: 0, bodyweight: true },
        { name: 'Jumping Jacks', muscle: 'Ganzkörper', sets: 3, reps: 50, weight: 0, bodyweight: true },
      ]},
      D: { focus: 'Beine & Sprungkraft', exercises: [
        { name: 'Kniebeugen', muscle: 'Beine', sets: 5, reps: 20, weight: 0, bodyweight: true },
        { name: 'Ausfallschritte', muscle: 'Beine', sets: 4, reps: 16, weight: 0, bodyweight: true },
        { name: 'Jump Squats', muscle: 'Beine', sets: 3, reps: 15, weight: 0, bodyweight: true },
        { name: 'Glutebridge', muscle: 'Gesäß', sets: 4, reps: 20, weight: 0, bodyweight: true },
      ]},
    },
  },
  home: {
    muscle: {
      A: { focus: 'Brust & Trizeps', exercises: [
        { name: 'Liegestütze', muscle: 'Brust', sets: 4, reps: 15, weight: 0, bodyweight: true },
        { name: 'Diamant Liegestütze', muscle: 'Trizeps', sets: 3, reps: 12, weight: 0, bodyweight: true },
        { name: 'Weite Liegestütze', muscle: 'Brust', sets: 3, reps: 15, weight: 0, bodyweight: true },
        { name: 'Dips (Stuhl)', muscle: 'Trizeps', sets: 3, reps: 12, weight: 0, bodyweight: true },
      ]},
      B: { focus: 'Rücken & Bizeps', exercises: [
        { name: 'Klimmzüge (Stange)', muscle: 'Rücken', sets: 4, reps: 8, weight: 0, bodyweight: true },
        { name: 'Inverted Rows', muscle: 'Rücken', sets: 3, reps: 12, weight: 0, bodyweight: true },
        { name: 'Supermans', muscle: 'Rücken', sets: 3, reps: 15, weight: 0, bodyweight: true },
        { name: 'Curl (Rucksack)', muscle: 'Bizeps', sets: 3, reps: 12, weight: 0, bodyweight: true },
      ]},
      C: { focus: 'Beine & Gesäß', exercises: [
        { name: 'Kniebeugen', muscle: 'Beine', sets: 4, reps: 20, weight: 0, bodyweight: true },
        { name: 'Ausfallschritte', muscle: 'Beine', sets: 3, reps: 16, weight: 0, bodyweight: true },
        { name: 'Glutebridge', muscle: 'Gesäß', sets: 4, reps: 20, weight: 0, bodyweight: true },
        { name: 'Wandsitzen', muscle: 'Beine', sets: 3, reps: 45, weight: 0, bodyweight: true },
      ]},
    },
  },
  outdoor: {
    muscle: {
      A: { focus: 'Calisthenics Oberkörper', exercises: [
        { name: 'Klimmzüge', muscle: 'Rücken', sets: 5, reps: 8, weight: 0, bodyweight: true },
        { name: 'Dips (Barren)', muscle: 'Trizeps', sets: 4, reps: 12, weight: 0, bodyweight: true },
        { name: 'Muscle-Up', muscle: 'Rücken', sets: 3, reps: 5, weight: 0, bodyweight: true },
        { name: 'Pike Push-Up', muscle: 'Schultern', sets: 3, reps: 12, weight: 0, bodyweight: true },
      ]},
      B: { focus: 'Beine & Core', exercises: [
        { name: 'Pistol Squat', muscle: 'Beine', sets: 4, reps: 8, weight: 0, bodyweight: true },
        { name: 'Box Jumps', muscle: 'Beine', sets: 4, reps: 10, weight: 0, bodyweight: true },
        { name: 'L-Sit', muscle: 'Bauch', sets: 3, reps: 20, weight: 0, bodyweight: true },
        { name: 'Hanging Leg Raise', muscle: 'Bauch', sets: 3, reps: 12, weight: 0, bodyweight: true },
      ]},
    },
  },
};

export function getCoachPlan(goals, trainingTypes) {
  const types = Array.isArray(trainingTypes) && trainingTypes.length ? trainingTypes : ['gym'];
  const gls = Array.isArray(goals) && goals.length ? goals : ['muscle'];
  const primary = types[0], mainGoal = gls[0];
  let plan = COACH_PLANS[primary]?.[mainGoal];
  if (!plan) plan = COACH_PLANS[primary]?.muscle || COACH_PLANS.gym.muscle;
  return plan;
}

export function coachPlanDays(goals, trainingTypes, days) {
  const plan = getCoachPlan(goals, trainingTypes);
  const dayKeys = Object.keys(plan).slice(0, Math.min(days || 4, Object.keys(plan).length));
  return dayKeys.map((k) => ({ key: k, ...plan[k] })); }

// ── Makro-Berechnung (Mifflin-St Jeor + Zielanpassung) ────────────────── export function calcMacros(profile, goals, days) {
  const g = Array.isArray(goals) ? goals[0] : goals;
  const { weight_kg: weight, height_cm: height, age, sex } = profile;
  const bmr = sex === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;
  const pal = { 1: 1.2, 2: 1.375, 3: 1.375, 4: 1.55, 5: 1.55, 6: 1.725, 7: 1.9 };
  const tdee = Math.round(bmr * (pal[days] || 1.55));
  const adj = { muscle: 350, cut: -450, recomp: 0, endurance: 150, health: 50 };
  const kcal = tdee + (adj[g] || 0);
  const pf = { muscle: 2.2, cut: 2.5, recomp: 2.2, endurance: 1.8, health: 1.8 };
  const protein = Math.round(weight * (pf[g] || 2.0));
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
  return { kcal, protein, carbs, fat };
}

// ── Coach-Tipps ──────────────────────────────────────────────────────────
export const COACH_TIPS = {
  muscle: ['Progressive Überladung ist das Fundament. Steigere jede Woche Gewicht ODER Volumen.', 'Mind-Muscle-Connection: Fühl die Muskeln, nicht nur die Bewegung.', 'Iss dein Protein auf 4-5 Mahlzeiten verteilt für maximale Muskelproteinsynthese.', 'Regeneration ist Training. Schlaf 8h und plane 48h Pause pro Muskelgruppe.'],
  cut: ['Kaloriendefizit von 400-500 kcal schont Muskelmasse optimal.', 'Mehr Protein in der Diät – 2.4-2.6g/kg schützt vor Muskelverlust.', 'Cardio morgens nüchtern erhöht die Fettverbrennung.'],
  recomp: ['Recomposition ist ein Marathon, kein Sprint. Plane 6-12 Monate.', 'Trainingstage: Erhaltungskalorien. Ruhetage: 200 kcal Defizit.'],
  endurance: ['Carbs sind dein Treibstoff. Lade vor langen Sessions mit komplexen KH.', 'Zone-2-Training (60-70% HF max) baut die aerobe Basis am effektivsten auf.'],
  health: ['Konsistenz über Intensität. 3x pro Woche moderat ist besser als 1x extrem.', 'Kombiniere Kraft + Ausdauer für maximalen Gesundheitseffekt.'], };

export function getCoachTip(goals) {
  const g = Array.isArray(goals) ? goals[0] : goals || 'health';
  const tips = COACH_TIPS[g] || COACH_TIPS.health;
  return tips[Math.floor(Math.random() * tips.length)]; }

export function dayTip(days) {
  if (days <= 2) return '2 Einheiten sind perfekt für Einsteiger und Recomposition. Weniger ist mehr!';
  if (days === 3) return 'Push/Pull/Legs – der Klassiker. Ideal für Kraft und Muskelaufbau.';
  if (days === 4) return '4 Tage ist der Goldstandard: maximales Volumen bei optimaler Erholung.';
  if (days === 5) return '5 Tage erfordern clevere Planung. 48h Pause pro Muskelgruppe ist Pflicht.';
  return '6-7 Tage? Nur für Erfahrene mit perfekter Ernährung und Schlaf.'; }

// ── Plananalyse (Warnungen zu fehlenden Muskelgruppen etc.) ───────────── export function analyzeMyPlan(exercises, goals) {
  const byDay = {};
  const byGoal = {};
  const allMuscles = {};

  exercises.forEach((ex) => {
    if (!byDay[ex.plan_day]) byDay[ex.plan_day] = [];
    byDay[ex.plan_day].push(ex);
    allMuscles[ex.muscle_group] = (allMuscles[ex.muscle_group] || 0) + 1;
    const g = ex.plan_goal || (goals?.[0]) || 'muscle';
    if (!byGoal[g]) byGoal[g] = [];
    byGoal[g].push(ex);
  });

  const warnings = {};

  // Nur für Kraft-Ziele fehlende Muskelgruppen prüfen
  const kraftGoals = (goals || ['muscle']).filter(g => g !== 'endurance');
  if (kraftGoals.length) {
    const missing = MUSCLE_GROUPS_IMPORTANT.filter((m) => !allMuscles[m]);
    if (missing.length && exercises.length > 0)
      warnings['_global'] = [`Kraft-Plan: Fehlende Muskelgruppen: ${missing.join(', ')}.`];
  }

  Object.keys(byDay).forEach((day) => {
    const exes = byDay[day];
    const muscles = exes.map((e) => e.muscle_group);
    const w = [];
    const unique = [...new Set(muscles)];
    if (unique.length > 4) w.push(`Tag ${day}: Zu viele Muskelgruppen (${unique.length}). Max. 3–4 pro Tag.`);
    if (muscles.includes('Brust') && !muscles.includes('Rücken') && muscles.filter((m) => m === 'Brust').length > 2)
      w.push(`Tag ${day}: Brust ohne Rücken-Ausgleich – Haltungsschäden möglich!`);
    if (muscles.includes('Bizeps') && !muscles.includes('Trizeps'))
      w.push(`Tag ${day}: Bizeps ohne Trizeps – Antagonisten ausgleichen!`);
    if (w.length) warnings[day] = w;
  });

  return { byDay, byGoal, allMuscles, warnings }; }

// ── Ziel-spezifische Plananalyse ─────────────────────────────────────────
// Prüft ob der Plan die Anforderungen jedes Ziels erfüllt.
// Kardio-Ziele (cut, endurance) brauchen explizit Ausdauer-Einheiten.
export function analyzePlanByGoal(exercises, goals) {
  const GOAL_COLORS = {
    muscle: '#7B6EF6', cut: '#E74C3C', recomp: '#F5A623',
    endurance: '#2ECC71', health: '#3498DB'
  };
  const ENDURANCE_MUSCLES = ['Ganzkörper']; // Ausdauer-Übungen haben oft Ganzkörper als Gruppe
  const CARDIO_KEYWORDS = ['Lauf','Radfahren','Schwimmen','HIIT','Cardio','Intervall','Burpee',
    'Jumping','Sprint','Rudern','Wandern','Tabata','Spinning','Joggen'];

  return (goals || ['muscle']).map(goal => {
    const gInfo = GOAL_OPTS.find(o => o.v === goal) || { l: goal, i: '🎯', v: goal };
    const col = GOAL_COLORS[goal] || '#7B6EF6';
    const goalExes = exercises.filter(e => e.plan_goal === goal || (!e.plan_goal && goal === goals[0]));
    const totalDays = [...new Set(goalExes.map(e => e.plan_day))].length;
    const warnings = [];

    // Kardio-Einheiten zählen (Übungen mit Ausdauer-Keywords)
    const cardioCount = goalExes.filter(e =>
      CARDIO_KEYWORDS.some(kw => e.exercise_name?.includes(kw)) ||
      e.muscle_group === 'Ganzkörper'
    ).length;

    const cardiodays = [...new Set(
      goalExes
        .filter(e => CARDIO_KEYWORDS.some(kw => e.exercise_name?.includes(kw)) || e.muscle_group === 'Ganzkörper')
        .map(e => e.plan_day)
    )].length;

    if (goal === 'cut') {
      if (cardiodays < 2)
        warnings.push(`${gInfo.i} Fettabbau: Mindestens 2 Kardio-Einheiten/Woche empfohlen – aktuell ${cardiodays}. Kardio erhöht das Kaloriendefizit und schützt die Muskelmasse.`);
      if (totalDays < 3)
        warnings.push(`${gInfo.i} Fettabbau: Mindestens 3 Trainingstage empfohlen für optimalen Stoffwechsel.`);
    } else if (goal === 'endurance') {
      if (totalDays < 2)
        warnings.push(`${gInfo.i} Ausdauer: Mindestens 2 Ausdauereinheiten/Woche für messbare Fortschritte.`);
      if (cardiodays === 0 && goalExes.length > 0)
        warnings.push(`${gInfo.i} Ausdauer: Keine Kardio-Einheiten gefunden. Füge Lauf, Radfahren oder HIIT hinzu.`);
    } else if (goal === 'recomp') {
      if (cardiodays < 1 && totalDays > 0)
        warnings.push(`${gInfo.i} Rekomposition: 1–2 Kardio-Einheiten/Woche unterstützen den Fettabbau bei gleichzeitigem Muskelaufbau.`);
    } else if (goal === 'muscle') {
      if (totalDays < 2 && exercises.length > 0)
        warnings.push(`${gInfo.i} Muskelaufbau: Mindestens 2–3 Kraft-Einheiten/Woche für progressive Überladung.`);
    } else if (goal === 'health') {
      if (totalDays < 2 && exercises.length > 0)
        warnings.push(`${gInfo.i} Gesundheit: Kombiniere Kraft und Ausdauer für den besten Gesundheitseffekt.`);
    }

    return { goal, label: gInfo.l, icon: gInfo.i, color: col, totalDays, cardiodays, warnings };
  });
}
