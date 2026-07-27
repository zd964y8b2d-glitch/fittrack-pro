// ═══════════════════════════════════════════════════════════════════════════
// coachData.js
// Statische Coach-Vorlagen (Trainingspläne, Übungslisten, Makro-Formeln,
// Tipps). Bewusst im Code gehalten statt in der DB, da es sich um
// Anwendungslogik/Inhalte handelt, die mit jedem Deploy aktualisiert
// werden und für ALLE Nutzer gleich sind (siehe Architekturentscheidung).
// Nutzer-spezifische Daten (eigener Plan, Verlauf, Mahlzeiten) liegen
// dagegen in Supabase – siehe api.js.
// ═══════════════════════════════════════════════════════════════════════════

export const MUSCLE_COLORS = {
  Brust: '#E74C3C', Rücken: '#3498DB', Schultern: '#9B59B6',
  Bizeps: '#E67E22', Trizeps: '#F39C12', Beine: '#2ECC71',
  Gesäß: '#1ABC9C', Bauch: '#E91E8C', Waden: '#00BCD4', Ganzkörper: '#7B6EF6',
};

export const MUSCLE_GROUPS_IMPORTANT = ['Brust', 'Rücken', 'Schultern', 'Beine', 'Gesäß', 'Bauch'];

export const GOAL_OPTS = [
  { v: 'muscle', i: '💪', l: 'Muskelaufbau', s: 'Masse & Kraft aufbauen' },
  { v: 'cut', i: '🔥', l: 'Fettabbau', s: 'Definiert & schlank werden' },
  { v: 'recomp', i: '⚖️', l: 'Rekomposition', s: 'Muskeln + Fett gleichzeitig' },
  { v: 'endurance', i: '🏃', l: 'Ausdauer', s: 'Kondition & Leistung steigern' },
  { v: 'health', i: '❤️', l: 'Gesundheit', s: 'Fit & vital bleiben' },
];

export const TYPE_OPTS = [
  { v: 'gym', i: '🏋️', l: 'Fitnessstudio', s: 'Geräte & freie Gewichte' },
  { v: 'freeletics', i: '🔄', l: 'Freeletics', s: 'HIIT & Bodyweight' },
  { v: 'home', i: '🏠', l: 'Home-Workout', s: 'Zuhause ohne Geräte' },
  { v: 'outdoor', i: '🌳', l: 'Outdoor / Calisthenics', s: 'Park & Barren' },
];

export const LEVEL_OPTS = [
  { v: 'beginner', i: '🌱', l: 'Anfänger', s: '< 1 Jahr Training' },
  { v: 'intermediate', i: '⚡', l: 'Fortgeschritten', s: '1–3 Jahre' },
  { v: 'advanced', i: '🏆', l: 'Erfahren', s: '> 3 Jahre' },
];

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
  return dayKeys.map((k) => ({ key: k, ...plan[k] }));
}

// ── Makro-Berechnung (Mifflin-St Jeor + Zielanpassung) ──────────────────
export function calcMacros(profile, goals, days) {
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
  health: ['Konsistenz über Intensität. 3x pro Woche moderat ist besser als 1x extrem.', 'Kombiniere Kraft + Ausdauer für maximalen Gesundheitseffekt.'],
};

export function getCoachTip(goals) {
  const g = Array.isArray(goals) ? goals[0] : goals || 'health';
  const tips = COACH_TIPS[g] || COACH_TIPS.health;
  return tips[Math.floor(Math.random() * tips.length)];
}

export function dayTip(days) {
  if (days <= 2) return '2 Einheiten sind perfekt für Einsteiger und Recomposition. Weniger ist mehr!';
  if (days === 3) return 'Push/Pull/Legs – der Klassiker. Ideal für Kraft und Muskelaufbau.';
  if (days === 4) return '4 Tage ist der Goldstandard: maximales Volumen bei optimaler Erholung.';
  if (days === 5) return '5 Tage erfordern clevere Planung. 48h Pause pro Muskelgruppe ist Pflicht.';
  return '6-7 Tage? Nur für Erfahrene mit perfekter Ernährung und Schlaf.';
}

