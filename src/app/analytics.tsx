import { Activity, BarChart2, Calendar, TrendingDown, TrendingUp } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LogoutButton from '@/components/logout-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useJimStore } from '@/store/jimStore';
import { calculateSessionVolume, calculateWeightMetrics } from '@/utils/metrics';

export default function AnalyticsScreen() {
  const theme = useTheme();
  const { bodyweightEntries, workoutSessions, exerciseSets, workoutDays } = useJimStore();

  const weightMetrics = calculateWeightMetrics(bodyweightEntries);

  // Calculate workout frequency (last 30 days)
  const completedSessions = workoutSessions.filter((s) => s.completed_at !== null);
  const now = new Date();
  const msInDay = 24 * 60 * 60 * 1000;
  const sessionsLast30Days = completedSessions.filter((s) => {
    const diffDays = (now.getTime() - new Date(s.completed_at!).getTime()) / msInDay;
    return diffDays >= 0 && diffDays <= 30;
  });

  // Calculate volume trends (last 8 sessions)
  const recentSessions = [...completedSessions]
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
    .slice(0, 8);

  const maxVolume = recentSessions.length > 0
    ? Math.max(...recentSessions.map((s) => calculateSessionVolume(s.id, exerciseSets)))
    : 1000;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>Analytics</ThemedText>
          <LogoutButton />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Weight Cards Row */}
          <View style={styles.metricsGrid}>
            <ThemedView type="backgroundElement" style={styles.miniCard}>
              <Activity size={18} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">Latest Weight</ThemedText>
              <ThemedText type="default" style={styles.metricVal}>
                {weightMetrics.currentWeight ? `${weightMetrics.currentWeight} kg` : '--'}
              </ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.miniCard}>
              {weightMetrics.trendDirection === 'up' ? (
                <TrendingUp size={18} color="#ff453a" />
              ) : (
                <TrendingDown size={18} color="#30d158" />
              )}
              <ThemedText type="small" themeColor="textSecondary">Weekly Change</ThemedText>
              <ThemedText
                type="default"
                style={[
                  styles.metricVal,
                  weightMetrics.trendDirection === 'up' && { color: '#ff453a' },
                  weightMetrics.trendDirection === 'down' && { color: '#30d158' }
                ]}
              >
                {weightMetrics.weeklyChangePercent !== null
                  ? `${weightMetrics.weeklyChangePercent > 0 ? '+' : ''}${weightMetrics.weeklyChangePercent}%`
                  : '--'}
              </ThemedText>
            </ThemedView>
          </View>

          {/* Workout Frequency */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.cardHeader}>
              <Calendar size={18} color={theme.textSecondary} />
              <ThemedText type="smallBold" themeColor="textSecondary">WORKOUT FREQUENCY</ThemedText>
            </View>
            <View style={styles.frequencyRow}>
              <View>
                <ThemedText type="title" style={styles.freqNum}>{sessionsLast30Days.length}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">Workouts in the last 30 days</ThemedText>
              </View>
              <ThemedText type="code" style={styles.freqLabel}>
                Avg. {(sessionsLast30Days.length / 4.2).toFixed(1)} / week
              </ThemedText>
            </View>
          </ThemedView>

          {/* Volume Trends List */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.cardHeader}>
              <BarChart2 size={18} color={theme.textSecondary} />
              <ThemedText type="smallBold" themeColor="textSecondary">VOLUME HISTORY (LAST 8 SESSIONS)</ThemedText>
            </View>

            {recentSessions.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginVertical: Spacing.four }}>
                No completed workouts found. Complete sessions to populate volume trends.
              </ThemedText>
            ) : (
              <View style={styles.volumeList}>
                {recentSessions.map((session, idx) => {
                  const vol = calculateSessionVolume(session.id, exerciseSets);
                  const day = workoutDays.find((d) => d.id === session.workout_day_id);
                  const dateStr = new Date(session.completed_at!).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

                  // Compute ratio for custom bar visualization
                  const ratio = maxVolume > 0 ? vol / maxVolume : 0.5;

                  return (
                    <View key={session.id} style={styles.volumeRow}>
                      <View style={styles.volumeRowInfo}>
                        <ThemedText type="smallBold">{day?.name || 'Workout'}</ThemedText>
                        <ThemedText type="code" style={{ opacity: 0.6 }}>{dateStr}</ThemedText>
                      </View>

                      <View style={styles.barVisualContainer}>
                        {/* Custom inline volume bar */}
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                width: `${Math.max(10, ratio * 100)}%`,
                                backgroundColor: theme.text
                              }
                            ]}
                          />
                        </View>
                        <ThemedText type="code" style={styles.volumeVal}>{vol} kg</ThemedText>
                      </View>
                    </View>
                  );
                })}
              </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  headerTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  miniCard: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  frequencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  freqNum: {
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 52,
  },
  freqLabel: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.8,
  },
  volumeList: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  volumeRow: {
    gap: 4,
    paddingVertical: 4,
  },
  volumeRowInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barVisualContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  volumeVal: {
    width: 65,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
  },
});
