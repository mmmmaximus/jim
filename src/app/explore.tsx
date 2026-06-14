import { useRouter } from 'expo-router';
import { ChevronRight, Dumbbell, Plus, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LogoutButton from '@/components/logout-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useJimStore } from '@/store/jimStore';

export default function ExploreScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { exercises, createExercise, exerciseSets, workoutSessions } = useJimStore();

  const [search, setSearch] = useState('');
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newMuscleGroup, setNewMuscleGroup] = useState('Shoulders');

  const filteredExercises = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const sorted = [...exercises].sort((a, b) => a.name.localeCompare(b.name));

    if (!normalized) return sorted;
    return sorted.filter(
      (exercise) =>
        exercise.name.toLowerCase().includes(normalized) ||
        exercise.muscle_group.toLowerCase().includes(normalized)
    );
  }, [search, exercises]);

  const getExerciseStats = (exerciseId: string) => {
    const sets = exerciseSets.filter((set) => set.exercise_id === exerciseId);
    if (sets.length === 0) {
      return {
        lastPerformed: 'Never',
        bestWeight: '--',
        lastSummary: 'No logged sets yet',
      };
    }

    const bestWeight = Math.max(...sets.map((set) => set.weight));
    const sessionIds = Array.from(new Set(sets.map((set) => set.session_id)));
    const lastSession = sessionIds
      .map((sessionId) => workoutSessions.find((session) => session.id === sessionId))
      .filter((session): session is NonNullable<typeof session> => Boolean(session?.completed_at))
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0];

    if (!lastSession) {
      return {
        lastPerformed: 'Never',
        bestWeight: `${bestWeight} kg`,
        lastSummary: 'No completed session yet',
      };
    }

    const lastSessionSets = sets
      .filter((set) => set.session_id === lastSession.id)
      .sort((a, b) => a.set_number - b.set_number);

    const lastSummary = lastSessionSets
      .slice(0, 2)
      .map((set) => `${set.weight}x${set.reps}`)
      .join(', ');

    const dateStr = new Date(lastSession.completed_at!).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
    });

    return {
      lastPerformed: dateStr,
      bestWeight: `${bestWeight} kg`,
      lastSummary: lastSummary || 'No sets',
    };
  };

  const handleCreateExercise = () => {
    const name = newExerciseName.trim();
    const group = newMuscleGroup.trim();
    if (!name || !group) return;

    createExercise(name, group);
    setNewExerciseName('');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <ThemedText type="subtitle" style={styles.title}>
              Exercise Library
            </ThemedText>
            <LogoutButton />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Search history, add exercises, review performance
          </ThemedText>
        </View>

        <ThemedView type="backgroundElement" style={styles.searchBox}>
          <Search size={16} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search exercise or muscle group"
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.addCard}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            CREATE EXERCISE
          </ThemedText>
          <TextInput
            style={[styles.inlineInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
            placeholder="Exercise name"
            placeholderTextColor={theme.textSecondary}
            value={newExerciseName}
            onChangeText={setNewExerciseName}
          />
          <View style={styles.createRow}>
            <TextInput
              style={[styles.inlineInput, styles.groupInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
              placeholder="Muscle group"
              placeholderTextColor={theme.textSecondary}
              value={newMuscleGroup}
              onChangeText={setNewMuscleGroup}
            />
            <Pressable onPress={handleCreateExercise} style={styles.addButton}>
              <Plus size={16} color="#000000" />
              <ThemedText type="smallBold" style={{ color: '#000000' }}>
                Add
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>

        <ScrollView contentContainerStyle={styles.listContent}>
          {filteredExercises.map((exercise) => {
            const stats = getExerciseStats(exercise.id);
            return (
              <Pressable
                key={exercise.id}
                onPress={() => router.push(`/exercise/${exercise.id}`)}
                style={({ pressed }) => [styles.itemPressable, { opacity: pressed ? 0.85 : 1 }]}
              >
                <ThemedView type="backgroundElement" style={styles.exerciseCard}>
                  <View style={styles.exerciseTopRow}>
                    <View style={styles.exerciseTitleWrap}>
                      <ThemedText type="default" style={styles.exerciseName}>
                        {exercise.name}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {exercise.muscle_group}
                      </ThemedText>
                    </View>
                    <ChevronRight size={18} color={theme.textSecondary} />
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Dumbbell size={14} color={theme.textSecondary} />
                      <ThemedText type="code">Best: {stats.bestWeight}</ThemedText>
                    </View>
                    <ThemedText type="code">Last: {stats.lastPerformed}</ThemedText>
                  </View>

                  <ThemedText type="small" themeColor="textSecondary">
                    Recent: {stats.lastSummary}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            );
          })}

          {filteredExercises.length === 0 && (
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <ThemedText type="small">No exercises matched your search.</ThemedText>
            </ThemedView>
          )}
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
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.two,
  },
  header: {
    paddingTop: Spacing.one,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontWeight: '800',
    marginBottom: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  addCard: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    gap: Spacing.two,
  },
  createRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  inlineInput: {
    borderWidth: 1,
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
    fontSize: 14,
  },
  groupInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#ffffff',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  itemPressable: {
    borderRadius: Spacing.two,
  },
  exerciseCard: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  exerciseTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseTitleWrap: {
    flex: 1,
    marginRight: Spacing.two,
  },
  exerciseName: {
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
});