// ── Plananalyse (Warnungen zu fehlenden Muskelgruppen etc.) ─────────────
export function analyzeMyPlan(exercises, goals) {
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

  return { byDay, byGoal, allMuscles, warnings };
}

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


// ═══════════════════════════════════════════════════════════════════════════
// COACH-ERNÄHRUNGSPLAN – Verteilung der Tagesmakros auf Mahlzeiten-Slots
// ═══════════════════════════════════════════════════════════════════════════

// Standard-Slots, die jeder Nutzer initial bekommt. Prozentanteile basieren
// auf gängigen Coach-Empfehlungen: größere Hauptmahlzeiten, kleinere Snacks,
// mehr Protein am Morgen/nach dem Training für Muskelaufbau-Ziele.
export const DEFAULT_MEAL_SLOTS = [
  { id: 'breakfast', label: 'Frühstück', pct: 0.25 },
  { id: 'snack1',    label: 'Snack 1',   pct: 0.10 },
  { id: 'lunch',     label: 'Mittagessen', pct: 0.30 },
  { id: 'snack2',    label: 'Snack 2',   pct: 0.10 },
  { id: 'dinner',    label: 'Abendessen', pct: 0.25 },
];

// Erzeugt den Coach-Ernährungsplan: verteilt die Tagesmakros (aus calcMacros)
// auf die übergebenen Slots, gewichtet nach deren Prozentanteil.
export function buildCoachNutritionPlan(dailyMacros, slots) {
  const useSlots = slots && slots.length ? slots : DEFAULT_MEAL_SLOTS;
  return useSlots.map((slot) => ({
    id: slot.id,
    label: slot.label,
    kcal: Math.round(dailyMacros.kcal * slot.pct),
    protein: Math.round(dailyMacros.protein * slot.pct),
    carbs: Math.round(dailyMacros.carbs * slot.pct),
    fat: Math.round(dailyMacros.fat * slot.pct),
  }));
}

// Fügt einen neuen, individuellen Slot hinzu und verteilt die Prozentanteile
// der bestehenden Slots neu, sodass die Summe wieder 100% ergibt.
export function addMealSlot(currentSlots, label) {
  const slots = [...currentSlots];
  const newId = 'custom_' + Date.now().toString(36);
  const evenShare = 1 / (slots.length + 1);
  const rescaled = slots.map((s) => ({ ...s, pct: round2(s.pct * (1 - evenShare)) }));
  rescaled.push({ id: newId, label, pct: round2(evenShare) });
  return rescaled;
}

export function removeMealSlot(currentSlots, slotId) {
  const remaining = currentSlots.filter((s) => s.id !== slotId);
  if (!remaining.length) return DEFAULT_MEAL_SLOTS;
  const totalPct = remaining.reduce((sum, s) => sum + s.pct, 0);
  return remaining.map((s) => ({ ...s, pct: round2(s.pct / totalPct) }));
}

function round2(v) {
  return Math.round(v * 1000) / 1000;
}

// ═══════════════════════════════════════════════════════════════════════════
// COACH-ANALYSE – wertet die tatsächlichen Ernährungsdaten des Nutzers aus
// und gibt datengetriebene Empfehlungen (regelbasiert, siehe Projektnotiz).
// ═══════════════════════════════════════════════════════════════════════════

