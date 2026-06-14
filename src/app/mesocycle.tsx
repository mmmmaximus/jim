import { Archive, ArrowDown, ArrowUp, Check, Copy, Plus, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LogoutButton from '@/components/logout-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useGymStore } from '@/store/gymStore';

interface BuilderExercise {
  exerciseId: string;
  targetSets: number;
  minReps: number;
  maxReps: number;
  notes: string;
}

interface BuilderDay {
  name: string;
  templates: BuilderExercise[];
}

export default function MesocycleScreen() {
  const theme = useTheme();
  const { mesocycles, workoutDays, workoutTemplates, exercises, createMesocycle, cloneMesocycle, archiveMesocycle } = useGymStore();

  const [isBuilding, setIsBuilding] = useState(false);
  const [mesoName, setMesoName] = useState('');
  const [builderDays, setBuilderDays] = useState<BuilderDay[]>([
    { name: 'Day 1: Upper', templates: [] },
    { name: 'Day 2: Lower', templates: [] },
    { name: 'Day 3: Upper', templates: [] },
    { name: 'Day 4: Lower', templates: [] },
  ]);

  const handleStartBuilder = () => {
    setMesoName('');
    setBuilderDays([
      { name: 'Day 1: Upper A', templates: [] },
      { name: 'Day 2: Lower A', templates: [] },
      { name: 'Day 3: Upper B', templates: [] },
      { name: 'Day 4: Lower B', templates: [] },
    ]);
    setIsBuilding(true);
  };

  const handleSaveMeso = () => {
    if (!mesoName.trim()) {
      Alert.alert('Missing Name', 'Please enter a name for the mesocycle.');
      return;
    }

    const hasTemplates = builderDays.some(d => d.templates.length > 0);
    if (!hasTemplates) {
      Alert.alert('No Exercises', 'Please add at least one exercise to your mesocycle.');
      return;
    }

    createMesocycle(mesoName.trim(), builderDays);
    setIsBuilding(false);
  };

  const handleClone = (mesoId: string, oldName: string) => {
    Alert.prompt
      ? Alert.prompt(
          'Clone Mesocycle',
          'Enter a name for the cloned mesocycle:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Clone',
              onPress: (newName?: string) => {
                if (newName) cloneMesocycle(mesoId, newName);
              },
            },
          ],
          'plain-text',
          `${oldName} (Copy)`
        )
      : (() => {
          // Fallback for Web
          const name = prompt('Enter a name for the cloned mesocycle:', `${oldName} (Copy)`);
          if (name) cloneMesocycle(mesoId, name);
        })();
  };

  const handleArchive = (mesoId: string) => {
    Alert.alert(
      'Archive Mesocycle',
      'Are you sure you want to archive this mesocycle? You can still view it in your past logs.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => archiveMesocycle(mesoId),
        },
      ]
    );
  };

  // Builder actions
  const addExerciseToDay = (dayIndex: number, exerciseId: string) => {
    const updated = [...builderDays];
    updated[dayIndex].templates.push({
      exerciseId,
      targetSets: 3,
      minReps: 10,
      maxReps: 15,
      notes: '',
    });
    setBuilderDays(updated);
  };

  const removeExerciseFromDay = (dayIndex: number, exIndex: number) => {
    const updated = [...builderDays];
    updated[dayIndex].templates.splice(exIndex, 1);
    setMesoName(prev => prev); // trigger rerender
    setBuilderDays(updated);
  };

  const updateExerciseField = (dayIndex: number, exIndex: number, field: keyof BuilderExercise, value: any) => {
    const updated = [...builderDays];
    updated[dayIndex].templates[exIndex] = {
      ...updated[dayIndex].templates[exIndex],
      [field]: value,
    };
    setBuilderDays(updated);
  };

  const moveExercise = (dayIndex: number, exIndex: number, direction: 'up' | 'down') => {
    const updated = [...builderDays];
    const templates = updated[dayIndex].templates;

    if (direction === 'up' && exIndex > 0) {
      const temp = templates[exIndex];
      templates[exIndex] = templates[exIndex - 1];
      templates[exIndex - 1] = temp;
    } else if (direction === 'down' && exIndex < templates.length - 1) {
      const temp = templates[exIndex];
      templates[exIndex] = templates[exIndex + 1];
      templates[exIndex + 1] = temp;
    }

    setBuilderDays(updated);
  };

  const activeMeso = mesocycles.find((m) => m.is_active);
  const archivedMesos = mesocycles.filter((m) => !m.is_active);

  if (isBuilding) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable onPress={() => setIsBuilding(false)} style={styles.cancelBtn}>
              <X size={20} color={theme.text} />
              <ThemedText type="smallBold">Cancel</ThemedText>
            </Pressable>
            <ThemedText type="smallBold">BUILD MESOCYCLE</ThemedText>
            <Pressable onPress={handleSaveMeso} style={styles.saveBtn}>
              <Check size={20} color="#000000" />
              <ThemedText type="smallBold" style={{ color: '#000' }}>Save</ThemedText>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.builderScroll} keyboardShouldPersistTaps="handled">
            {/* Name Input */}
            <ThemedView type="backgroundElement" style={styles.builderMesoInfo}>
              <ThemedText type="small" themeColor="textSecondary">MESOCYCLE NAME</ThemedText>
              <TextInput
                style={[styles.nameInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="e.g. 12-Week Hypertrophy Block A"
                placeholderTextColor={theme.textSecondary}
                value={mesoName}
                onChangeText={setMesoName}
              />
            </ThemedView>

            {/* Days Section */}
            {builderDays.map((day, dIdx) => (
              <ThemedView key={dIdx} type="backgroundElement" style={styles.builderDayCard}>
                <View style={styles.dayCardHeader}>
                  <TextInput
                    style={[styles.dayNameInput, { color: theme.text }]}
                    value={day.name}
                    onChangeText={(val) => {
                      const updated = [...builderDays];
                      updated[dIdx].name = val;
                      setBuilderDays(updated);
                    }}
                  />
                  <ThemedText type="code" style={{ opacity: 0.5 }}>Day {dIdx + 1}</ThemedText>
                </View>

                {/* Templates inside day */}
                <View style={styles.builderExList}>
                  {day.templates.map((t, tIdx) => {
                    const ex = exercises.find((e) => e.id === t.exerciseId);
                    return (
                      <View key={tIdx} style={[styles.builderExItem, { borderColor: theme.backgroundSelected }]}>
                        {/* Title and arrows */}
                        <View style={styles.exItemTop}>
                          <ThemedText type="smallBold" style={{ flex: 1 }}>{ex?.name || 'Select Exercise'}</ThemedText>
                          <View style={styles.reorderButtons}>
                            <Pressable
                              onPress={() => moveExercise(dIdx, tIdx, 'up')}
                              disabled={tIdx === 0}
                              style={styles.arrowBtn}
                            >
                              <ArrowUp size={14} color={tIdx === 0 ? theme.backgroundSelected : theme.text} />
                            </Pressable>
                            <Pressable
                              onPress={() => moveExercise(dIdx, tIdx, 'down')}
                              disabled={tIdx === day.templates.length - 1}
                              style={styles.arrowBtn}
                            >
                              <ArrowDown size={14} color={tIdx === day.templates.length - 1 ? theme.backgroundSelected : theme.text} />
                            </Pressable>
                            <Pressable onPress={() => removeExerciseFromDay(dIdx, tIdx)} style={styles.trashBtn}>
                              <Trash2 size={14} color="#ff453a" />
                            </Pressable>
                          </View>
                        </View>

                        {/* Set and rep inputs */}
                        <View style={styles.inputsRow}>
                          <View style={styles.inputCell}>
                            <ThemedText type="code" style={styles.cellLabel}>SETS</ThemedText>
                            <TextInput
                              keyboardType="number-pad"
                              style={[styles.numericInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                              value={String(t.targetSets)}
                              onChangeText={(val) => updateExerciseField(dIdx, tIdx, 'targetSets', parseInt(val, 10) || 0)}
                            />
                          </View>
                          <View style={styles.inputCell}>
                            <ThemedText type="code" style={styles.cellLabel}>MIN REPS</ThemedText>
                            <TextInput
                              keyboardType="number-pad"
                              style={[styles.numericInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                              value={String(t.minReps)}
                              onChangeText={(val) => updateExerciseField(dIdx, tIdx, 'minReps', parseInt(val, 10) || 0)}
                            />
                          </View>
                          <View style={styles.inputCell}>
                            <ThemedText type="code" style={styles.cellLabel}>MAX REPS</ThemedText>
                            <TextInput
                              keyboardType="number-pad"
                              style={[styles.numericInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                              value={String(t.maxReps)}
                              onChangeText={(val) => updateExerciseField(dIdx, tIdx, 'maxReps', parseInt(val, 10) || 0)}
                            />
                          </View>
                        </View>

                        {/* Notes Input */}
                        <TextInput
                          style={[styles.notesInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                          placeholder="Special instructions or notes"
                          placeholderTextColor={theme.textSecondary}
                          value={t.notes}
                          onChangeText={(val) => updateExerciseField(dIdx, tIdx, 'notes', val)}
                        />
                      </View>
                    );
                  })}
                </View>

                {/* Add Exercise Dropdown / Picker */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.addExercisePicker}
                >
                  <ThemedText type="code" style={{ alignSelf: 'center', opacity: 0.6 }}>+ ADD:</ThemedText>
                  {exercises.slice(0, 10).map((ex) => (
                    <Pressable
                      key={ex.id}
                      onPress={() => addExerciseToDay(dIdx, ex.id)}
                      style={({ pressed }) => [
                        styles.addExPill,
                        { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 }
                      ]}
                    >
                      <ThemedText type="code">{ex.name}</ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              </ThemedView>
            ))}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>Mesocycles</ThemedText>
          <View style={styles.headerActions}>
            <LogoutButton />
            <Pressable
              onPress={handleStartBuilder}
              style={({ pressed }) => [
                styles.createButton,
                { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <Plus size={16} color={theme.text} />
              <ThemedText type="smallBold">Create</ThemedText>
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
          {/* Active Mesocycle */}
          <ThemedText type="smallBold" themeColor="textSecondary" style={{ marginBottom: Spacing.one }}>
            ACTIVE PLAN
          </ThemedText>

          {activeMeso ? (
            <ThemedView type="backgroundElement" style={styles.mesoCard}>
              <View style={styles.mesoHeaderRow}>
                <View>
                  <ThemedText type="default" style={styles.mesoNameText}>{activeMeso.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Started: {new Date(activeMeso.started_at).toLocaleDateString()}
                  </ThemedText>
                </View>
                <View style={styles.mesoHeaderActions}>
                  <Pressable
                    onPress={() => handleClone(activeMeso.id, activeMeso.name)}
                    style={styles.cardActionBtn}
                  >
                    <Copy size={16} color={theme.text} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleArchive(activeMeso.id)}
                    style={styles.cardActionBtn}
                  >
                    <Archive size={16} color="#ff453a" />
                  </Pressable>
                </View>
              </View>
            </ThemedView>
          ) : (
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <ThemedText type="small" themeColor="textSecondary">No active training plan. Build one to get started!</ThemedText>
            </ThemedView>
          )}

          {/* Past Mesocycles */}
          <ThemedText type="smallBold" themeColor="textSecondary" style={{ marginTop: Spacing.three, marginBottom: Spacing.one }}>
            PAST MESOCYCLES ({archivedMesos.length})
          </ThemedText>

          {archivedMesos.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginVertical: Spacing.four }}>
              No archived cycles.
            </ThemedText>
          ) : (
            archivedMesos.map((meso) => (
              <ThemedView key={meso.id} type="backgroundElement" style={styles.mesoCardArchived}>
                <View style={styles.mesoHeaderRow}>
                  <View>
                    <ThemedText type="default" style={{ opacity: 0.8, fontWeight: '600' }}>{meso.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {new Date(meso.started_at).toLocaleDateString()} - {meso.ended_at ? new Date(meso.ended_at).toLocaleDateString() : '--'}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => handleClone(meso.id, meso.name)}
                    style={styles.cardActionBtn}
                  >
                    <Copy size={16} color={theme.text} />
                  </Pressable>
                </View>
              </ThemedView>
            ))
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 8,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saveBtn: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  scrollList: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  mesoCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.two,
  },
  mesoCardArchived: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    opacity: 0.7,
    marginVertical: 4,
  },
  mesoNameText: {
    fontSize: 18,
    fontWeight: '800',
  },
  mesoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mesoHeaderActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  cardActionBtn: {
    padding: 8,
    borderRadius: 6,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  builderScroll: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
  },
  builderMesoInfo: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  nameInput: {
    height: 40,
    borderBottomWidth: 1,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
  },
  builderDayCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.two,
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: Spacing.one,
  },
  dayNameInput: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    padding: 0,
  },
  builderExList: {
    gap: Spacing.two,
  },
  builderExItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  exItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reorderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrowBtn: {
    padding: 4,
  },
  trashBtn: {
    padding: 4,
    marginLeft: 6,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  inputCell: {
    flex: 1,
    gap: 2,
  },
  cellLabel: {
    fontSize: 9,
    opacity: 0.6,
  },
  numericInput: {
    borderWidth: 1,
    borderRadius: 6,
    height: 32,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 6,
    height: 32,
    paddingHorizontal: 8,
    fontSize: 11,
  },
  addExercisePicker: {
    flexDirection: 'row',
    gap: Spacing.one,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
    marginTop: Spacing.one,
  },
  addExPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
});
