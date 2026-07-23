// ═══════════════════════════════════════════════════════════════════════════
// exerciseDB.js
// Übungsdatenbank pro Muskelgruppe und Trainingstyp.
// Vor dem Hochladen kannst du hier beliebig Übungen ergänzen oder entfernen.
//
// FORMAT pro Eintrag:
//   { name: 'Übungsname', sets: 4, reps: 10, weight: 80, bodyweight: false }
//
// bodyweight: true  → kein Gewicht (Körpergewicht) // bodyweight: false → Gewicht in kg // ═══════════════════════════════════════════════════════════════════════════

// ─── FITNESSSTUDIO ───────────────────────────────────────────────────────────
export const EXERCISE_DB_GYM = {
  Brust: [
    { name: 'Bankdrücken (Langhantel)',     sets: 4, reps: 8,  weight: 80,  bodyweight: false },
    { name: 'Bankdrücken (Kurzhantel)',     sets: 4, reps: 10, weight: 30,  bodyweight: false },
    { name: 'Schrägbankdrücken',            sets: 3, reps: 10, weight: 65,  bodyweight: false },
    { name: 'Flachbankdrücken (Maschine)', sets: 3, reps: 12, weight: 60,  bodyweight: false },
    { name: 'Kabelfliegende',              sets: 3, reps: 12, weight: 20,  bodyweight: false },
    { name: 'Kurzhantel-Fliegende',        sets: 3, reps: 12, weight: 14,  bodyweight: false },
    { name: 'Liegestütze',                 sets: 4, reps: 20, weight: 0,   bodyweight: true  },
    { name: 'Dips (Brust-betont)',         sets: 3, reps: 12, weight: 0,   bodyweight: true  },
    { name: 'Pec Deck',                    sets: 3, reps: 12, weight: 50,  bodyweight: false },
  ],
  Rücken: [
    { name: 'Klimmzüge',                   sets: 4, reps: 8,  weight: 0,   bodyweight: true  },
    { name: 'Langhantelrudern',            sets: 4, reps: 8,  weight: 70,  bodyweight: false },
    { name: 'Kurzhantelrudern',            sets: 3, reps: 10, weight: 30,  bodyweight: false },
    { name: 'Latzug (weiter Griff)',       sets: 3, reps: 10, weight: 60,  bodyweight: false },
    { name: 'Latzug (enger Griff)',        sets: 3, reps: 10, weight: 60,  bodyweight: false },
    { name: 'Rudern am Kabelzug',          sets: 3, reps: 12, weight: 55,  bodyweight: false },
    { name: 'Hyperextension',              sets: 3, reps: 15, weight: 0,   bodyweight: true  },
    { name: 'Kreuzheben',                  sets: 4, reps: 5,  weight: 100, bodyweight: false },
    { name: 'T-Bar Rudern',                sets: 3, reps: 10, weight: 50,  bodyweight: false },
    { name: 'Inverted Rows',               sets: 3, reps: 12, weight: 0,   bodyweight: true  },
  ],
  Schultern: [
    { name: 'Schulterdrücken (LH)',        sets: 4, reps: 8,  weight: 50,  bodyweight: false },
    { name: 'Schulterdrücken (KH)',        sets: 3, reps: 10, weight: 18,  bodyweight: false },
    { name: 'Schulterdrücken (Maschine)', sets: 3, reps: 12, weight: 40,  bodyweight: false },
    { name: 'Seitheben',                   sets: 4, reps: 15, weight: 10,  bodyweight: false },
    { name: 'Frontheben',                  sets: 3, reps: 12, weight: 8,   bodyweight: false },
    { name: 'Face Pulls',                  sets: 3, reps: 15, weight: 15,  bodyweight: false },
    { name: 'Upright Row',                 sets: 3, reps: 12, weight: 30,  bodyweight: false },
    { name: 'Arnold Press',                sets: 3, reps: 10, weight: 16,  bodyweight: false },
    { name: 'Reverse Fliegende',          sets: 3, reps: 15, weight: 8,   bodyweight: false },
  ],
  Bizeps: [
    { name: 'Kurzhantel-Curls',            sets: 3, reps: 12, weight: 16,  bodyweight: false },
    { name: 'Langhantel-Curls',            sets: 3, reps: 10, weight: 30,  bodyweight: false },
    { name: 'Hammer Curls',                sets: 3, reps: 12, weight: 14,  bodyweight: false },
    { name: 'Konzentrations-Curls',        sets: 3, reps: 12, weight: 12,  bodyweight: false },
    { name: 'Kabel-Curls',                 sets: 3, reps: 12, weight: 20,  bodyweight: false },
    { name: 'Prediger-Curls',              sets: 3, reps: 10, weight: 20,  bodyweight: false },
    { name: 'Chin-Ups',                    sets: 3, reps: 8,  weight: 0,   bodyweight: true  },
  ],
  Trizeps: [
    { name: 'Trizeps Seilzug',             sets: 3, reps: 12, weight: 25,  bodyweight: false },
    { name: 'Trizeps Stangenzug',          sets: 3, reps: 12, weight: 25,  bodyweight: false },
    { name: 'Dips (Trizeps-betont)',       sets: 3, reps: 12, weight: 0,   bodyweight: true  },
    { name: 'Skull Crusher',               sets: 3, reps: 10, weight: 25,  bodyweight: false },
    { name: 'Trizeps-Kickback',            sets: 3, reps: 15, weight: 8,   bodyweight: false },
    { name: 'Enge Liegestütze',            sets: 3, reps: 15, weight: 0,   bodyweight: true  },
    { name: 'Overhead Trizeps Extension', sets: 3, reps: 12, weight: 20,  bodyweight: false },
  ],
  Beine: [
    { name: 'Kniebeuge (Langhantel)',      sets: 4, reps: 8,  weight: 90,  bodyweight: false },
    { name: 'Beinpresse',                  sets: 4, reps: 10, weight: 120, bodyweight: false },
    { name: 'Bulgarische Kniebeuge',       sets: 3, reps: 10, weight: 20,  bodyweight: false },
    { name: 'Ausfallschritte',             sets: 3, reps: 12, weight: 20,  bodyweight: false },
    { name: 'Beinstrecker',               sets: 3, reps: 12, weight: 50,  bodyweight: false },
    { name: 'Beinbeuger (liegend)',        sets: 3, reps: 12, weight: 40,  bodyweight: false },
    { name: 'Sumo Kniebeuge',             sets: 3, reps: 12, weight: 60,  bodyweight: false },
    { name: 'Pistol Squat',               sets: 3, reps: 8,  weight: 0,   bodyweight: true  },
    { name: 'Jump Squats',                 sets: 3, reps: 15, weight: 0,   bodyweight: true  },
  ],
  Gesäß: [
    { name: 'Rumänisches Kreuzheben',      sets: 3, reps: 10, weight: 70,  bodyweight: false },
    { name: 'Hip Thrust (LH)',             sets: 4, reps: 10, weight: 80,  bodyweight: false },
    { name: 'Glutebridge',                 sets: 4, reps: 20, weight: 0,   bodyweight: true  },
    { name: 'Abduktor Maschine',          sets: 3, reps: 15, weight: 40,  bodyweight: false },
    { name: 'Donkey Kicks',               sets: 3, reps: 15, weight: 0,   bodyweight: true  },
    { name: 'Step-Ups',                    sets: 3, reps: 12, weight: 20,  bodyweight: false },
    { name: 'Cable Pull-Through',          sets: 3, reps: 12, weight: 30,  bodyweight: false },
  ],
  Bauch: [
    { name: 'Crunch',                      sets: 3, reps: 20, weight: 0,   bodyweight: true  },
    { name: 'Plank',                       sets: 3, reps: 60, weight: 0,   bodyweight: true  },
    { name: 'Hanging Leg Raise',           sets: 3, reps: 12, weight: 0,   bodyweight: true  },
    { name: 'Russian Twist',               sets: 3, reps: 20, weight: 5,   bodyweight: false },
    { name: 'Kabelzug-Crunch',            sets: 3, reps: 15, weight: 20,  bodyweight: false },
    { name: 'Mountainclimber',             sets: 3, reps: 30, weight: 0,   bodyweight: true  },
    { name: 'Ab Rollout',                  sets: 3, reps: 10, weight: 0,   bodyweight: true  },
    { name: 'Bicycle Crunch',              sets: 3, reps: 20, weight: 0,   bodyweight: true  },
    { name: 'Dragon Flag',                 sets: 3, reps: 8,  weight: 0,   bodyweight: true  },
  ],
  Waden: [
    { name: 'Wadenheben (stehend)',        sets: 4, reps: 20, weight: 50,  bodyweight: false },
    { name: 'Wadenheben (sitzend)',        sets: 4, reps: 20, weight: 40,  bodyweight: false },
    { name: 'Wadenheben (Beinpresse)',     sets: 3, reps: 20, weight: 80,  bodyweight: false },
    { name: 'Einbeiniges Wadenheben',     sets: 3, reps: 15, weight: 0,   bodyweight: true  },
    { name: 'Donkey Calf Raise',           sets: 3, reps: 20, weight: 30,  bodyweight: false },
  ],
  Ganzkörper: [
    { name: 'Burpees',                     sets: 4, reps: 15, weight: 0,   bodyweight: true  },
    { name: 'Kreuzheben (konventionell)', sets: 4, reps: 5,  weight: 100, bodyweight: false },
    { name: 'Clean & Press',               sets: 3, reps: 8,  weight: 40,  bodyweight: false },
    { name: 'Kettlebell Swing',            sets: 4, reps: 20, weight: 16,  bodyweight: false },
    { name: 'Thrusters',                   sets: 3, reps: 10, weight: 30,  bodyweight: false },
    { name: 'Box Jumps',                   sets: 4, reps: 10, weight: 0,   bodyweight: true  },
    { name: 'Farmer Walk',                 sets: 3, reps: 40, weight: 24,  bodyweight: false },
  ],
};

