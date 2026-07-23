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
  return updatePlanExercise(id, { history: updated, sets: entry.sets, reps: entry.reps, weight_kg: entry.weight }); }

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

export async function addMeal(userId, meal) {
  const { data, error } = await supabase
    .from('body_measurements')
    .insert({
      user_id: userId, meal_name: meal.name, meal_type: meal.type,
      kcal: meal.cal, protein_g: meal.protein, carbs_g: meal.carbs,
      fat_g: meal.fat, measured_at: new Date().toISOString(),
    })
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