// mealHistory: Array von { date, totalKcal, totalProtein, totalCarbs, totalFat }
// aggregiert über die letzten Tage. weightHistory: Array von { date, weight }.
export function analyzeNutritionTrend(mealHistory, weightHistory, goalMacros, goal) {
  const insights = [];
  if (!mealHistory || mealHistory.length < 3) {
    return insights; // Zu wenig Daten für eine belastbare Aussage
  }

  const recentDays = mealHistory.slice(-7);
  const avgKcal = Math.round(recentDays.reduce((s, d) => s + d.totalKcal, 0) / recentDays.length);
  const avgProtein = Math.round(recentDays.reduce((s, d) => s + d.totalProtein, 0) / recentDays.length);
  const kcalDiff = avgKcal - goalMacros.kcal;
  const proteinDiff = avgProtein - goalMacros.protein;

  // Kalorien deutlich unter/über Ziel
  if (Math.abs(kcalDiff) > 300) {
    if (kcalDiff < 0) {
      insights.push(`Du isst im Schnitt ${Math.abs(kcalDiff)} kcal unter deinem Ziel. ${goal === 'muscle' ? 'Das bremst den Muskelaufbau – iss mehr oder wir passen dein Ziel an.' : 'Das ist ein größeres Defizit als geplant – achte auf ausreichend Energie.'}`);
    } else {
      insights.push(`Du isst im Schnitt ${kcalDiff} kcal über deinem Ziel. ${goal === 'cut' ? 'Das verlangsamt deinen Fettabbau spürbar.' : 'Falls das gewollt ist (z.B. Aufbauphase), passt das – sonst Makros neu berechnen.'}`);
    }
  }

  // Protein deutlich unter Ziel
  if (proteinDiff < -20) {
    insights.push(`Dein Protein liegt im Schnitt ${Math.abs(proteinDiff)}g unter dem Ziel. Für ${goal === 'muscle' || goal === 'recomp' ? 'Muskelaufbau' : 'den Erhalt deiner Muskulatur'} ist das zu wenig – plane proteinreichere Mahlzeiten ein.`);
  }

  // Gewichts-Stagnation trotz Zielabweichung (nur wenn genug Gewichtsdaten vorhanden)
  if (weightHistory && weightHistory.length >= 4) {
    const recent = weightHistory.slice(-4);
    const weightChange = recent[recent.length - 1].weight - recent[0].weight;
    if (Math.abs(weightChange) < 0.3) {
      if (goal === 'cut' && kcalDiff > -100) {
        insights.push('Dein Gewicht stagniert seit ca. 2 Wochen, obwohl Fettabbau dein Ziel ist. Erwäge, die Kalorien um 100–150 kcal zu senken.');
      } else if (goal === 'muscle' && kcalDiff < 100) {
        insights.push('Dein Gewicht stagniert seit ca. 2 Wochen. Für Muskelaufbau könnte ein leichter Kalorien-Überschuss helfen.');
      }
    }
  }

  return insights;
}


// ═══════════════════════════════════════════════════════════════════════════
// COACH-WORKOUT-BEWERTUNG – nach jedem abgeschlossenen Training.
// Wird präziser (mehr Aussagen, weniger "noch nicht genug Daten"), je mehr
// abgeschlossene Sessions in der Historie vorhanden sind. Faktoren:
// Frequenz, Fortschritt (Volumen-Trend), Anstrengung (RPE), Konsistenz der
// Anstrengung, Trainingsdauer, Muskelgruppen-Abdeckung.
// ═══════════════════════════════════════════════════════════════════════════

const RPE_LABELS = { 1: 'Leicht', 2: 'Etwas anstrengend', 3: 'Hart', 4: 'Sehr hart' };

