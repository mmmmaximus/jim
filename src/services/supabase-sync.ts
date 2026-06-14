import { isMockClient, supabase } from '@/db/supabase';
import { useJimStore } from '@/store/jimStore';

export interface ExerciseHistoryViewRow {
  exercise_id: string;
  exercise: string;
  last_performed_date: string | null;
  last_session_sets: string | null;
  best_weight: number | null;
  best_volume: number | null;
  user_id?: string;
}

/**
 * Fetch all user data from Supabase and sync to Zustand store
 */
export async function syncUserDataFromSupabase(userId: string) {
  if (isMockClient || !supabase) {
    console.warn('Supabase not configured, skipping sync');
    return;
  }

  try {
    console.log('[Sync] Starting Supabase sync for user:', userId);

    // Fetch all data in parallel
    const [mesosRes, exRes, sessionsRes, weightsRes] = await Promise.all([
      supabase.from('mesocycles').select('*').eq('user_id', userId),
      supabase.from('exercises').select('*').eq('user_id', userId),
      supabase.from('workout_sessions').select('*').eq('user_id', userId),
      supabase.from('bodyweight_entries').select('*').eq('user_id', userId),
    ]);

    const mesoIds = (mesosRes.data || []).map((item) => item.id);
    const sessionIds = (sessionsRes.data || []).map((item) => item.id);

    const [daysRes, templatesRes, setsRes] = await Promise.all([
      mesoIds.length > 0
        ? supabase.from('workout_days').select('*').in('mesocycle_id', mesoIds)
        : Promise.resolve({ data: [], error: null }),
      mesoIds.length > 0
        ? supabase
            .from('workout_templates')
            .select('*, workout_days!inner(mesocycle_id)')
            .in('workout_days.mesocycle_id', mesoIds)
        : Promise.resolve({ data: [], error: null }),
      sessionIds.length > 0
        ? supabase.from('exercise_sets').select('*').in('session_id', sessionIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const cleanedTemplates = (templatesRes.data || []).map((template: any) => ({
      id: template.id,
      workout_day_id: template.workout_day_id,
      exercise_id: template.exercise_id,
      target_sets: template.target_sets,
      min_reps: template.min_reps,
      max_reps: template.max_reps,
      notes: template.notes,
      sort_order: template.sort_order,
    }));

    const store = useJimStore.getState();

    // Update store with fetched data
    store.setSyncData({
      mesocycles: mesosRes.data || [],
      workoutDays: daysRes.data || [],
      exercises: exRes.data || [],
      workoutTemplates: cleanedTemplates,
      workoutSessions: sessionsRes.data || [],
      exerciseSets: setsRes.data || [],
      bodyweightEntries: weightsRes.data || [],
    });

    console.log('[Sync] Completed successfully');
  } catch (error) {
    console.error('[Sync] Error:', error);
  }
}

export async function getExerciseHistoryViewSupabase(
  userId: string,
  exerciseId?: string
): Promise<ExerciseHistoryViewRow[]> {
  if (isMockClient || !supabase) return [];

  let query = supabase
    .from('exercise_history_view')
    .select('*')
    .eq('user_id', userId)
    .order('exercise', { ascending: true });

  if (exerciseId) {
    query = query.eq('exercise_id', exerciseId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error querying exercise history view:', error);
    return [];
  }

  return (data || []) as ExerciseHistoryViewRow[];
}

/**
 * Create a new exercise in Supabase
 */
export async function createExerciseSupabase(userId: string, name: string, muscleGroup: string) {
  if (isMockClient || !supabase) return null;

  const { data, error } = await supabase
    .from('exercises')
    .insert([{ user_id: userId, name, muscle_group: muscleGroup }])
    .select()
    .single();

  if (error) {
    console.error('Error creating exercise:', error);
    return null;
  }
  return data;
}

/**
 * Create a new mesocycle with workout days and templates
 */
export async function createMesocycleSupabase(userId: string, name: string, days: any[]) {
  if (isMockClient || !supabase) return null;

  try {
    // 1. Create mesocycle
    const { data: mesoData, error: mesoError } = await supabase
      .from('mesocycles')
      .insert([{ user_id: userId, name, is_active: true }])
      .select()
      .single();

    if (mesoError) throw mesoError;

    // 2. Create workout days and templates
    for (let dIdx = 0; dIdx < days.length; dIdx++) {
      const day = days[dIdx];

      const { data: dayData, error: dayError } = await supabase
        .from('workout_days')
        .insert([{
          mesocycle_id: mesoData.id,
          day_number: dIdx + 1,
          name: day.name,
          sort_order: dIdx,
        }])
        .select()
        .single();

      if (dayError) throw dayError;

      // Create templates for this day
      const templates = day.templates.map((t: any, tIdx: number) => ({
        workout_day_id: dayData.id,
        exercise_id: t.exerciseId,
        target_sets: t.targetSets,
        min_reps: t.minReps,
        max_reps: t.maxReps,
        notes: t.notes,
        sort_order: tIdx,
      }));

      const { error: templatesError } = await supabase
        .from('workout_templates')
        .insert(templates);

      if (templatesError) throw templatesError;
    }

    return mesoData;
  } catch (error) {
    console.error('Error creating mesocycle:', error);
    return null;
  }
}

/**
 * Start a workout session
 */
export async function startWorkoutSupabase(userId: string, workoutDayId: string, mesocycleId: string, microcycleNumber: number) {
  if (isMockClient || !supabase) return null;

  const { data, error } = await supabase
    .from('workout_sessions')
    .insert([{
      user_id: userId,
      workout_day_id: workoutDayId,
      mesocycle_id: mesocycleId,
      started_at: new Date().toISOString(),
      microcycle_number: microcycleNumber,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error starting workout:', error);
    return null;
  }
  return data;
}

/**
 * Complete workout and save all sets
 */
export async function completeWorkoutSupabase(sessionId: string, sets: any[]) {
  if (isMockClient || !supabase) return null;

  try {
    // Update session as completed
    const { error: sessionError } = await supabase
      .from('workout_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (sessionError) throw sessionError;

    // Insert all sets
    if (sets.length > 0) {
      const { error: setsError } = await supabase
        .from('exercise_sets')
        .insert(sets);

      if (setsError) throw setsError;
    }

    return true;
  } catch (error) {
    console.error('Error completing workout:', error);
    return false;
  }
}

/**
 * Add bodyweight entry
 */
export async function addBodyweightSupabase(userId: string, weight: number, date: string) {
  if (isMockClient || !supabase) return null;

  const { data, error } = await supabase
    .from('bodyweight_entries')
    .upsert([{ user_id: userId, date, weight }], { onConflict: 'user_id,date' })
    .select()
    .single();

  if (error) {
    console.error('Error adding bodyweight:', error);
    return null;
  }
  return data;
}
