import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useGymStore } from '@/store/gymStore';

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const { exercises, exerciseSets, workoutSessions } = useGymStore();

  const exercise = exercises.find((item) => item.id === exerciseId);
  const sets = exerciseSets.filter((set) => set.exercise_id === exerciseId);

  const sessionMap = new Map(workoutSessions.map((session) => [session.id, session]));
  const groupedBySession = Array.from(
    sets.reduce((acc, set) => {
      if (!acc.has(set.session_id)) acc.set(set.session_id, []);
      acc.get(set.session_id)!.push(set);
      return acc;
    }, new Map<string, typeof sets>())
  )
    .map(([sessionId, sessionSets]) => {
      const session = sessionMap.get(sessionId);
      const volume = sessionSets.reduce((sum, set) => sum + set.weight * set.reps, 0);
      const topSet = sessionSets.reduce((max, set) => (set.weight > max.weight ? set : max), sessionSets[0]);

      return {
        session,
        sessionSets: [...sessionSets].sort((a, b) => a.set_number - b.set_number),
        volume,
        topSet,
      };
    })
    .filter((item) => Boolean(item.session?.completed_at))
    .sort((a, b) => new Date(b.session!.completed_at!).getTime() - new Date(a.session!.completed_at!).getTime());

  const bestWeight = sets.length > 0 ? Math.max(...sets.map((set) => set.weight)) : null;
  const bestVolume = groupedBySession.length > 0 ? Math.max(...groupedBySession.map((item) => item.volume)) : null;

  if (!exercise) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText>Exercise not found.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={20} color={theme.text} />
            <ThemedText type="smallBold">Back</ThemedText>
          </Pressable>
          <ThemedText type="smallBold">EXERCISE DETAIL</ThemedText>
          <View style={styles.spacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView type="backgroundElement" style={styles.heroCard}>
            <ThemedText type="subtitle" style={styles.exerciseName}>
              {exercise.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {exercise.muscle_group}
            </ThemedText>
          </ThemedView>

          <View style={styles.metricsRow}>
            <ThemedView type="backgroundElement" style={styles.metricCard}>
              <ThemedText type="small" themeColor="textSecondary">
                BEST WEIGHT
              </ThemedText>
              <ThemedText type="default" style={styles.metricValue}>
                {bestWeight !== null ? `${bestWeight} kg` : '--'}
              </ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.metricCard}>
              <ThemedText type="small" themeColor="textSecondary">
                BEST SESSION VOLUME
              </ThemedText>
              <ThemedText type="default" style={styles.metricValue}>
                {bestVolume !== null ? `${bestVolume} kg` : '--'}
              </ThemedText>
            </ThemedView>
          </View>

          <ThemedView type="backgroundElement" style={styles.historyCard}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              RECENT PERFORMANCE
            </ThemedText>

            {groupedBySession.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyHistory}>
                No completed sessions for this exercise yet.
              </ThemedText>
            ) : (
              groupedBySession.slice(0, 12).map((item) => {
                const completedAt = new Date(item.session!.completed_at!).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <View key={item.session!.id} style={[styles.sessionRow, { borderBottomColor: theme.backgroundSelected }]}>
                    <View style={styles.sessionTop}>
                      <ThemedText type="smallBold">{completedAt}</ThemedText>
                      <ThemedText type="code">Vol {item.volume} kg</ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      Top set: {item.topSet.weight} kg x {item.topSet.reps} reps
                    </ThemedText>
                    <ThemedText type="code" style={styles.setLine}>
                      {item.sessionSets.map((set) => `${set.weight}x${set.reps}`).join(' | ')}
                    </ThemedText>
                  </View>
                );
              })
            )}
          </ThemedView>
        </ScrollView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  spacer: {
    width: 50,
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  heroCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: 2,
  },
  exerciseName: {
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  metricCard: {
    flex: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: 2,
  },
  metricValue: {
    fontWeight: '700',
  },
  historyCard: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  emptyHistory: {
    paddingVertical: Spacing.three,
    textAlign: 'center',
  },
  sessionRow: {
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    gap: 2,
  },
  sessionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setLine: {
    fontSize: 11,
  },
});