// workoutLogs: Array von { performed_at, duration_min, exercise_count, rpe,
//   workout_name, burned_kcal }, neueste zuerst oder älteste zuerst - Reihenfolge
// wird intern normalisiert. planDays: Anzahl geplanter Trainingstage/Woche
// aus dem Profil (für den Frequenz-Vergleich).
export function evaluateWorkoutSession(workoutLogs, planDaysPerWeek) {
  const logs = [...(workoutLogs || [])].sort((a, b) => new Date(a.performed_at) - new Date(b.performed_at));
  const sessionCount = logs.length;

  // Konfidenz-Stufe: mit wenigen Sessions nur vorsichtige, allgemeine
  // Aussagen; ab 5+ Sessions werden Trend-Aussagen möglich; ab 10+ Sessions
  // volle Detailtiefe (Konsistenz-Bewertung etc.)
  const confidence = sessionCount < 3 ? 'low' : sessionCount < 10 ? 'medium' : 'high';

  const lines = [];
  const latest = logs[logs.length - 1];

  // ── Frequenz der letzten 7 Tage ──────────────────────────────────────
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const sessionsThisWeek = logs.filter((l) => new Date(l.performed_at) >= oneWeekAgo).length;
  const targetDays = planDaysPerWeek || 3;

  if (sessionsThisWeek >= targetDays) {
    lines.push(`Starke Woche: ${sessionsThisWeek} von ${targetDays} geplanten Einheiten geschafft. 💪`);
  } else if (sessionsThisWeek > 0) {
    lines.push(`Diese Woche ${sessionsThisWeek} von ${targetDays} geplanten Einheiten. Noch ${targetDays - sessionsThisWeek} bis zum Wochenziel.`);
  }

  // ── Trainingsdauer dieser Session ────────────────────────────────────
  if (latest.duration_min < 15) {
    lines.push('Diese Session war recht kurz (unter 15 Min). Für spürbare Fortschritte sind meist 30–60 Min pro Einheit sinnvoll.');
  } else if (latest.duration_min >= 30 && latest.duration_min <= 75) {
    lines.push(`Gute Trainingsdauer von ${latest.duration_min} Minuten – das liegt im effektiven Bereich.`);
  }

  // ── Anstrengung (RPE) dieser Session ─────────────────────────────────
  if (latest.rpe) {
    lines.push(`Du hast das Training als "${RPE_LABELS[latest.rpe]}" eingeschätzt.`);
  }

  // ── Konsistenz der Anstrengung (braucht mehr Historie) ───────────────
  if (confidence !== 'low') {
    const recentRpe = logs.slice(-5).map((l) => l.rpe).filter(Boolean);
    if (recentRpe.length >= 3) {
      const avgRpe = recentRpe.reduce((s, r) => s + r, 0) / recentRpe.length;
      if (avgRpe >= 3.5) {
        lines.push('Deine letzten Einheiten waren durchgehend sehr anstrengend. Achte auf ausreichend Regeneration, um Übertraining zu vermeiden.');
      } else if (avgRpe <= 1.5) {
        lines.push('Deine letzten Einheiten fühlten sich eher leicht an. Ein etwas höherer Trainingsreiz (mehr Gewicht/Sätze) könnte den Fortschritt beschleunigen.');
      }
    }
  }

  // ── Volumen-Trend (braucht mehr Historie) ────────────────────────────
  if (confidence === 'high') {
    lines.push('Mit deiner bisherigen Trainingshistorie kann ich jetzt auch längerfristige Trends erkennen – schau dir dafür die Progression pro Übung an.');
  } else if (confidence === 'medium') {
    lines.push(`Nach ${sessionCount} Einheiten werden meine Einschätzungen zunehmend präziser.`);
  } else {
    lines.push('Noch wenige Trainingsdaten vorhanden – je mehr Einheiten du absolvierst, desto genauer wird meine Einschätzung.');
  }

  return { lines, confidence, sessionCount, sessionsThisWeek, targetDays };
}

// Bezieht optional die Ernährung des Tages mit ein (falls getrackt) und
// ergänzt die Workout-Bewertung um einen Ernährungs-Hinweis.
export function addNutritionContextToEvaluation(evaluation, todayMealTotals, dailyMacroGoals) {
  if (!todayMealTotals || todayMealTotals.cal === 0) {
    return evaluation; // Nichts getrackt heute - keine Aussage erzwingen
  }
  const proteinPct = dailyMacroGoals.protein > 0
    ? Math.round((todayMealTotals.protein / dailyMacroGoals.protein) * 100)
    : null;

  if (proteinPct !== null) {
    if (proteinPct < 50) {
      evaluation.lines.push(`Du hast heute erst ${proteinPct}% deines Protein-Ziels erreicht – nach dem Training ist eine proteinreiche Mahlzeit besonders wertvoll für die Regeneration.`);
    } else if (proteinPct >= 90) {
      evaluation.lines.push('Deine Proteinzufuhr heute passt gut zum Training – das unterstützt die Regeneration optimal.');
    }
  }
  return evaluation;
}

