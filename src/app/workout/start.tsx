import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Info, Play } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useJimStore } from '@/store/jimStore';
import { getNextWorkoutDay, getProgressionSignal } from '@/utils/metrics';

export default function StartWorkoutScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { dayId } = useLocalSearchParams<{ dayId: string }>();

  const { mesocycles, workoutDays, workoutTemplates, exercises, workoutSessions, exerciseSets, startWorkout } = useJimStore();

  const day = workoutDays.find((d) => d.id === dayId);
  const activeMeso = mesocycles.find((meso) => meso.is_active);
  const expectedNextDay = activeMeso ? getNextWorkoutDay(activeMeso.id, workoutDays, workoutSessions) : null;
  const isAllowedDay = Boolean(day && expectedNextDay && day.id === expectedNextDay.id);

  const templates = workoutTemplates
    .filter((t) => t.workout_day_id === dayId)
    .sort((a, b) => a.sort_order - b.sort_order);

  const handleStart = () => {
    if (dayId && isAllowedDay) {
      startWorkout(dayId);
      router.replace('/workout/active');
    }
  };

  if (!day) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText>Workout day not found.</ThemedText>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText type="link">Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  if (!isAllowedDay) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText type="default" style={{ textAlign: 'center' }}>
          This workout day is locked until you complete {expectedNextDay?.name || 'the next day in sequence'}.
        </ThemedText>
        <Pressable onPress={() => router.replace('/')} style={styles.backButton}>
          <ThemedText type="link">Go to Home</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={theme.text} />
            <ThemedText type="default">Home</ThemedText>
          </Pressable>
          <ThemedText type="smallBold">PREVIEW WORKOUT</ThemedText>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Day Title */}
          <View style={styles.titleSection}>
            <ThemedText type="subtitle" style={styles.dayName}>{day.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {templates.length} Exercises • Microcycle sequential day
            </ThemedText>
          </View>

          {/* Exercise list */}
          <View style={styles.list}>
            {templates.map((template, index) => {
              const ex = exercises.find((e) => e.id === template.exercise_id);
              const previousSets = exerciseSets
                .filter((set) => set.exercise_id === template.exercise_id)
                .filter((set) => {
                  const session = workoutSessions.find((item) => item.id === set.session_id);
                  return session?.workout_day_id === day.id && session.completed_at !== null;
                });

              const lastSessionId = previousSets
                .map((set) => set.session_id)
                .sort((a, b) => {
                  const sessionA = workoutSessions.find((session) => session.id === a);
                  const sessionB = workoutSessions.find((session) => session.id === b);
                  return new Date(sessionB?.completed_at || 0).getTime() - new Date(sessionA?.completed_at || 0).getTime();
                })[0];

              const lastPerformance = previousSets
                .filter((set) => set.session_id === lastSessionId)
                .sort((a, b) => a.set_number - b.set_number)
                .map((set) => `${set.weight}x${set.reps}`)
                .join(', ');

              const progressionSignal = getProgressionSignal(
                template,
                previousSets.filter((set) => set.session_id === lastSessionId)
              );

              return (
                <ThemedView key={template.id} type="backgroundElement" style={styles.exerciseCard}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
                      <ThemedText type="code" style={{ fontWeight: '700' }}>
                        {index + 1}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="default" style={styles.exName}>
                        {ex?.name || 'Unknown Exercise'}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {ex?.muscle_group} • {template.target_sets} sets x {template.min_reps}-{template.max_reps} reps
                      </ThemedText>
                      <ThemedText type="code" style={styles.previousPerformance}>
                        Prev: {lastPerformance || '--'}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.progressionHint}>
                        {progressionSignal.message}
                      </ThemedText>
                    </View>
                  </View>

                  {template.notes ? (
                    <View style={[styles.notesBox, { backgroundColor: theme.backgroundSelected }]}>
                      <Info size={14} color={theme.textSecondary} style={{ marginTop: 2 }} />
                      <ThemedText type="small" themeColor="textSecondary" style={styles.notesText}>
                        {template.notes}
                      </ThemedText>
                    </View>
                  ) : null}
                </ThemedView>
              );
            })}
          </View>
        </ScrollView>

        {/* Start Button Fixed at Bottom */}
        <View style={[styles.footer, { borderTopColor: theme.backgroundSelected }]}>
          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [
              styles.startButton,
              { opacity: pressed ? 0.9 : 1 }
            ]}
          >
            <Play size={20} color="#000000" fill="#000000" />
            <ThemedText type="smallBold" style={styles.startButtonText}>
              Start Workout Now
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    width: 80,
  },
  scrollContent: {
    padding: Spacing.three,
    paddingBottom: 100, // Leave space for footer
  },
  titleSection: {
    marginBottom: Spacing.four,
    alignItems: 'center',
  },
  dayName: {
    fontWeight: '800',
    fontSize: 28,
  },
  list: {
    gap: Spacing.two,
  },
  exerciseCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exName: {
    fontWeight: '700',
  },
  notesBox: {
    flexDirection: 'row',
    gap: Spacing.one,
    padding: Spacing.two,
    borderRadius: Spacing.one,
    marginTop: Spacing.one,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  previousPerformance: {
    marginTop: 2,
    opacity: 0.85,
  },
  progressionHint: {
    marginTop: 2,
    fontSize: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: Spacing.three,
    borderTopWidth: 1,
    backgroundColor: '#000000',
  },
  startButton: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + 4,
    borderRadius: Spacing.two,
  },
  startButtonText: {
    color: '#000000',
    fontSize: 16,
  },
});
