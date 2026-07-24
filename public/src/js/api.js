import { supabase } from './supabaseClient.js';

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    return {
      id: userId, name: '', age: null, weight_kg: null, height_cm: null,
      sex: 'male', goals: [], training_types: [], level: null,
      training_days: 4, macro_kcal: null, macro_protein: null,
      macro_carbs: null, macro_fat: null, onboarding_done: false,
    };
  }
  return data;
}

export async function updateProfile(userId, patch) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...patch })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getWorkoutLogs(userId, limit = 20) {
  const { data, error } = await supabase
    .from('workouts').select('*').eq('user_id', userId).eq('kind', 'log')
    .order('performed_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

export async function addWorkoutLog(userId, { workoutName, durationMin, exerciseCount }) {
  const { data, error } = await supabase
    .from('workouts')
    .insert({
      user_id: userId, kind: 'log', workout_name: workoutName,
      duration_min: durationMin, exercise_count: exerciseCount,
      performed_at: new Date().toISOString(),
    })
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteWorkoutLog(id) {
  const { error } = await supabase.from('workouts').delete().eq('id', id);
  if (error) throw error;
}

// Setzt den kompletten Trainingsfortschritt zurück: löscht alle Workout-Logs
// (Verlauf) und leert den Progressions-Verlauf jeder Übung im eigenen Plan.
// Der Plan selbst (Übungen, Sätze, Ziele) bleibt erhalten - nur die
// aufgezeichnete Historie wird entfernt.
export async function resetAllProgress(userId) {
  const { error: logError } = await supabase
    .from('workouts').delete().eq('user_id', userId).eq('kind', 'log');
  if (logError) throw logError;

  const { data: planExercises, error: fetchError } = await supabase
    .from('workouts').select('id').eq('user_id', userId).eq('kind', 'plan_exercise');
  if (fetchError) throw fetchError;

  for (const ex of planExercises || []) {
    const { error: updateError } = await supabase
      .from('workouts').update({ history: [] }).eq('id', ex.id);
    if (updateError) throw updateError;
  }
}

export async function getMyPlan(userId) {
  const { data, error } = await supabase
    .from('workouts').select('*').eq('user_id', userId).eq('kind', 'plan_exercise')
    .order('plan_day', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addPlanExercise(userId, ex) {
  const { data, error } = await supabase
    .from('workouts')
    .insert({
      user_id: userId, kind: 'plan_exercise', exercise_name: ex.name,
      muscle_group: ex.muscle, plan_day: ex.day, sets: ex.sets,
      reps: ex.reps, weight_kg: ex.weight, is_bodyweight: ex.bodyweight,
      plan_goal: ex.goal || null,
      day_name: ex.dayName || null,
      set_details: ex.setDetails ? JSON.stringify(ex.setDetails) : null,
      history: [],
    })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updatePlanExercise(id, patch) {
  const { data, error } = await supabase
    .from('workouts').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// Setzt den Fortschritt (Trainings-Historie) ALLER Plan-Übungen eines Nutzers
// zurück, ohne die Übungen selbst oder den Plan zu löschen.
export async function resetAllProgressHistory(userId) {
  const { error } = await supabase
    .from('workouts')
    .update({ history: [] })
    .eq('user_id', userId)
    .eq('kind', 'plan_exercise');
  if (error) throw error;
}

export async function deletePlanExercise(id) {
  const { error } = await supabase.from('workouts').delete().eq('id', id);
  if (error) throw error;
}

export async function appendExerciseHistory(id, currentHistory, entry) {
  const updated = [...(currentHistory || [])];
  const today = entry.date;
  const lastIdx = updated.length - 1;
  if (lastIdx >= 0 && updated[lastIdx].date === today) updated[lastIdx] = entry;
  else updated.push(entry);
  return updatePlanExercise(id, { history: updated, sets: entry.sets, reps: entry.reps, weight_kg: entry.weight });
}

export async function getMealsForToday(userId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('body_measurements').select('*').eq('user_id', userId)
    .not('meal_name', 'is', null).gte('measured_at', startOfDay.toISOString())
    .order('measured_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

// Verbrannte Kalorien für heute (manuell erfasst, z.B. von Health-App/Wearable abgelesen).
// Eigener kind='burned' Datensatz pro Tag, damit er unabhängig von Mahlzeiten verwaltet wird.
export async function getBurnedCaloriesForToday(userId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('body_measurements').select('*').eq('user_id', userId)
    .eq('kind', 'burned').gte('measured_at', startOfDay.toISOString())
    .order('measured_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function setBurnedCaloriesForToday(userId, kcal, source, existingId) {
  if (existingId) {
    const { data, error } = await supabase
      .from('body_measurements')
      .update({ burned_kcal: kcal, burned_source: source })
      .eq('id', existingId).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from('body_measurements')
    .insert({
      user_id: userId, kind: 'burned', burned_kcal: kcal, burned_source: source,
      measured_at: new Date().toISOString(),
    })
    .select().single();
  if (error) throw error;
  return data;
}

export async function addMeal(userId, meal) {
  const { data, error } = await supabase
    .from('body_measurements')
    .insert({
      user_id: userId, meal_name: meal.name, meal_type: meal.type,
      kcal: meal.cal, protein_g: meal.protein, carbs_g: meal.carbs,
      fat_g: meal.fat, measured_at: new Date().toISOString(),
      meal_slot_id: meal.slotId || null,
      food_id: meal.foodId || null,
      grams: meal.grams || null,
    })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateMeal(id, meal) {
  const { data, error } = await supabase
    .from('body_measurements')
    .update({
      meal_name: meal.name, kcal: meal.cal, protein_g: meal.protein,
      carbs_g: meal.carbs, fat_g: meal.fat, meal_slot_id: meal.slotId || null,
      grams: meal.grams || null,
    })
    .eq('id', id)
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteMeal(id) {
  const { error } = await supabase.from('body_measurements').delete().eq('id', id);
  if (error) throw error;
}

// Aggregiert Mahlzeiten der letzten N Tage für die Coach-Trendanalyse.
export async function getMealHistoryAggregated(userId, days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('body_measurements')
    .select('measured_at, kcal, protein_g, carbs_g, fat_g')
    .eq('user_id', userId)
    .not('meal_name', 'is', null)
    .gte('measured_at', since.toISOString())
    .order('measured_at', { ascending: true });
  if (error) throw error;

  // Nach Kalendertag gruppieren und pro Tag aufsummieren
  const byDay = {};
  (data || []).forEach((m) => {
    const day = m.measured_at.slice(0, 10); // YYYY-MM-DD
    if (!byDay[day]) byDay[day] = { date: day, totalKcal: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
    byDay[day].totalKcal += m.kcal || 0;
    byDay[day].totalProtein += m.protein_g || 0;
    byDay[day].totalCarbs += m.carbs_g || 0;
    byDay[day].totalFat += m.fat_g || 0;
  });
  return Object.values(byDay);
}

// Gewichtsverlauf für die Coach-Trendanalyse (aus body_measurements mit weight_kg).
export async function getWeightHistoryForTrend(userId, days = 21) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('body_measurements')
    .select('measured_at, weight_kg')
    .eq('user_id', userId)
    .not('weight_kg', 'is', null)
    .gte('measured_at', since.toISOString())
    .order('measured_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((d) => ({ date: d.measured_at.slice(0, 10), weight: d.weight_kg }));
}

// ── VERBRANNTE KALORIEN (manuell erfasst, z.B. aus Apple Health/Garmin) ─
export async function getTodayBurnedCalories(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('burned_calories').select('*')
    .eq('user_id', userId).eq('date', today)
    .maybeSingle();
  if (error) throw error;
  return data; // null, falls heute noch nichts erfasst wurde
}

export async function setTodayBurnedCalories(userId, kcal) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('burned_calories')
    .upsert({ user_id: userId, date: today, kcal, source: 'manual' }, { onConflict: 'user_id,date' })
    .select().single();
  if (error) throw error;
  return data;
}

export async function getMeasurementHistory(userId, limit = 30) {
  const { data, error } = await supabase
    .from('body_measurements').select('*').eq('user_id', userId)
    .not('weight_kg', 'is', null)
    .order('measured_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}