// Coach-Tipp für die NÄCHSTE Trainingseinheit, abgeleitet vom Plan-Ziel
// und der zuletzt absolvierten Einheit.
export function getNextWorkoutTip(goal, latestRpe) {
  const tipsByGoal = {
    muscle: [
      'Steigere beim nächsten Mal wenn möglich das Gewicht oder eine Wiederholung pro Satz – progressive Überladung ist der Schlüssel.',
      'Achte beim nächsten Training besonders auf die Ausführung der letzten 2 Wiederholungen pro Satz – dort entsteht der meiste Wachstumsreiz.',
    ],
    cut: [
      'Halte beim nächsten Training das Tempo hoch und die Pausen kurz – das steigert den Kalorienverbrauch zusätzlich.',
      'Beim nächsten Mal: kombiniere Kraftübungen mit kurzen Cardio-Intervallen für ein größeres Kaloriendefizit.',
    ],
    recomp: [
      'Bleib beim nächsten Training bei moderatem Volumen mit Fokus auf saubere Technik – das unterstützt Muskelerhalt und Fettabbau gleichzeitig.',
    ],
    endurance: [
      'Steigere beim nächsten Mal die Distanz oder Dauer leicht, statt das Tempo zu erhöhen – Grundlagenausdauer wächst durch Volumen.',
    ],
    health: [
      'Bleib dran mit der Regelmäßigkeit – für die Gesundheit zählt Konsistenz mehr als Intensität.',
    ],
  };
  const tips = tipsByGoal[goal] || tipsByGoal.health;
  let tip = tips[Math.floor(Math.random() * tips.length)];

  // Zusätzlicher Hinweis bei sehr hoher letzter Anstrengung
  if (latestRpe === 4) {
    tip += ' Da die letzte Einheit sehr hart war: plane vor dem nächsten Training ausreichend Erholung ein.';
  }
  return tip;
}


// ═══════════════════════════════════════════════════════════════════════════
// COACH-WISSENSBASIS – fachlich fundierte Prinzipien pro Trainingsbereich.
// Dient als Grundlage für die Muster-Erkennung und Empfehlungen weiter unten.
// Bewusst regelbasiert (Schwellenwerte, Formeln, etablierte Trainingslehre),
// nicht als KI-Modell - siehe Projektnotiz zu technischer Machbarkeit.
// ═══════════════════════════════════════════════════════════════════════════

