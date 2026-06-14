import React from 'react';
import { StyleSheet, View, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Trophy, CheckCircle, Flame, Dumbbell, Award, ArrowUp } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useGymStore } from '@/store/gymStore';
import { calculateSessionVolume } from '@/utils/metrics';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  const { workoutSessions, exerciseSets, exercises, workoutDays } = useGymStore();

  // The session we just completed is the last one in the list
  const completedSessions = workoutSessions.filter((s) => s.completed_at !== null);
  const lastSession = completedSessions.length > 0 ? completedSessions[completedSessions.length - 1] : null;

  if (!lastSession) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText>No completed session found.</ThemedText>
        <Pressable onPress={() => router.replace('/')} style={styles.doneBtn}>
          <ThemedText type="smallBold" style={{ color: '#000000' }}>Go Home</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const day = workoutDays.find((d) => d.id === lastSession.workout_day_id);
  const sessionSets = exerciseSets.filter((s) => s.session_id === lastSession.id);
  const totalVolume = calculateSessionVolume(lastSession.id, exerciseSets);
  
  // Group sets by exercise
  const exerciseIds = Array.from(new Set(sessionSets.map((s) => s.exercise_id)));

  // Find second-last completed session for the same workout day to compare
  const pastSessionsSameDay = completedSessions
    .filter((s) => s.workout_day_id === lastSession.workout_day_id && s.id !== lastSession.id)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());

  const prevSession = pastSessionsSameDay.length > 0 ? pastSessionsSameDay[0] : null;
  const prevVolume = prevSession ? calculateSessionVolume(prevSession.id, exerciseSets) : 0;
  
  const volumeDiff = totalVolume - prevVolume;
  const volumeDiffPercent = prevVolume > 0 ? (volumeDiff / prevVolume) * 100 : 0;

  // Find PRs (weight or reps)
  // We check if the maximum weight lifted in this session for each exercise exceeds the maximum weight logged in all previous sessions for that exercise.
  const prs: { exerciseName: string; weight: number; reps: number }[] = [];

  exerciseIds.forEach((exId) => {
    const exName = exercises.find((e) => e.id === exId)?.name || 'Exercise';
    
    // Max weight in this session
    const currentExSets = sessionSets.filter((s) => s.exercise_id === exId);
    const maxSessionWeight = Math.max(...currentExSets.map((s) => s.weight), 0);
    const maxSessionSet = currentExSets.find((s) => s.weight === maxSessionWeight);

    // Max weight in previous sessions
    const prevExSets = exerciseSets.filter((s) => s.exercise_id === exId && s.session_id !== lastSession.id);
    const maxHistoricalWeight = prevExSets.length > 0 ? Math.max(...prevExSets.map((s) => s.weight), 0) : 0;

    if (maxSessionWeight > maxHistoricalWeight && maxHistoricalWeight > 0 && maxSessionSet) {
      prs.push({
        exerciseName: exName,
        weight: maxSessionWeight,
        reps: maxSessionSet.reps,
      });
    }
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header Trophy Banner */}
          <View style={styles.trophyBanner}>
            <Trophy size={64} color="#ffd700" style={styles.trophyIcon} />
            <ThemedText type="subtitle" style={styles.congratsTitle}>Workout Smashed!</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Great session on {day?.name || 'Workout Day'}
            </ThemedText>
          </View>

          {/* Core Stats Card */}
          <ThemedView type="backgroundElement" style={styles.statsCard}>
            <View style={styles.statBox}>
              <ThemedText type="small" themeColor="textSecondary">VOLUME LIFTED</ThemedText>
              <ThemedText type="title" style={styles.statNumber}>{totalVolume} kg</ThemedText>
              
              {prevVolume > 0 && (
                <View style={styles.comparisonRow}>
                  <ArrowUp size={14} color="#30d158" style={{ transform: [{ rotate: volumeDiff >= 0 ? '0deg' : '180deg' }] }} />
                  <ThemedText 
                    type="smallBold" 
                    style={{ color: volumeDiff >= 0 ? '#30d158' : '#ff453a' }}
                  >
                    {volumeDiff >= 0 ? '+' : ''}{volumeDiff} kg ({volumeDiffPercent.toFixed(1)}%) vs last cycle
                  </ThemedText>
                </View>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.miniStatsRow}>
              <View style={styles.miniStatBox}>
                <Dumbbell size={16} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">Exercises</ThemedText>
                <ThemedText type="default" style={styles.miniStatVal}>{exerciseIds.length}</ThemedText>
              </View>
              <View style={styles.miniStatBox}>
                <Flame size={16} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">Total Sets</ThemedText>
                <ThemedText type="default" style={styles.miniStatVal}>{sessionSets.length}</ThemedText>
              </View>
            </View>
          </ThemedView>

          {/* Personal Records (PR) Section */}
          {prs.length > 0 && (
            <ThemedView type="backgroundElement" style={styles.prCard}>
              <View style={styles.prHeader}>
                <Award size={20} color="#ffd700" />
                <ThemedText type="smallBold" style={{ color: '#ffd700', letterSpacing: 0.5 }}>
                  NEW RECORDS HIT!
                </ThemedText>
              </View>
              <View style={styles.prList}>
                {prs.map((pr, idx) => (
                  <View key={idx} style={styles.prRow}>
                    <CheckCircle size={14} color="#ffd700" />
                    <ThemedText type="small" style={{ flex: 1 }}>
                      <ThemedText type="smallBold">{pr.exerciseName}</ThemedText>: {pr.weight} kg x {pr.reps} reps
                    </ThemedText>
                  </View>
                ))}
              </View>
            </ThemedView>
          )}

          {/* Exercise list completed */}
          <ThemedView type="backgroundElement" style={styles.listCard}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={{ marginBottom: Spacing.two }}>
              EXERCISES COMPLETED
            </ThemedText>
            
            {exerciseIds.map((exId) => {
              const exName = exercises.find((e) => e.id === exId)?.name || 'Exercise';
              const exSets = sessionSets.filter((s) => s.exercise_id === exId);
              
              return (
                <View key={exId} style={[styles.exerciseRow, { borderBottomColor: theme.backgroundSelected }]}>
                  <ThemedText type="default" style={styles.exName}>{exName}</ThemedText>
                  <View style={styles.setsColumn}>
                    {exSets.map((s, idx) => (
                      <ThemedText key={s.id} type="code" style={styles.setPerformance}>
                        Set {idx + 1}: {s.weight} kg x {s.reps} {s.rir !== null ? `(RIR ${s.rir})` : ''}
                      </ThemedText>
                    ))}
                  </View>
                </View>
              );
            })}
          </ThemedView>

          {/* Done Button */}
          <Pressable
            onPress={() => router.replace('/')}
            style={({ pressed }) => [
              styles.doneBtn,
              { opacity: pressed ? 0.9 : 1 }
            ]}
          >
            <ThemedText type="smallBold" style={styles.doneBtnText}>
              Back to Home
            </ThemedText>
          </Pressable>

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  trophyBanner: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  trophyIcon: {
    marginBottom: Spacing.two,
  },
  congratsTitle: {
    fontWeight: '800',
    fontSize: 26,
    textAlign: 'center',
  },
  statsCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
    gap: Spacing.three,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 42,
    fontWeight: '800',
    lineHeight: 48,
    marginTop: Spacing.one,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.one,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  miniStatsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  miniStatBox: {
    alignItems: 'center',
    gap: 2,
  },
  miniStatVal: {
    fontWeight: '700',
    fontSize: 18,
  },
  prCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 1,
    gap: Spacing.two,
  },
  prHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  prList: {
    gap: Spacing.one,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  listCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  exerciseRow: {
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  exName: {
    fontWeight: '700',
    flex: 1,
    marginRight: Spacing.two,
  },
  setsColumn: {
    alignItems: 'flex-end',
  },
  setPerformance: {
    fontSize: 12,
    opacity: 0.8,
  },
  doneBtn: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two + 4,
    borderRadius: Spacing.two,
    marginTop: Spacing.two,
  },
  doneBtnText: {
    color: '#000000',
    fontSize: 16,
  },
});
