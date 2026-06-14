import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getCurrentMicrocycleNumber, getNextWorkoutDay } from '@/utils/metrics';

// Types
export interface Mesocycle {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface WorkoutDay {
  id: string;
  mesocycle_id: string;
  day_number: number;
  name: string;
  sort_order: number;
}

export interface Exercise {
  id: string;
  user_id: string;
  name: string;
  muscle_group: string;
  created_at: string;
}

export interface WorkoutTemplate {
  id: string;
  workout_day_id: string;
  exercise_id: string;
  target_sets: number;
  min_reps: number;
  max_reps: number;
  notes: string;
  sort_order: number;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  mesocycle_id: string;
  workout_day_id: string;
  started_at: string;
  completed_at: string | null;
  microcycle_number: number;
}

export interface ExerciseSet {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
  rir: number | null; // Reps in Reserve
  created_at: string;
}

export interface BodyweightEntry {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  weight: number;
  created_at: string;
}

interface ActiveSessionSet {
  weight: string;
  reps: string;
  rir: string;
  saved: boolean;
}

export interface ActiveSession {
  id: string;
  workoutDayId: string;
  mesocycleId: string;
  startedAt: string;
  microcycleNumber: number;
  sets: {
    [exerciseId: string]: ActiveSessionSet[];
  };
}

interface JimState {
  user: { id: string; email: string } | null;
  mesocycles: Mesocycle[];
  workoutDays: WorkoutDay[];
  exercises: Exercise[];
  workoutTemplates: WorkoutTemplate[];
  workoutSessions: WorkoutSession[];
  exerciseSets: ExerciseSet[];
  bodyweightEntries: BodyweightEntry[];
  activeSession: ActiveSession | null;