export const COACH_EXPERTISE = {
  bodybuilding: {
    // Volumen-Richtwerte nach Trainingslehre (Sätze pro Muskelgruppe/Woche)
    // Quelle: gängige Hypertrophie-Forschung (Schoenfeld et al. u.a.)
    weeklySetRanges: {
      beginner: { min: 8, max: 12 },
      intermediate: { min: 12, max: 18 },
      advanced: { min: 15, max: 22 },
    },
    repRangeForGoal: { strength: '3-6', hypertrophy: '6-12', endurance: '12-20' },
    restBetweenSets: { strength: '2-5 Min', hypertrophy: '60-90 Sek', endurance: '30-45 Sek' },
    progressionPrinciple: 'Progressive Überladung: wöchentlich Gewicht ODER Wiederholungen ODER Sätze leicht steigern.',
    antagonistPairs: [['Brust', 'Rücken'], ['Bizeps', 'Trizeps'], ['Quadrizeps', 'Beinbeuger']],
  },
  endurance: {
    // Trainingszonen nach % der maximalen Herzfrequenz (klassische 5-Zonen-Methode)
    zones: {
      zone1: { pct: '50-60%', purpose: 'Regeneration' },
      zone2: { pct: '60-70%', purpose: 'Grundlagenausdauer (Fettstoffwechsel)' },
      zone3: { pct: '70-80%', purpose: 'Aerobe Kapazität' },
      zone4: { pct: '80-90%', purpose: 'Schwellentraining' },
      zone5: { pct: '90-100%', purpose: 'VO2max / Wettkampftempo' },
    },
    weeklyVolumeRule: '80/20-Regel: 80% der Trainingszeit niedrig-intensiv (Zone 1-2), nur 20% hochintensiv.',
    progressionPrinciple: 'Wöchentliche Steigerung von Umfang oder Intensität max. 10%, um Übertraining/Verletzungen zu vermeiden.',
  },
  nutrition: {
    // Makro-Verteilung nach Ziel (Bandbreiten aus etablierter Sporternährung)
    macroRangesByGoal: {
      muscle:    { proteinPerKg: [1.8, 2.4], fatPctOfKcal: [20, 30], carbsRemainder: true },
      cut:       { proteinPerKg: [2.2, 2.8], fatPctOfKcal: [20, 30], carbsRemainder: true },
      recomp:    { proteinPerKg: [2.0, 2.4], fatPctOfKcal: [20, 30], carbsRemainder: true },
      endurance: { proteinPerKg: [1.4, 1.8], fatPctOfKcal: [20, 35], carbsRemainder: true },
      health:    { proteinPerKg: [1.2, 1.6], fatPctOfKcal: [25, 35], carbsRemainder: true },
    },
    mealTimingPrinciple: 'Protein gleichmäßig über 3-5 Mahlzeiten verteilen (20-40g pro Mahlzeit) für optimale Muskelproteinsynthese.',
    hydrationRule: '30-40ml Wasser pro kg Körpergewicht täglich, mehr bei intensivem Training.',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ÜBUNGS-MUSTERERKENNUNG (Punkt 4) – erkennt Lieblingsübungen aus dem
// eigenen Plan/Verlauf und schlägt Alternativen zur Abwechslung vor.
// ═══════════════════════════════════════════════════════════════════════════

// Datenbank an Alternativ-Übungen pro Muskelgruppe, um Abwechslung
// vorzuschlagen ohne die Zielmuskulatur zu wechseln.
export const EXERCISE_ALTERNATIVES = {
  Brust: ['Schrägbankdrücken', 'Kabelfliegende', 'Dips', 'Liegestütze (Weit)', 'Pec Deck'],
  Rücken: ['Latzug (enger Griff)', 'T-Bar Rudern', 'Klimmzüge (weiter Griff)', 'Rudern am Kabelzug', 'Inverted Rows'],
  Schultern: ['Arnold Press', 'Face Pulls', 'Frontheben', 'Reverse Fliegende', 'Landmine Press'],
  Bizeps: ['Hammer Curls', 'Konzentrations-Curls', 'Kabel-Curls', 'Prediger-Curls'],
  Trizeps: ['Skull Crusher', 'Trizeps-Kickback', 'Overhead Extension', 'Enge Liegestütze'],
  Beine: ['Bulgarische Kniebeuge', 'Beinpresse', 'Ausfallschritte', 'Sumo Kniebeuge', 'Step-Ups'],
  Gesäß: ['Hip Thrust', 'Rumänisches Kreuzheben', 'Glutebridge', 'Cable Pull-Through'],
  Bauch: ['Plank', 'Hanging Leg Raise', 'Russian Twist', 'Ab Rollout', 'Bicycle Crunch'],
  Waden: ['Wadenheben (sitzend)', 'Einbeiniges Wadenheben', 'Donkey Calf Raise'],
};

// Analysiert die Plan-Historie (myPlanCache aktuelle Übungen + vergangene
// Workout-Snapshots) und erkennt, welche Übungen am häufigsten trainiert
// werden ("Lieblingsübungen") sowie Muskelgruppen, die selten variiert
// werden - mit konkreten Alternativvorschlägen.
export function analyzeExercisePatterns(planExercises, workoutSnapshots) {
  const nameCount = {};
  const muscleNameSets = {}; // Muskelgruppe -> Set der genutzten Übungsnamen

  const allExercises = [
    ...planExercises.map(e => ({ name: e.exercise_name, muscle: e.muscle_group })),
    ...workoutSnapshots.flatMap(snap => snap.map(e => ({ name: e.name, muscle: e.muscle }))),
  ];

  allExercises.forEach(({ name, muscle }) => {
    if (!name) return;
    nameCount[name] = (nameCount[name] || 0) + 1;
    if (!muscleNameSets[muscle]) muscleNameSets[muscle] = new Set();
    muscleNameSets[muscle].add(name);
  });

  const totalSessions = workoutSnapshots.length || 1;

  // Lieblingsübungen: Übungen die in >= 50% der Sessions vorkommen (ab 3 Sessions Mindestdatenmenge)
  const favorites = Object.entries(nameCount)
    .filter(([, count]) => totalSessions >= 3 && count / totalSessions >= 0.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count, pct: Math.round((count / totalSessions) * 100) }));

  // Muskelgruppen mit wenig Übungs-Variation (nur 1 Übung genutzt, trotz Alternativen verfügbar)
  const lowVariation = Object.entries(muscleNameSets)
    .filter(([muscle, names]) => names.size === 1 && EXERCISE_ALTERNATIVES[muscle])
    .map(([muscle, names]) => {
      const usedName = [...names][0];
      const alternatives = (EXERCISE_ALTERNATIVES[muscle] || []).filter(alt => alt !== usedName).slice(0, 2);
      return { muscle, usedName, alternatives };
    });

  return { favorites, lowVariation, totalSessions };
}