// ─── FREELETICS ──────────────────────────────────────────────────────────────
export const EXERCISE_DB_FREELETICS = {
  Brust: [
    { name: 'Liegestütze',                 sets: 5, reps: 20, weight: 0, bodyweight: true },
    { name: 'Weite Liegestütze',           sets: 4, reps: 15, weight: 0, bodyweight: true },
    { name: 'Enge Liegestütze',            sets: 4, reps: 15, weight: 0, bodyweight: true },
    { name: 'Diamant Liegestütze',         sets: 4, reps: 12, weight: 0, bodyweight: true },
    { name: 'Archer Liegestütze',          sets: 3, reps: 10, weight: 0, bodyweight: true },
    { name: 'Explosive Liegestütze',       sets: 4, reps: 10, weight: 0, bodyweight: true },
    { name: 'Decline Liegestütze',         sets: 3, reps: 15, weight: 0, bodyweight: true },
    { name: 'Dips (Stuhl/Bank)',           sets: 4, reps: 15, weight: 0, bodyweight: true },
  ],
  Rücken: [
    { name: 'Klimmzüge',                   sets: 5, reps: 8,  weight: 0, bodyweight: true },
    { name: 'Enge Klimmzüge',              sets: 4, reps: 8,  weight: 0, bodyweight: true },
    { name: 'Inverted Rows',               sets: 4, reps: 12, weight: 0, bodyweight: true },
    { name: 'Superman',                    sets: 3, reps: 15, weight: 0, bodyweight: true },
    { name: 'Rückenextension',             sets: 3, reps: 20, weight: 0, bodyweight: true },
    { name: 'Chin-Ups',                    sets: 4, reps: 8,  weight: 0, bodyweight: true },
    { name: 'Australian Pull-Ups',         sets: 4, reps: 12, weight: 0, bodyweight: true },
    { name: 'Muscle-Up',                   sets: 3, reps: 5,  weight: 0, bodyweight: true },
  ],
  Schultern: [
    { name: 'Pike Push-Ups',              sets: 4, reps: 12, weight: 0, bodyweight: true },
    { name: 'Handstand Push-Ups',         sets: 3, reps: 8,  weight: 0, bodyweight: true },
    { name: 'Wall Walk',                   sets: 3, reps: 5,  weight: 0, bodyweight: true },
    { name: 'Schulter Tap Liegestütze',   sets: 3, reps: 20, weight: 0, bodyweight: true },
    { name: 'Reverse Snow Angels',        sets: 3, reps: 15, weight: 0, bodyweight: true },
    { name: 'Seitliches Anheben (Boden)', sets: 3, reps: 20, weight: 0, bodyweight: true },
  ],
  Bizeps: [
    { name: 'Chin-Ups (eng)',              sets: 4, reps: 10, weight: 0, bodyweight: true },
    { name: 'Inverted Curl',               sets: 3, reps: 12, weight: 0, bodyweight: true },
    { name: 'Towel Curl',                  sets: 3, reps: 12, weight: 0, bodyweight: true },
    { name: 'Hammer Curl (Widerstandsband)', sets: 3, reps: 15, weight: 0, bodyweight: true },
    { name: 'Bodyweight Curl an Stange',  sets: 3, reps: 10, weight: 0, bodyweight: true },
  ],
  Trizeps: [
    { name: 'Dips (Trizeps)',              sets: 5, reps: 15, weight: 0, bodyweight: true },
    { name: 'Bench Dips',                  sets: 4, reps: 15, weight: 0, bodyweight: true },
    { name: 'Enge Liegestütze',            sets: 4, reps: 15, weight: 0, bodyweight: true },
    { name: 'Diamond Push-Ups',            sets: 4, reps: 12, weight: 0, bodyweight: true },
    { name: 'Trizeps Extension (Boden)',  sets: 3, reps: 12, weight: 0, bodyweight: true },
    { name: 'Handstand Push-Up (Trizeps)',sets: 3, reps: 8,  weight: 0, bodyweight: true },
  ],
  Beine: [
    { name: 'Kniebeugen',                  sets: 5, reps: 20, weight: 0, bodyweight: true },
    { name: 'Jump Squats',                 sets: 4, reps: 15, weight: 0, bodyweight: true },
    { name: 'Ausfallschritte',             sets: 4, reps: 16, weight: 0, bodyweight: true },
    { name: 'Ausfallschritte (springend)', sets: 4, reps: 12, weight: 0, bodyweight: true },
    { name: 'Pistol Squat',               sets: 3, reps: 8,  weight: 0, bodyweight: true },
    { name: 'Sumo Squats',                 sets: 4, reps: 20, weight: 0, bodyweight: true },
    { name: 'Squat Hold',                  sets: 3, reps: 60, weight: 0, bodyweight: true },
    { name: 'Step-Ups (Stuhl)',            sets: 3, reps: 15, weight: 0, bodyweight: true },
    { name: 'Box Jumps',                   sets: 4, reps: 10, weight: 0, bodyweight: true },
  ],
  Gesäß: [
    { name: 'Glutebridge',                 sets: 4, reps: 25, weight: 0, bodyweight: true },
    { name: 'Single Leg Glutebridge',     sets: 3, reps: 15, weight: 0, bodyweight: true },
    { name: 'Donkey Kicks',               sets: 4, reps: 20, weight: 0, bodyweight: true },
    { name: 'Fire Hydrant',                sets: 3, reps: 20, weight: 0, bodyweight: true },
    { name: 'Hip Thrust (Bodyweight)',    sets: 4, reps: 20, weight: 0, bodyweight: true },
    { name: 'Reverse Lunges',             sets: 3, reps: 16, weight: 0, bodyweight: true },
    { name: 'Glute Kickback',             sets: 3, reps: 15, weight: 0, bodyweight: true },
  ],
  Bauch: [
    { name: 'Crunch',                      sets: 4, reps: 25, weight: 0, bodyweight: true },
    { name: 'Plank',                       sets: 4, reps: 60, weight: 0, bodyweight: true },
    { name: 'Side Plank',                  sets: 3, reps: 45, weight: 0, bodyweight: true },
    { name: 'Mountainclimber',             sets: 4, reps: 30, weight: 0, bodyweight: true },
    { name: 'Bicycle Crunch',              sets: 4, reps: 20, weight: 0, bodyweight: true },
    { name: 'Leg Raises',                  sets: 3, reps: 15, weight: 0, bodyweight: true },
    { name: 'V-Ups',                       sets: 3, reps: 15, weight: 0, bodyweight: true },
    { name: 'Flutter Kicks',               sets: 3, reps: 30, weight: 0, bodyweight: true },
    { name: 'Hollow Body Hold',            sets: 3, reps: 30, weight: 0, bodyweight: true },
    { name: 'Toe Touches',                 sets: 3, reps: 20, weight: 0, bodyweight: true },
    { name: 'Dragon Flag',                 sets: 3, reps: 8,  weight: 0, bodyweight: true },
  ],
  Waden: [
    { name: 'Wadenheben (stehend)',        sets: 5, reps: 25, weight: 0, bodyweight: true },
    { name: 'Einbeiniges Wadenheben',     sets: 4, reps: 20, weight: 0, bodyweight: true },
    { name: 'Sprungseile',                 sets: 3, reps: 60, weight: 0, bodyweight: true },
    { name: 'Jump Rope Double Unders',    sets: 3, reps: 30, weight: 0, bodyweight: true },
  ],
  Ganzkörper: [
    { name: 'Burpees',                     sets: 5, reps: 15, weight: 0, bodyweight: true },
    { name: 'Burpees mit Liegestütz',     sets: 4, reps: 12, weight: 0, bodyweight: true },
    { name: 'Jumping Jacks',               sets: 3, reps: 50, weight: 0, bodyweight: true },
    { name: 'Bear Crawl',                  sets: 3, reps: 20, weight: 0, bodyweight: true },
    { name: 'Inchworm',                    sets: 3, reps: 10, weight: 0, bodyweight: true },
    { name: 'Burpee Pull-Up',              sets: 3, reps: 8,  weight: 0, bodyweight: true },
    { name: 'Star Jumps',                  sets: 4, reps: 20, weight: 0, bodyweight: true },
    { name: 'Tuck Jumps',                  sets: 4, reps: 15, weight: 0, bodyweight: true },
    { name: 'Devil Press',                 sets: 3, reps: 10, weight: 0, bodyweight: true },
  ],
};

