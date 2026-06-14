import { useRouter } from 'expo-router';
import { Calendar, ChevronLeft, Save, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useJimStore } from '@/store/jimStore';
import { calculateWeightMetrics } from '@/utils/metrics';

export default function WeightEntryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { bodyweightEntries, addBodyweightEntry, deleteBodyweightEntry } = useJimStore();

  const [weightInput, setWeightInput] = useState('');
  const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);

  const metrics = calculateWeightMetrics(bodyweightEntries);

  const handleSave = () => {
    const parsed = parseFloat(weightInput);
    if (!isNaN(parsed) && parsed > 20 && parsed < 500) {
      addBodyweightEntry(parsed, dateInput);
      setWeightInput('');
      // Auto navigate back
      router.back();
    }
  };

  // Prepare data for custom bar chart (last 7 entries, chronological order)
  const chartEntries = [...bodyweightEntries]
    .slice(0, 7)
    .reverse();

  const weights = chartEntries.map(e => e.weight);
  const maxWeight = weights.length > 0 ? Math.max(...weights) : 100;
  const minWeight = weights.length > 0 ? Math.min(...weights) : 0;
  const range = maxWeight - minWeight || 1;

  // Add small padding to top and bottom of chart range
  const chartMax = maxWeight + (range * 0.1);
  const chartMin = Math.max(0, minWeight - (range * 0.1));
  const chartRange = chartMax - chartMin;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color={theme.text} />
              <ThemedText type="default">Home</ThemedText>
            </Pressable>
            <ThemedText type="smallBold">LOG BODYWEIGHT</ThemedText>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Input Card */}
            <ThemedView type="backgroundElement" style={styles.inputCard}>
              <ThemedText type="small" themeColor="textSecondary">ENTER WEIGHT (KG)</ThemedText>

              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="0.0"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="decimal-pad"
                  value={weightInput}
                  onChangeText={setWeightInput}
                  autoFocus={Platform.OS !== 'web'}
                />
                <ThemedText type="subtitle" style={styles.kgLabel}>kg</ThemedText>
              </View>

              <View style={styles.dateRow}>
                <Calendar size={16} color={theme.textSecondary} />
                <TextInput
                  style={[styles.dateInput, { color: theme.text }]}
                  value={dateInput}
                  onChangeText={setDateInput}
                  placeholder="YYYY-MM-DD"
                  maxLength={10}
                />
              </View>

              <Pressable
                onPress={handleSave}
                disabled={!weightInput}
                style={({ pressed }) => [
                  styles.saveButton,
                  {
                    backgroundColor: weightInput ? '#ffffff' : theme.backgroundSelected,
                    opacity: pressed ? 0.9 : 1
                  }
                ]}
              >
                <Save size={18} color={weightInput ? '#000000' : theme.textSecondary} />
                <ThemedText
                  type="smallBold"
                  style={{ color: weightInput ? '#000000' : theme.textSecondary }}
                >
                  Save Entry
                </ThemedText>
              </Pressable>
            </ThemedView>

            {/* Premium Custom Weight Chart */}
            {chartEntries.length > 0 && (
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.chartTitle}>
                  7-ENTRY PROGRESS
                </ThemedText>

                <View style={styles.chartContainer}>
                  {chartEntries.map((entry, idx) => {
                    // Compute percentage height
                    const heightPercent = chartRange > 0
                      ? ((entry.weight - chartMin) / chartRange) * 100
                      : 50;

                    // format date like "13 Jun"
                    const d = new Date(entry.date);
                    const formattedDate = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

                    return (
                      <View key={entry.id} style={styles.chartCol}>
                        <View style={styles.barWrapper}>
                          {/* Value above bar */}
                          <ThemedText type="code" style={styles.barVal}>
                            {entry.weight}
                          </ThemedText>

                          {/* Bar */}
                          <View style={styles.barOutline}>
                            <View
                              style={[
                                styles.barFill,
                                {
                                  height: `${Math.max(5, heightPercent)}%`,
                                  backgroundColor: theme.text
                                }
                              ]}
                            />
                          </View>
                        </View>

                        {/* Label below bar */}
                        <ThemedText type="code" style={styles.barDate}>
                          {formattedDate}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              </ThemedView>
            )}

            {/* Metrics List */}
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={{ marginBottom: Spacing.two }}>
                WEIGHT HISTORY
              </ThemedText>

              {bodyweightEntries.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', padding: Spacing.three }}>
                  No entries recorded yet.
                </ThemedText>
              ) : (
                <View style={styles.historyList}>
                  {bodyweightEntries.slice(0, 10).map((entry) => (
                    <View key={entry.id} style={[styles.historyRow, { borderBottomColor: theme.backgroundSelected }]}>
                      <View>
                        <ThemedText type="default" style={{ fontWeight: '600' }}>{entry.weight} kg</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">{entry.date}</ThemedText>
                      </View>
                      <Pressable
                        onPress={() => deleteBodyweightEntry(entry.id)}
                        style={({ pressed }) => [styles.deleteButton, { opacity: pressed ? 0.6 : 1 }]}
                      >
                        <Trash2 size={16} color="#ff453a" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </ThemedView>
          </ScrollView>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    width: 80,
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  inputCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.three,
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  textInput: {
    fontSize: 54,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 150,
    borderBottomWidth: 2,
    paddingBottom: Spacing.one,
  },
  kgLabel: {
    fontSize: 28,
    fontWeight: '600',
    marginLeft: Spacing.two,
    marginTop: Spacing.two,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  dateInput: {
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: Spacing.one,
    textAlign: 'center',
    width: 120,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + 2,
    alignSelf: 'stretch',
    borderRadius: Spacing.two,
    marginTop: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  chartTitle: {
    marginBottom: Spacing.four,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.one,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    gap: Spacing.one,
  },
  barVal: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  barOutline: {
    height: '75%',
    width: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barDate: {
    fontSize: 9,
    marginTop: Spacing.two,
    textAlign: 'center',
    opacity: 0.7,
  },
  historyList: {
    width: '100%',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  deleteButton: {
    padding: Spacing.two,
  },
});