// ═══════════════════════════════════════════════════════════════════════════
// ERNÄHRUNGS-MUSTERERKENNUNG (Punkt 3) – erkennt häufig gegessene
// Lebensmittel pro Mahlzeiten-Slot und schlägt basierend darauf eine
// zum Makro-Ziel passende Kombination vor.
// ═══════════════════════════════════════════════════════════════════════════

// mealsBySlotHistory: { slotId: [{ name, kcal, protein, carbs, fat }, ...] }
// über die letzten N Tage. macroTargetForSlot: { kcal, protein, carbs, fat }
// aus dem Coach-Ernährungsplan für diesen Slot.
export function analyzeNutritionPatterns(mealsBySlotHistory, macroTargetsBySlot) {
  const insights = [];
  const suggestions = [];

  Object.entries(mealsBySlotHistory).forEach(([slotId, meals]) => {
    if (meals.length < 3) return; // Zu wenig Daten für belastbare Muster

    const nameCount = {};
    meals.forEach((m) => {
      // Basisname ohne Grammzahl-Suffix wie "(200g)" für saubere Gruppierung
      const baseName = m.name.replace(/\s*\(\d+g\)\s*$/, '');
      nameCount[baseName] = (nameCount[baseName] || 0) + 1;
    });

    const topFood = Object.entries(nameCount).sort((a, b) => b[1] - a[1])[0];
    if (topFood && topFood[1] >= 3) {
      insights.push(`Du isst "${topFood[0]}" häufig (${topFood[1]}×) in diesem Slot – das scheint sich in deine Routine eingespielt zu haben.`);
    }

    // Vorschlag: die am häufigsten kombinierten Lebensmittel, die zusammen
    // am nächsten an das Makro-Ziel dieses Slots herankommen.
    const target = macroTargetsBySlot[slotId];
    if (target) {
      const avgKcal = meals.reduce((s, m) => s + m.kcal, 0) / meals.length;
      const diff = avgKcal - target.kcal;
      if (Math.abs(diff) > target.kcal * 0.25) {
        suggestions.push({
          slotId,
          text: diff > 0
            ? `Deine bisherigen Mahlzeiten in diesem Slot liegen im Schnitt ${Math.round(diff)} kcal über dem Coach-Ziel (${target.kcal} kcal).`
            : `Deine bisherigen Mahlzeiten in diesem Slot liegen im Schnitt ${Math.round(Math.abs(diff))} kcal unter dem Coach-Ziel (${target.kcal} kcal).`,
        });
      }
    }
  });

  return { insights, suggestions };
}
