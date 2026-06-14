import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TextInput, Pressable, ScrollView, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check, Play, Pause, RefreshCw, X, AlertTriangle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useGymStore, ExerciseSet } from '@/store/gymStore';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const {
    activeSession,
    workoutDays,
    exercises,
    workoutTemplates,
    workoutSessions,
    exerciseSets,
    updateActiveSet,
    saveActiveSet,
    completeWorkout,
    discardWorkout,
  } = useGymStore();

  // Redirect if no active session
  useEffect(() => {
    if (!activeSession) {
      router.replace('/');
    }
  }, [activeSession]);

  // Rest Timer State
  const [restSeconds, setRestSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isTimerActive) {
      timerRef.current = setInterval(() => {
        setRestSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerActive]);

  if (!activeSession) return null;

  const day = workoutDays.find((d) => d.id === activeSession.workoutDayId);
  const templates = workoutTemplates
    .filter((t) => t.workout_day_id === activeSession.workoutDayId)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Compute overall progress
  const totalSets = Object.values(activeSession.sets).reduce((sum, s) => sum + s.length, 0);
  const completedSets = Object.values(activeSession.sets).reduce(
    (sum, s) => sum + s.filter((set) => set.saved).length,
    0
  );
  const progressPercent = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  // Retrieve previous session's performance for this day
  const getPreviousPerformance = (exerciseId: string): ExerciseSet[] => {
    const pastSessionsForDay = workoutSessions
      .filter((s) => s.workout_day_id === activeSession.workoutDayId && s.completed_at !== null)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());

    if (pastSessionsForDay.length === 0) return [];

    const lastSessionId = pastSessionsForDay[0].id;
    return exerciseSets
      .filter((s) => s.session_id === lastSessionId && s.exercise_id === exerciseId)
      .sort((a, b) => a.set_number - b.set_number);
  };

  const handleSaveSet = (exerciseId: string, setIndex: number) => {
    const setData = activeSession.sets[exerciseId][setIndex];
    if (!setData.weight || !setData.reps) {
      Alert.alert('Incomplete Data', 'Please enter weight and reps before checking off.');
      return;
    }
    saveActiveSet(exerciseId, setIndex);
    
    // Start / Reset rest timer
    setRestSeconds(0);
    setIsTimerActive(true);

    // Auto focus next field logic can be added, but standard React Native focus handling is complex.
    // We will let the user tap, but pre-populate inputs for convenience.
  };

  const handleFinish = () => {
    if (completedSets === 0) {
      Alert.alert(
        'Empty Workout',
        'You have not logged any sets yet. Would you like to discard this session instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => { discardWorkout(); router.replace('/'); } }
        ]
      );
      return;
    }

    Alert.alert(
      'Finish Workout',
      'Are you sure you want to complete and save this workout session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: () => {
            completeWorkout();
            router.replace('/workout/summary');
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Workout',
      'Are you sure you want to discard this workout? All sets logged during this session will be permanently lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            discardWorkout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handleCancel} style={styles.cancelButton}>
              <X size={20} color="#ff453a" />
              <ThemedText type="smallBold" style={{ color: '#ff453a' }}>Discard</ThemedText>
            </Pressable>
            
            <View style={{ alignItems: 'center' }}>
              <ThemedText type="smallBold">{day?.name || 'Workout Session'}</ThemedText>
              <ThemedText type="code" style={{ fontSize: 10, opacity: 0.7 }}>
                Microcycle #{activeSession.microcycleNumber}
              </ThemedText>
            </View>

            <Pressable onPress={handleFinish} style={styles.finishButton}>
              <Check size={20} color="#30d158" />
              <ThemedText type="smallBold" style={{ color: '#30d158' }}>Complete</ThemedText>
            </Pressable>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${progressPercent}%`, backgroundColor: '#30d158' }
              ]} 
            />
          </View>

          <ScrollView 
            ref={scrollRef} 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="always"
          >
            {templates.map((template) => {
              const ex = exercises.find((e) => e.id === template.exercise_id);
              const prevPerformance = getPreviousPerformance(template.exercise_id);
              const exerciseSetsData = activeSession.sets[template.exercise_id] || [];

              return (
                <ThemedView key={template.id} type="backgroundElement" style={styles.exerciseSection}>
                  {/* Exercise Title */}
                  <View style={styles.exerciseHeader}>
                    <View>
                      <ThemedText type="default" style={styles.exerciseName}>
                        {ex?.name || 'Exercise'}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Target: {template.target_sets} sets x {template.min_reps}-{template.max_reps} reps
                      </ThemedText>
                    </View>
                  </View>

                  {/* Sets Table */}
                  <View style={styles.table}>
                    <View style={styles.tableHeaderRow}>
                      <ThemedText type="code" style={[styles.colHeader, styles.colIndex]}>SET</ThemedText>
                      <ThemedText type="code" style={[styles.colHeader, styles.colPrev]}>PREVIOUS</ThemedText>
                      <ThemedText type="code" style={[styles.colHeader, styles.colInput]}>KG</ThemedText>
                      <ThemedText type="code" style={[styles.colHeader, styles.colInput]}>REPS</ThemedText>
                      <ThemedText type="code" style={[styles.colHeader, styles.colRir]}>RIR</ThemedText>
                      <ThemedText type="code" style={[styles.colHeader, styles.colAction]}></ThemedText>
                    </View>

                    {exerciseSetsData.map((setData, idx) => {
                      const prevSet = prevPerformance[idx];

                      return (
                        <View 
                          key={idx} 
                          style={[
                            styles.tableRow, 
                            setData.saved && { backgroundColor: 'rgba(48, 209, 88, 0.05)' }
                          ]}
                        >
                          {/* Index */}
                          <View style={styles.colIndex}>
                            <ThemedText type="default" style={{ fontWeight: '600' }}>
                              {idx + 1}
                            </ThemedText>
                          </View>

                          {/* Previous performance suggestion */}
                          <View style={styles.colPrev}>
                            <ThemedText type="code" style={{ opacity: 0.8 }}>
                              {prevSet ? `${prevSet.weight} x ${prevSet.reps}` : '--'}
                            </ThemedText>
                          </View>

                          {/* Weight Input */}
                          <TextInput
                            style={[
                              styles.numberInput, 
                              styles.colInput,
                              { 
                                color: theme.text, 
                                borderColor: theme.backgroundSelected,
                                backgroundColor: setData.saved ? 'transparent' : 'rgba(255,255,255,0.02)'
                              }
                            ]}
                            placeholder={prevSet ? String(prevSet.weight) : '0'}
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="decimal-pad"
                            selectTextOnFocus
                            editable={!setData.saved}
                            value={setData.weight}
                            onChangeText={(val) => updateActiveSet(template.exercise_id, idx, { weight: val })}
                          />

                          {/* Reps Input */}
                          <TextInput
                            style={[
                              styles.numberInput, 
                              styles.colInput,
                              { 
                                color: theme.text, 
                                borderColor: theme.backgroundSelected,
                                backgroundColor: setData.saved ? 'transparent' : 'rgba(255,255,255,0.02)'
                              }
                            ]}
                            placeholder={prevSet ? String(prevSet.reps) : '0'}
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="number-pad"
                            selectTextOnFocus
                            editable={!setData.saved}
                            value={setData.reps}
                            onChangeText={(val) => updateActiveSet(template.exercise_id, idx, { reps: val })}
                          />

                          {/* RIR Selection */}
                          <TextInput
                            style={[
                              styles.numberInput, 
                              styles.colRir,
                              { 
                                color: theme.text, 
                                borderColor: theme.backgroundSelected,
                                backgroundColor: setData.saved ? 'transparent' : 'rgba(255,255,255,0.02)'
                              }
                            ]}
                            placeholder="2"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="number-pad"
                            selectTextOnFocus
                            editable={!setData.saved}
                            value={setData.rir}
                            onChangeText={(val) => updateActiveSet(template.exercise_id, idx, { rir: val })}
                          />

                          {/* Save/Checkmark button */}
                          <Pressable
                            onPress={() => handleSaveSet(template.exercise_id, idx)}
                            style={({ pressed }) => [
                              styles.saveSetBtn,
                              { 
                                backgroundColor: setData.saved ? '#30d158' : theme.backgroundSelected,
                                opacity: pressed ? 0.7 : 1
                              }
                            ]}
                          >
                            <Check size={14} color={setData.saved ? '#000000' : theme.text} />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </ThemedView>
              );
            })}
          </ScrollView>

          {/* Floating Rest Timer Widget at Bottom */}
          {isTimerActive && (
            <View style={[styles.timerOverlay, { backgroundColor: theme.backgroundElement }]}>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" themeColor="textSecondary">REST TIMER</ThemedText>
                <ThemedText type="subtitle" style={styles.timerDigits}>{formatTime(restSeconds)}</ThemedText>
              </View>
              <View style={styles.timerControls}>
                <Pressable 
                  onPress={() => setIsTimerActive(false)} 
                  style={[styles.timerControlBtn, { backgroundColor: theme.backgroundSelected }]}
                >
                  <Pause size={16} color={theme.text} />
                </Pressable>
                <Pressable 
                  onPress={() => setRestSeconds(0)} 
                  style={[styles.timerControlBtn, { backgroundColor: theme.backgroundSelected }]}
                >
                  <RefreshCw size={16} color={theme.text} />
                </Pressable>
                <Pressable 
                  onPress={() => { setIsTimerActive(false); setRestSeconds(0); }} 
                  style={[styles.timerControlBtn, { backgroundColor: 'rgba(255,69,58,0.1)' }]}
                >
                  <X size={16} color="#ff453a" />
                </Pressable>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
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
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 80,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 90,
    justifyContent: 'flex-end',
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  progressBarFill: {
    height: '100%',
  },
  scrollContent: {
    padding: Spacing.three,
    paddingBottom: 120, // Pad for bottom rest timer
    gap: Spacing.three,
  },
  exerciseSection: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.three,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
  },
  table: {
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing.one,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: Spacing.one,
  },
  colHeader: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8e8e93',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 6,
    marginVertical: 2,
  },
  colIndex: {
    width: 30,
    alignItems: 'center',
  },
  colPrev: {
    flex: 1.5,
    paddingLeft: Spacing.one,
  },
  colInput: {
    flex: 1.2,
    marginHorizontal: 2,
  },
  colRir: {
    flex: 0.8,
    marginHorizontal: 2,
  },
  colAction: {
    width: 36,
  },
  numberInput: {
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  saveSetBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  timerOverlay: {
    position: 'absolute',
    bottom: Spacing.three,
    left: Spacing.three,
    right: Spacing.three,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  timerDigits: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  timerControls: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  timerControlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