  // Actions
  setUser: (user: { id: string; email: string } | null) => void;
  setSyncData: (data: {
    mesocycles: Mesocycle[];
    workoutDays: WorkoutDay[];
    exercises: Exercise[];
    workoutTemplates: WorkoutTemplate[];
    workoutSessions: WorkoutSession[];
    exerciseSets: ExerciseSet[];
    bodyweightEntries: BodyweightEntry[];
  }) => void;
  initializeDefaultData: () => void;
  createExercise: (name: string, muscleGroup: string) => Exercise;
  createMesocycle: (name: string, days: { name: string; templates: { exerciseId: string; targetSets: number; minReps: number; maxReps: number; notes: string }[] }[]) => void;
  cloneMesocycle: (mesocycleId: string, name: string) => void;
  archiveMesocycle: (mesocycleId: string) => void;
  startWorkout: (workoutDayId: string) => void;
  updateActiveSet: (exerciseId: string, setIndex: number, fields: Partial<ActiveSessionSet>) => void;
  saveActiveSet: (exerciseId: string, setIndex: number) => void;
  completeWorkout: () => void;
  discardWorkout: () => void;
  addBodyweightEntry: (weight: number, date?: string) => void;
  deleteBodyweightEntry: (id: string) => void;
  clearAllData: () => void;
}

// Helper to generate UUIDs locally
const uuid = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const DEFAULT_EXERCISES = [
  { name: 'Bench Press', muscle_group: 'Chest' },
  { name: 'Incline DB Press', muscle_group: 'Chest' },
  { name: 'Cable Fly', muscle_group: 'Chest' },
  { name: 'Pull-ups', muscle_group: 'Back' },
  { name: 'Barbell Row', muscle_group: 'Back' },
  { name: 'Lat Pulldown', muscle_group: 'Back' },
  { name: 'Overhead Press', muscle_group: 'Shoulders' },
  { name: 'DB Lateral Raise', muscle_group: 'Shoulders' },
  { name: 'Rear Delt Fly', muscle_group: 'Shoulders' },
  { name: 'Barbell Squat', muscle_group: 'Quads' },
  { name: 'Leg Press', muscle_group: 'Quads' },
  { name: 'Romanian Deadlift', muscle_group: 'Hamstrings' },
  { name: 'Leg Curl', muscle_group: 'Hamstrings' },
  { name: 'Standing Calf Raise', muscle_group: 'Calves' },
  { name: 'Barbell Bicep Curl', muscle_group: 'Biceps' },
  { name: 'Hammer Curl', muscle_group: 'Biceps' },
  { name: 'Triceps Pushdown', muscle_group: 'Triceps' },
  { name: 'Overhead Triceps Extension', muscle_group: 'Triceps' },
  { name: 'Hanging Leg Raise', muscle_group: 'Abs' },
  { name: 'Ab Crunch', muscle_group: 'Abs' },
];

export const useJimStore = create<JimState>()(
  persist(
    (set, get) => ({
      user: { id: 'offline-user', email: 'offline@jim.app' },
      mesocycles: [],
      workoutDays: [],
      exercises: [],
      workoutTemplates: [],
      workoutSessions: [],
      exerciseSets: [],
      bodyweightEntries: [],
      activeSession: null,

      setUser: (user) => set({ user }),

      setSyncData: (data) => set(data),

      initializeDefaultData: () => {
        const state = get();
        if (state.exercises.length > 0) return; // Already initialized

        // Create default exercises
        const createdExercises: Exercise[] = DEFAULT_EXERCISES.map((e) => ({
          id: uuid(),
          user_id: 'offline-user',
          name: e.name,
          muscle_group: e.muscle_group,
          created_at: new Date().toISOString(),
        }));

        // Create a default active Mesocycle
        const mesoId = uuid();
        const activeMeso: Mesocycle = {
          id: mesoId,
          user_id: 'offline-user',
          name: 'Hypertrophy Foundations (4-Day Split)',
          is_active: true,
          started_at: new Date().toISOString(),
          ended_at: null,
          created_at: new Date().toISOString(),
        };

        const days = [
          { name: 'Day 1: Upper A', day_number: 1 },
          { name: 'Day 2: Lower A', day_number: 2 },
          { name: 'Day 3: Upper B', day_number: 3 },
          { name: 'Day 4: Lower B', day_number: 4 },
        ];

        const createdDays: WorkoutDay[] = days.map((d, index) => ({
          id: uuid(),
          mesocycle_id: mesoId,
          day_number: d.day_number,
          name: d.name,
          sort_order: index,
        }));

        // Find exercise IDs for linking templates
        const findExId = (name: string) => createdExercises.find((ex) => ex.name === name)?.id || '';

        const templates: WorkoutTemplate[] = [];

        // Day 1: Upper A templates
        templates.push(
          { id: uuid(), workout_day_id: createdDays[0].id, exercise_id: findExId('Bench Press'), target_sets: 4, min_reps: 8, max_reps: 12, notes: 'Warm up thoroughly. 2-3 min rest.', sort_order: 0 },
          { id: uuid(), workout_day_id: createdDays[0].id, exercise_id: findExId('Pull-ups'), target_sets: 4, min_reps: 8, max_reps: 15, notes: 'Focus on full stretch at bottom.', sort_order: 1 },
          { id: uuid(), workout_day_id: createdDays[0].id, exercise_id: findExId('DB Lateral Raise'), target_sets: 4, min_reps: 12, max_reps: 20, notes: 'Control the descent.', sort_order: 2 },
          { id: uuid(), workout_day_id: createdDays[0].id, exercise_id: findExId('Hammer Curl'), target_sets: 3, min_reps: 10, max_reps: 15, notes: 'Squeeze brachioradialis.', sort_order: 3 }
        );

        // Day 2: Lower A templates
        templates.push(
          { id: uuid(), workout_day_id: createdDays[1].id, exercise_id: findExId('Barbell Squat'), target_sets: 4, min_reps: 6, max_reps: 10, notes: 'Squat below parallel if comfortable.', sort_order: 0 },
          { id: uuid(), workout_day_id: createdDays[1].id, exercise_id: findExId('Leg Curl'), target_sets: 3, min_reps: 10, max_reps: 15, notes: 'Control the eccentric phase.', sort_order: 1 },
          { id: uuid(), workout_day_id: createdDays[1].id, exercise_id: findExId('Standing Calf Raise'), target_sets: 4, min_reps: 12, max_reps: 20, notes: 'Hold stretch for 1s at bottom.', sort_order: 2 }
        );

        // Day 3: Upper B templates
        templates.push(
          { id: uuid(), workout_day_id: createdDays[2].id, exercise_id: findExId('Overhead Press'), target_sets: 3, min_reps: 8, max_reps: 12, notes: 'Keep core tight, no leg drive.', sort_order: 0 },
          { id: uuid(), workout_day_id: createdDays[2].id, exercise_id: findExId('Barbell Row'), target_sets: 4, min_reps: 8, max_reps: 12, notes: 'Pull to lower chest.', sort_order: 1 },
          { id: uuid(), workout_day_id: createdDays[2].id, exercise_id: findExId('Cable Fly'), target_sets: 3, min_reps: 12, max_reps: 15, notes: 'Focus on chest squeeze.', sort_order: 2 },
          { id: uuid(), workout_day_id: createdDays[2].id, exercise_id: findExId('Triceps Pushdown'), target_sets: 3, min_reps: 10, max_reps: 15, notes: 'Lock elbows to sides.', sort_order: 3 }
        );

        // Day 4: Lower B templates
        templates.push(
          { id: uuid(), workout_day_id: createdDays[3].id, exercise_id: findExId('Romanian Deadlift'), target_sets: 4, min_reps: 8, max_reps: 12, notes: 'Hinge at hips. Feel hamstring stretch.', sort_order: 0 },
          { id: uuid(), workout_day_id: createdDays[3].id, exercise_id: findExId('Leg Press'), target_sets: 3, min_reps: 10, max_reps: 15, notes: 'Full depth without tail winking.', sort_order: 1 },
          { id: uuid(), workout_day_id: createdDays[3].id, exercise_id: findExId('Hanging Leg Raise'), target_sets: 3, min_reps: 10, max_reps: 20, notes: 'Raise legs to parallel or higher.', sort_order: 2 }
        );

        // Seed some initial bodyweight entries for graphs
        const weightEntries: BodyweightEntry[] = [];
        const today = new Date();
        for (let i = 14; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          // Generate realistic slight weight fluctuations around 80kg
          const fluctuation = Math.sin(i * 0.5) * 0.4 + (Math.random() - 0.5) * 0.2;
          weightEntries.push({
            id: uuid(),
            user_id: 'offline-user',
            date: dateStr,
            weight: Number((80.5 - i * 0.05 + fluctuation).toFixed(1)),
            created_at: new Date(d).toISOString(),
          });
        }

        set({
          exercises: createdExercises,
          mesocycles: [activeMeso],
          workoutDays: createdDays,
          workoutTemplates: templates,
          bodyweightEntries: weightEntries,
        });
      },

      createExercise: (name: string, muscleGroup: string) => {
        const newEx: Exercise = {
          id: uuid(),
          user_id: 'offline-user',
          name,
          muscle_group: muscleGroup,
          created_at: new Date().toISOString(),
        };
        set((state) => ({ exercises: [...state.exercises, newEx] }));
        return newEx;
      },

      createMesocycle: (name, days) => {
        const mesoId = uuid();

        // Deactivate all previous mesocycles
        const updatedMesos = get().mesocycles.map((m) =>
          m.is_active ? { ...m, is_active: false, ended_at: new Date().toISOString() } : m
        );

        const newMeso: Mesocycle = {
          id: mesoId,
          user_id: 'offline-user',
          name,
          is_active: true,
          started_at: new Date().toISOString(),
          ended_at: null,
          created_at: new Date().toISOString(),
        };

        const createdDays: WorkoutDay[] = [];
        const createdTemplates: WorkoutTemplate[] = [];

        days.forEach((dayData, dIndex) => {
          const dayId = uuid();
          createdDays.push({
            id: dayId,
            mesocycle_id: mesoId,
            day_number: dIndex + 1,
            name: dayData.name,
            sort_order: dIndex,
          });

          dayData.templates.forEach((t, tIndex) => {
            createdTemplates.push({
              id: uuid(),
              workout_day_id: dayId,
              exercise_id: t.exerciseId,
              target_sets: t.targetSets,
              min_reps: t.minReps,
              max_reps: t.maxReps,
              notes: t.notes,
              sort_order: tIndex,
            });
          });
        });

        set({
          mesocycles: [...updatedMesos, newMeso],
          workoutDays: [...get().workoutDays, ...createdDays],
          workoutTemplates: [...get().workoutTemplates, ...createdTemplates],
          activeSession: null, // Reset active workout
        });
      },

      cloneMesocycle: (mesocycleId, name) => {
        const state = get();
        const srcMeso = state.mesocycles.find((m) => m.id === mesocycleId);
        if (!srcMeso) return;

        const srcDays = state.workoutDays.filter((d) => d.mesocycle_id === mesocycleId);

        const newDaysData = srcDays.map((d) => {
          const templates = state.workoutTemplates.filter((t) => t.workout_day_id === d.id);
          return {
            name: d.name,
            templates: templates.map((t) => ({
              exerciseId: t.exercise_id,
              targetSets: t.target_sets,
              minReps: t.min_reps,
              maxReps: t.max_reps,
              notes: t.notes,
            })),
          };
        });

        state.createMesocycle(name, newDaysData);
      },

      archiveMesocycle: (mesocycleId) => {
        set((state) => ({
          mesocycles: state.mesocycles.map((m) =>
            m.id === mesocycleId
              ? { ...m, is_active: false, ended_at: m.ended_at || new Date().toISOString() }
              : m
          ),
        }));
      },

      startWorkout: (workoutDayId) => {
        const state = get();
        const day = state.workoutDays.find((d) => d.id === workoutDayId);
        if (!day) return;

        const activeMeso = state.mesocycles.find((m) => m.is_active);
        if (!activeMeso || day.mesocycle_id !== activeMeso.id) return;

        const expectedNextDay = getNextWorkoutDay(activeMeso.id, state.workoutDays, state.workoutSessions);
        if (!expectedNextDay || expectedNextDay.id !== workoutDayId) {
          // Prevent out-of-order workout starts to preserve asynchronous day sequencing.
          return;
        }

        // Determine current microcycle number
        const microcycleNumber = getCurrentMicrocycleNumber(
          activeMeso.id,
          state.workoutDays,
          state.workoutSessions
        );

        const templates = state.workoutTemplates.filter((t) => t.workout_day_id === workoutDayId);

        // Build active session structure with empty inputs matching target sets
        const activeSets: { [exerciseId: string]: ActiveSessionSet[] } = {};

        templates.forEach((t) => {
          activeSets[t.exercise_id] = Array.from({ length: t.target_sets }, () => ({
            weight: '',
            reps: '',
            rir: '2', // Default 2 reps in reserve
            saved: false,
          }));

          // Fetch previous workout matching sets to pre-populate as placeholders
          const prevSets = state.exerciseSets
            .filter((es) => {
              const session = state.workoutSessions.find((s) => s.id === es.session_id);
              return session && session.workout_day_id === workoutDayId && es.exercise_id === t.exercise_id;
            })
            // Sort by session date descending, then set_number
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          if (prevSets.length > 0) {
            // Find the last session ID
            const lastSessionId = prevSets[0].session_id;
            const lastSessionSets = prevSets.filter((s) => s.session_id === lastSessionId).sort((a, b) => a.set_number - b.set_number);

            // Populate placeholder suggestions
            lastSessionSets.forEach((ps, idx) => {
              if (activeSets[t.exercise_id][idx]) {
                // Pre-populate weight & reps from previous performance for ease of entry
                activeSets[t.exercise_id][idx].weight = String(ps.weight);
                activeSets[t.exercise_id][idx].reps = String(ps.reps);
              }
            });
          }
        });

        const activeSession: ActiveSession = {
          id: uuid(),
          workoutDayId,
          mesocycleId: day.mesocycle_id,
          startedAt: new Date().toISOString(),
          microcycleNumber,
          sets: activeSets,
        };

        set({ activeSession });
      },

      updateActiveSet: (exerciseId, setIndex, fields) => {
        const { activeSession } = get();
        if (!activeSession) return;

        const exerciseSets = activeSession.sets[exerciseId] || [];
        if (!exerciseSets[setIndex]) return;

        const updatedSets = [...exerciseSets];
        updatedSets[setIndex] = { ...updatedSets[setIndex], ...fields };

        set({
          activeSession: {
            ...activeSession,
            sets: {
              ...activeSession.sets,
              [exerciseId]: updatedSets,
            },
          },
        });
      },

      saveActiveSet: (exerciseId, setIndex) => {
        const { activeSession } = get();
        if (!activeSession) return;

        const exerciseSets = activeSession.sets[exerciseId] || [];
        if (!exerciseSets[setIndex]) return;

        const updatedSets = [...exerciseSets];
        updatedSets[setIndex] = { ...updatedSets[setIndex], saved: true };

        set({
          activeSession: {
            ...activeSession,
            sets: {
              ...activeSession.sets,
              [exerciseId]: updatedSets,
            },
          },
        });
      },

      completeWorkout: () => {
        const { activeSession, user } = get();
        if (!activeSession) return;

        const sessionId = activeSession.id;
        const userId = user?.id || 'offline-user';
        const now = new Date().toISOString();

        // Create the Workout Session
        const newSession: WorkoutSession = {
          id: sessionId,
          user_id: userId,
          mesocycle_id: activeSession.mesocycleId,
          workout_day_id: activeSession.workoutDayId,
          started_at: activeSession.startedAt,
          completed_at: now,
          microcycle_number: activeSession.microcycleNumber,
        };

        // Create Exercise Sets for all saved / filled sets
        const newSets: ExerciseSet[] = [];

        Object.entries(activeSession.sets).forEach(([exerciseId, sets]) => {
          sets.forEach((s, idx) => {
            // Include sets that have weight and reps entered
            const weightVal = parseFloat(s.weight);
            const repsVal = parseInt(s.reps, 10);

            if (!isNaN(weightVal) && !isNaN(repsVal)) {
              newSets.push({
                id: uuid(),
                session_id: sessionId,
                exercise_id: exerciseId,
                set_number: idx + 1,
                weight: weightVal,
                reps: repsVal,
                rir: s.rir ? parseInt(s.rir, 10) : null,
                created_at: now,
              });
            }
          });
        });

        set((state) => ({
          workoutSessions: [...state.workoutSessions, newSession],
          exerciseSets: [...state.exerciseSets, ...newSets],
          activeSession: null, // Clear active session
        }));
      },

      discardWorkout: () => {
        set({ activeSession: null });
      },

      addBodyweightEntry: (weight, date) => {
        const userId = get().user?.id || 'offline-user';
        const dateStr = date || new Date().toISOString().split('T')[0];

        // Check if entry for date already exists, overwrite if so
        const existingIdx = get().bodyweightEntries.findIndex((e) => e.date === dateStr);
        const newEntry: BodyweightEntry = {
          id: uuid(),
          user_id: userId,
          date: dateStr,
          weight,
          created_at: new Date().toISOString(),
        };

        if (existingIdx !== -1) {
          const updatedEntries = [...get().bodyweightEntries];
          updatedEntries[existingIdx] = newEntry;
          set({ bodyweightEntries: updatedEntries });
        } else {
          // Keep sorted by date descending
          const updated = [...get().bodyweightEntries, newEntry].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          set({ bodyweightEntries: updated });
        }
      },

      deleteBodyweightEntry: (id) => {
        set((state) => ({
          bodyweightEntries: state.bodyweightEntries.filter((e) => e.id !== id),
        }));
      },

      clearAllData: () => {
        set({
          mesocycles: [],
          workoutDays: [],
          exercises: [],
          workoutTemplates: [],
          workoutSessions: [],
          exerciseSets: [],
          bodyweightEntries: [],
          activeSession: null,
        });
      },
    }),
    {
      name: 'jim-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
