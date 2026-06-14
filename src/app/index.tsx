import { useRouter } from 'expo-router';
import { Activity, ArrowUpRight, CalendarDays, ClipboardList, Plus, Scale } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LogoutButton from '@/components/logout-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useGymStore } from '@/store/gymStore';
import { calculateWeightMetrics, getCurrentMicrocycleNumber, getMesocycleDurationDays, getNextWorkoutDay } from '@/utils/metrics';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { mesocycles, workoutDays, workoutSessions, bodyweightEntries, activeSession } = useGymStore();

  const activeMeso = mesocycles.find((meso) => meso.is_active);
  const nextDay = activeMeso ? getNextWorkoutDay(activeMeso.id, workoutDays, workoutSessions) : null;
  const microcycleNumber = activeMeso
    ? getCurrentMicrocycleNumber(activeMeso.id, workoutDays, workoutSessions)
    : 1;
  const mesoDurationDays = activeMeso ? getMesocycleDurationDays(activeMeso) : 0;
  const weightMetrics = calculateWeightMetrics(bodyweightEntries);

  const trendColor =
    weightMetrics.trendDirection === 'up'
      ? '#ff9f0a'
      : weightMetrics.trendDirection === 'down'
        ? '#30d158'
        : theme.textSecondary;

  const handleStartWorkout = () => {
    if (!nextDay) return;
    router.push(`/workout/start?dayId=${nextDay.id}`);
  };

  const actionButtons = [
    {
      key: 'start',
      label: activeSession ? 'Resume Workout' : 'Start Workout',
      icon: <ClipboardList size={18} color="#000000" />,
      onPress: () => {
        if (activeSession) {
          router.push('/workout/active');
          return;
        }
        handleStartWorkout();
      },
      disabled: !activeSession && !nextDay,
      primary: true,
    },
    {
      key: 'weight',
      label: 'Log Weight',
      icon: <Scale size={18} color={theme.text} />,
      onPress: () => router.push('/weight/entry'),
    },
    {
      key: 'history',
      label: 'View History',
      icon: <Activity size={18} color={theme.text} />,
      onPress: () => router.push('/explore'),
    },
    {
      key: 'meso',
      label: 'Create Meso',
      icon: <Plus size={18} color={theme.text} />,
      onPress: () => router.push('/mesocycle'),
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              ASYNCHRONOUS HYPERTROPHY
            </ThemedText>
            <ThemedText type="subtitle" style={styles.title}>
              Training Dashboard
            </ThemedText>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push('/analytics')}>
              <ArrowUpRight size={22} color={theme.text} />
            </Pressable>
            <LogoutButton />
          </View>
        </View>

        <ThemedView type="backgroundElement" style={styles.weightCard}>
          <View style={styles.cardTopRow}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              BODYWEIGHT
            </ThemedText>
            <Scale size={16} color={theme.textSecondary} />
          </View>

          <ThemedText type="title" style={styles.weightValue}>
            {weightMetrics.currentWeight !== null ? `${weightMetrics.currentWeight} kg` : '--'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            7-day avg: {weightMetrics.avgWeight7Day !== null ? `${weightMetrics.avgWeight7Day} kg` : '--'}
          </ThemedText>
          <ThemedText type="smallBold" style={{ color: trendColor }}>
            {weightMetrics.weeklyChangePercent !== null
              ? `${weightMetrics.weeklyChangePercent > 0 ? '+' : ''}${weightMetrics.weeklyChangePercent}% / week`
              : 'Need 2 weeks of entries for trend'}
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.mesoCard}>
          <View style={styles.cardTopRow}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              ACTIVE MESOCYCLE
            </ThemedText>
            <CalendarDays size={16} color={theme.textSecondary} />
          </View>

          <ThemedText type="default" style={styles.mesoName}>
            {activeMeso?.name || 'No active mesocycle'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Duration: {activeMeso ? `${mesoDurationDays} days` : '--'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Microcycle #{microcycleNumber}
          </ThemedText>
          <ThemedText type="smallBold">
            Next: {nextDay?.name || 'Create a mesocycle to start training'}
          </ThemedText>
        </ThemedView>

        <View style={styles.actions}>
          {actionButtons.map((button) => (
            <Pressable
              key={button.key}
              onPress={button.onPress}
              disabled={Boolean(button.disabled)}
              style={({ pressed }) => [
                styles.actionButton,
                button.primary && styles.primaryButton,
                button.disabled && styles.disabledButton,
                { opacity: pressed ? 0.9 : 1 },
              ]}>
              {button.icon}
              <ThemedText
                type="smallBold"
                style={button.primary ? { color: '#000000' } : undefined}>
                {button.label}
              </ThemedText>
            </Pressable>
          ))}
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
    paddingHorizontal: Spacing.three,
    alignItems: 'stretch',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.one,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontWeight: '800',
    marginTop: 2,
  },
  weightCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  mesoCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  weightValue: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '800',
  },
  mesoName: {
    fontWeight: '700',
    marginBottom: 2,
  },
  actions: {
    marginTop: Spacing.one,
    gap: Spacing.two,
  },
  actionButton: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  disabledButton: {
    opacity: 0.45,
  },
});