// ─── AUSWAHL je nach Trainingstyp des Nutzers ──────────────────────────────── export function getExercisesForMuscle(muscle, trainingTypes) {
  const types = Array.isArray(trainingTypes) ? trainingTypes : [trainingTypes || 'gym'];
  const primary = types[0];

  if (primary === 'freeletics' || primary === 'home' || primary === 'outdoor') {
    return EXERCISE_DB_FREELETICS[muscle] || [];
  }
  // gym oder gemischt → Gym-Datenbank
  return EXERCISE_DB_GYM[muscle] || [];
}

// Gibt beide Datenbanken zurück (für gemischte Auswahl) export function getExercisesForMuscleBoth(muscle) {
  const gym = (EXERCISE_DB_GYM[muscle] || []).map(e => ({ ...e, _type: 'Gym' }));
  const fl  = (EXERCISE_DB_FREELETICS[muscle] || []).map(e => ({ ...e, _type: 'Freeletics' }));
  return [...gym, ...fl];
}


// ─── AUSDAUER ─────────────────────────────────────────────────────────────────
// Keine Muskelgruppen – stattdessen Kategorien mit typischen Einheiten.
// "reps" = Minuten, "weight" = Intensität (0 = locker, 1 = moderat, 2 = intensiv) // bodyweight: true immer (kein Gewicht bei Ausdauer) export const EXERCISE_DB_ENDURANCE = {
  Laufen: [
    { name: 'Lockerer Dauerlauf',           sets: 1, reps: 30, weight: 0, bodyweight: true },
    { name: 'Langer Dauerlauf',             sets: 1, reps: 60, weight: 0, bodyweight: true },
    { name: 'Tempodauerlauf',               sets: 1, reps: 30, weight: 0, bodyweight: true },
    { name: 'Intervalltraining (400m)',     sets: 8, reps: 2,  weight: 0, bodyweight: true },
    { name: 'Intervalltraining (1km)',      sets: 5, reps: 5,  weight: 0, bodyweight: true },
    { name: 'Fahrtspiel',                   sets: 1, reps: 45, weight: 0, bodyweight: true },
    { name: 'Bergläufe',                    sets: 6, reps: 3,  weight: 0, bodyweight: true },
    { name: 'Progressionslauf',             sets: 1, reps: 40, weight: 0, bodyweight: true },
    { name: '5km Lauf',                     sets: 1, reps: 25, weight: 0, bodyweight: true },
    { name: '10km Lauf',                    sets: 1, reps: 55, weight: 0, bodyweight: true },
    { name: 'Halbmarathon',                 sets: 1, reps: 110,weight: 0, bodyweight: true },
    { name: 'Marathon',                     sets: 1, reps: 240,weight: 0, bodyweight: true },
  ],
  Radfahren: [
    { name: 'Lockerfahrt',                  sets: 1, reps: 45, weight: 0, bodyweight: true },
    { name: 'Grundlagenausdauer (Zone 2)',  sets: 1, reps: 90, weight: 0, bodyweight: true },
    { name: 'Intervalle (Kurz)',            sets: 8, reps: 2,  weight: 0, bodyweight: true },
    { name: 'Intervalle (Lang)',            sets: 4, reps: 8,  weight: 0, bodyweight: true },
    { name: 'Bergfahrt',                    sets: 1, reps: 60, weight: 0, bodyweight: true },
    { name: 'Sprintintervalle',             sets: 10,reps: 1,  weight: 0, bodyweight: true },
    { name: 'Zeitfahren',                   sets: 1, reps: 40, weight: 0, bodyweight: true },
    { name: 'Lange Ausfahrt',               sets: 1, reps: 180,weight: 0, bodyweight: true },
    { name: 'Indoortraining (Rollentrainer)',sets: 1, reps: 60, weight: 0, bodyweight: true },
    { name: 'Spinning-Kurs',               sets: 1, reps: 45, weight: 0, bodyweight: true },
  ],
  Schwimmen: [
    { name: 'Lockerere Schwimmeinheit',     sets: 1, reps: 30, weight: 0, bodyweight: true },
    { name: 'Kraulen (Technik)',            sets: 4, reps: 5,  weight: 0, bodyweight: true },
    { name: 'Rückenschwimmen',              sets: 3, reps: 5,  weight: 0, bodyweight: true },
    { name: 'Brustschwimmen',               sets: 3, reps: 5,  weight: 0, bodyweight: true },
    { name: 'Delfinschwimmen',              sets: 3, reps: 3,  weight: 0, bodyweight: true },
    { name: 'Intervalle (50m)',             sets: 10,reps: 1,  weight: 0, bodyweight: true },
    { name: 'Intervalle (100m)',            sets: 6, reps: 2,  weight: 0, bodyweight: true },
    { name: 'Ausdauerschwimmen (1km)',      sets: 1, reps: 25, weight: 0, bodyweight: true },
    { name: 'Ausdauerschwimmen (2km)',      sets: 1, reps: 50, weight: 0, bodyweight: true },
    { name: 'Lagenstaffel',                 sets: 4, reps: 5,  weight: 0, bodyweight: true },
  ],
  Rudern: [
    { name: 'Lockeres Rudern',              sets: 1, reps: 20, weight: 0, bodyweight: true },
    { name: 'Grundlagenrudern',             sets: 1, reps: 45, weight: 0, bodyweight: true },
    { name: 'Ruder-Intervalle (500m)',      sets: 6, reps: 3,  weight: 0, bodyweight: true },
    { name: 'Ruder-Intervalle (2000m)',     sets: 3, reps: 8,  weight: 0, bodyweight: true },
    { name: 'Ruder-Zeitfahren (2km)',       sets: 1, reps: 7,  weight: 0, bodyweight: true },
    { name: 'Ergometer Einheit',            sets: 1, reps: 30, weight: 0, bodyweight: true },
  ],
  HIIT: [
    { name: 'Tabata (20s/10s)',             sets: 8, reps: 1,  weight: 0, bodyweight: true },
    { name: 'AMRAP (10 Min)',               sets: 1, reps: 10, weight: 0, bodyweight: true },
    { name: 'EMOM (12 Min)',                sets: 12,reps: 1,  weight: 0, bodyweight: true },
    { name: 'Circuit Training',             sets: 4, reps: 10, weight: 0, bodyweight: true },
    { name: '30/30 Intervalle',             sets: 10,reps: 1,  weight: 0, bodyweight: true },
    { name: 'Pyramid Intervalle',           sets: 5, reps: 5,  weight: 0, bodyweight: true },
    { name: 'Freeletics Workout (Aphrodite)',sets: 1, reps: 30, weight: 0, bodyweight: true },
    { name: 'Freeletics Workout (Ares)',    sets: 1, reps: 20, weight: 0, bodyweight: true },
    { name: 'Freeletics Workout (Hercules)',sets: 1, reps: 25, weight: 0, bodyweight: true },
  ],
  Wandern: [
    { name: 'Flache Wanderung',             sets: 1, reps: 60, weight: 0, bodyweight: true },
    { name: 'Bergwanderung',                sets: 1, reps: 180,weight: 0, bodyweight: true },
    { name: 'Nordic Walking',               sets: 1, reps: 45, weight: 0, bodyweight: true },
    { name: 'Trailrunning',                 sets: 1, reps: 60, weight: 0, bodyweight: true },
    { name: 'Trekking (mehrtägig)',         sets: 1, reps: 360,weight: 0, bodyweight: true },
  ],
  Kampfsport: [
    { name: 'Boxen (Technik)',              sets: 1, reps: 45, weight: 0, bodyweight: true },
    { name: 'Sparring',                     sets: 4, reps: 3,  weight: 0, bodyweight: true },
    { name: 'Sandsack-Training',            sets: 5, reps: 3,  weight: 0, bodyweight: true },
    { name: 'Schattenboxen',                sets: 5, reps: 3,  weight: 0, bodyweight: true },
    { name: 'MMA Training',                 sets: 1, reps: 60, weight: 0, bodyweight: true },
    { name: 'Kickboxen',                    sets: 1, reps: 60, weight: 0, bodyweight: true },
    { name: 'Judo / BJJ',                   sets: 1, reps: 90, weight: 0, bodyweight: true },
  ],
  Yoga: [
    { name: 'Yoga (Yin)',                   sets: 1, reps: 60, weight: 0, bodyweight: true },
    { name: 'Yoga (Vinyasa Flow)',          sets: 1, reps: 60, weight: 0, bodyweight: true },
    { name: 'Yoga (Power)',                 sets: 1, reps: 60, weight: 0, bodyweight: true },
    { name: 'Yoga (Morgenroutine)',         sets: 1, reps: 20, weight: 0, bodyweight: true },
    { name: 'Pilates',                      sets: 1, reps: 50, weight: 0, bodyweight: true },
    { name: 'Stretching',                   sets: 1, reps: 20, weight: 0, bodyweight: true },
    { name: 'Mobility Training',            sets: 1, reps: 30, weight: 0, bodyweight: true },
  ],
  Sonstiges: [
    { name: 'Seilspringen',                 sets: 5, reps: 3,  weight: 0, bodyweight: true },
    { name: 'Klettern',                     sets: 1, reps: 90, weight: 0, bodyweight: true },
    { name: 'Inline Skating',               sets: 1, reps: 60, weight: 0, bodyweight: true },
    { name: 'Skifahren',                    sets: 1, reps: 240,weight: 0, bodyweight: true },
    { name: 'Tennis',                       sets: 1, reps: 90, weight: 0, bodyweight: true },
    { name: 'Fußball',                      sets: 1, reps: 90, weight: 0, bodyweight: true },
    { name: 'Basketball',                   sets: 1, reps: 60, weight: 0, bodyweight: true },
    { name: 'Crossfit',                     sets: 1, reps: 60, weight: 0, bodyweight: true },
    { name: 'Triathlon',                    sets: 1, reps: 120,weight: 0, bodyweight: true },
    { name: 'Spaziergang',                  sets: 1, reps: 30, weight: 0, bodyweight: true },
  ],
};

// Alle Ausdauer-Kategorien
export const ENDURANCE_CATEGORIES = Object.keys(EXERCISE_DB_ENDURANCE);

// Gibt alle Ausdauerübungen flach zurück (ohne Kategorie-Filter) export function getAllEnduranceExercises() {
  return Object.entries(EXERCISE_DB_ENDURANCE).flatMap(([cat, exs]) =>
    exs.map(e => ({ ...e, _category: cat }))
  );
}

// Gibt Ausdauerübungen einer Kategorie zurück export function getEnduranceByCategory(category) {
  return EXERCISE_DB_ENDURANCE[category] || []; }
