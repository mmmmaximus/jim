import type { BodyweightEntry, ExerciseSet, Mesocycle, WorkoutDay, WorkoutSession, WorkoutTemplate } from '@/store/jimStore';

export interface WeightMetrics {
  currentWeight: number | null;
  avgWeight7Day: number | null;
  trendDirection: 'up' | 'down' | 'flat' | 'none';
  trendValue: number | null;
  weeklyChangePercent: number | null;
}

export function calculateWeightMetrics(entries: BodyweightEntry[]): WeightMetrics {
  if (entries.length === 0) {
    return {
      currentWeight: null,
      avgWeight7Day: null,
      trendDirection: 'none',
      trendValue: null,
      weeklyChangePercent: null,
    };
  }

  // Current weight is the most recent entry
  const currentWeight = entries[0].weight;

  // Let's get entries for the last 7 days based on the date of the latest entry
  const latestDate = new Date(entries[0].date);
  const msInDay = 24 * 60 * 60 * 1000;

  const last7DaysEntries = entries.filter((e) => {
    const entryDate = new Date(e.date);
    const diffDays = (latestDate.getTime() - entryDate.getTime()) / msInDay;
    return diffDays >= 0 && diffDays < 7;
  });

  const avgWeight7Day = last7DaysEntries.length > 0
    ? Number((last7DaysEntries.reduce((sum, e) => sum + e.weight, 0) / last7DaysEntries.length).toFixed(2))
    : null;

  // Prior 7 days average (days 8 to 14 from latest date)
  const prior7DaysEntries = entries.filter((e) => {
    const entryDate = new Date(e.date);
    const diffDays = (latestDate.getTime() - entryDate.getTime()) / msInDay;
    return diffDays >= 7 && diffDays < 14;
  });

  const avgWeightPrior7Day = prior7DaysEntries.length > 0
    ? Number((prior7DaysEntries.reduce((sum, e) => sum + e.weight, 0) / prior7DaysEntries.length).toFixed(2))
    : null;

  let trendDirection: 'up' | 'down' | 'flat' | 'none' = 'none';
  let trendValue: number | null = null;
  let weeklyChangePercent: number | null = null;

  if (avgWeight7Day !== null && avgWeightPrior7Day !== null) {
    trendValue = Number((avgWeight7Day - avgWeightPrior7Day).toFixed(2));
    weeklyChangePercent = Number(((trendValue / avgWeightPrior7Day) * 100).toFixed(2));

    if (Math.abs(trendValue) < 0.1) {
      trendDirection = 'flat';
    } else {
      trendDirection = trendValue > 0 ? 'up' : 'down';
    }
  }

  return {
    currentWeight,
    avgWeight7Day,
    trendDirection,
    trendValue,
    weeklyChangePercent,
  };
}

export function calculateSessionVolume(sessionId: string, sets: ExerciseSet[]): number {
  return sets
    .filter((s) => s.session_id === sessionId)
    .reduce((sum, s) => sum + s.weight * s.reps, 0);
}

export function calculateExerciseVolume(sessionId: string, exerciseId: string, sets: ExerciseSet[]): number {
  return sets
    .filter((s) => s.session_id === sessionId && s.exercise_id === exerciseId)
    .reduce((sum, s) => sum + s.weight * s.reps, 0);
}

export function getNextWorkoutDay(
  activeMesoId: string,
  workoutDays: WorkoutDay[],
  sessions: WorkoutSession[]
): WorkoutDay | null {
  const mesoDays = workoutDays
    .filter((d) => d.mesocycle_id === activeMesoId)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (mesoDays.length === 0) return null;

  const mesoSessions = sessions
    .filter((s) => s.mesocycle_id === activeMesoId && s.completed_at !== null)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());

  if (mesoSessions.length === 0) {
    // No sessions completed yet, start with Day 1
    return mesoDays[0];
  }

  // Find the last completed day
  const lastCompletedDayId = mesoSessions[0].workout_day_id;
  const lastDayIndex = mesoDays.findIndex((d) => d.id === lastCompletedDayId);

  if (lastDayIndex === -1 || lastDayIndex === mesoDays.length - 1) {
    // If last completed day was the last day in the microcycle, wrap around to Day 1
    return mesoDays[0];
  }

  // Otherwise, the next day in sequence
  return mesoDays[lastDayIndex + 1];
}

export function getCurrentMicrocycleNumber(
  activeMesoId: string,
  workoutDays: WorkoutDay[],
  sessions: WorkoutSession[]
): number {
  const mesoDaysCount = workoutDays.filter((d) => d.mesocycle_id === activeMesoId).length;
  if (mesoDaysCount === 0) return 1;

  const completedSessions = sessions.filter(
    (s) => s.mesocycle_id === activeMesoId && s.completed_at !== null
  ).length;

  return Math.floor(completedSessions / mesoDaysCount) + 1;
}

export function getMesocycleDurationDays(meso: Mesocycle): number {
  const start = new Date(meso.started_at).getTime();
  const end = meso.ended_at ? new Date(meso.ended_at).getTime() : Date.now();
  const diff = Math.max(0, end - start);
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export type ProgressionSignal = {
  action: 'increase-load' | 'add-reps' | 'hold' | 'deload';
  message: string;
};

export function getProgressionSignal(
  template: WorkoutTemplate,
  previousSets: ExerciseSet[]
): ProgressionSignal {
  if (previousSets.length === 0) {
    return {
      action: 'hold',
      message: 'No prior data. Start conservatively and target clean execution.',
    };
  }

  const reachedTopRepAcrossSets = previousSets.every((set) => set.reps >= template.max_reps);
  const belowMinOnMostSets = previousSets.filter((set) => set.reps < template.min_reps).length >= Math.ceil(previousSets.length / 2);

  if (reachedTopRepAcrossSets) {
    return {
      action: 'increase-load',
      message: 'All sets hit top of range. Increase load by 2-5% next session.',
    };
  }

  if (belowMinOnMostSets) {
    return {
      action: 'deload',
      message: 'Most sets fell below range. Reduce load slightly or add rest.',
    };
  }

  const nearTopRange = previousSets.filter((set) => set.reps >= template.max_reps - 1).length >= Math.ceil(previousSets.length / 2);
  if (nearTopRange) {
    return {
      action: 'add-reps',
      message: 'Close to top range. Push reps before increasing load.',
    };
  }

  return {
    action: 'hold',
    message: 'Hold load and improve rep quality within target range.',
  };
}
