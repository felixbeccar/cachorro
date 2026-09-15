import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { clearApiKey, getApiKey, setApiKey as saveApiKey } from '../src/ai/apiKeyStore';
import { parseWorkoutText } from '../src/ai/parseWorkoutText';
import { getExerciseById } from '../src/data/exercises';
import { colors, radius, spacing } from '../src/theme';
import { Exercise } from '../src/types';
import { ExercisePickerModal } from './ExercisePickerModal';

interface ReviewSet {
  weightKg: number | null;
  reps: number | null;
}

interface ReviewEntry {
  exercise: Exercise | null;
  nameGuess: string;
  sets: ReviewSet[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (entries: { exercise: Exercise; sets: ReviewSet[] }[]) => void;
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function VoiceLogModal({ visible, onClose, onApply }: Props) {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [checkingKey, setCheckingKey] = useState(true);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [reviewEntries, setReviewEntries] = useState<ReviewEntry[] | null>(null);
  const [pickerForIndex, setPickerForIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    setCheckingKey(true);
    getApiKey().then((key) => {
      setApiKeyState(key);
      setCheckingKey(false);
    });
  }, [visible]);

  function resetAndClose() {
    setText('');
    setReviewEntries(null);
    setErrorMessage('');
    onClose();
  }

  async function handleSaveApiKey() {
    if (!apiKeyInput.trim()) return;
    await saveApiKey(apiKeyInput);
    setApiKeyState(apiKeyInput.trim());
    setApiKeyInput('');
  }

  async function handleChangeApiKey() {
    await clearApiKey();
    setApiKeyState(null);
    setErrorMessage('');
  }

  async function handleParse() {
    if (!apiKey || !text.trim()) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const parsed = await parseWorkoutText(apiKey, text.trim());
      setReviewEntries(
        parsed.map((p) => ({
          exercise: p.exerciseId ? getExerciseById(p.exerciseId) ?? null : null,
          nameGuess: p.exerciseNameGuess,
          sets: p.sets.map((s) => ({ weightKg: s.weightKg, reps: s.reps })),
        }))
      );
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function handleRemoveEntry(index: number) {
    setReviewEntries((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  function handleResolveExercise(exercise: Exercise) {
    if (pickerForIndex === null) return;
    setReviewEntries((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[pickerForIndex] = { ...next[pickerForIndex], exercise };
      return next;
    });
    setPickerForIndex(null);
  }

  function handleChangeSet(entryIndex: number, setIndex: number, field: 'weightKg' | 'reps', value: string) {
    setReviewEntries((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const sets = [...next[entryIndex].sets];
      sets[setIndex] = { ...sets[setIndex], [field]: parseNumber(value) };
      next[entryIndex] = { ...next[entryIndex], sets };
      return next;
    });
  }

  function handleApply() {
    if (!reviewEntries) return;
    const resolved = reviewEntries
      .filter((e): e is ReviewEntry & { exercise: Exercise } => e.exercise != null)
      .map((e) => ({ exercise: e.exercise, sets: e.sets }));
    if (resolved.length === 0) return;
    onApply(resolved);
    resetAndClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={resetAndClose} presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Log by voice</Text>
          <Pressable onPress={resetAndClose} hitSlop={10}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
        </View>

        {checkingKey ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !apiKey ? (
          <View style={styles.content}>
            <Text style={styles.label}>Anthropic API key</Text>
            <Text style={styles.hint}>
              Get one at console.anthropic.com. Stored only on your phone, in the secure keychain.
            </Text>
            <TextInput
              style={styles.input}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              placeholder="sk-ant-..."
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={styles.primaryButton} onPress={handleSaveApiKey}>
              <Text style={styles.primaryButtonText}>Save key</Text>
            </Pressable>
          </View>
        ) : reviewEntries ? (
          <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: spacing.xl }}>
            <Text style={styles.hint}>Check this before applying — tap any number to fix it.</Text>
            {reviewEntries.map((entry, entryIndex) => (
              <View key={entryIndex} style={styles.entryCard}>
                <View style={styles.entryHeaderRow}>
                  {entry.exercise ? (
                    <Text style={styles.entryName}>{entry.exercise.name}</Text>
                  ) : (
                    <Pressable style={{ flex: 1 }} onPress={() => setPickerForIndex(entryIndex)}>
                      <Text style={styles.entryNameUnmatched}>"{entry.nameGuess}" — tap to pick exercise</Text>
                    </Pressable>
                  )}
                  <Pressable hitSlop={10} onPress={() => handleRemoveEntry(entryIndex)}>
                    <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
                {entry.sets.map((set, setIndex) => (
                  <View key={setIndex} style={styles.setRow}>
                    <Text style={styles.setIndex}>{setIndex + 1}</Text>
                    <TextInput
                      style={styles.setInput}
                      keyboardType="numeric"
                      placeholder="kg"
                      placeholderTextColor={colors.textMuted}
                      value={set.weightKg != null ? String(set.weightKg) : ''}
                      onChangeText={(v) => handleChangeSet(entryIndex, setIndex, 'weightKg', v)}
                    />
                    <TextInput
                      style={styles.setInput}
                      keyboardType="numeric"
                      placeholder="reps"
                      placeholderTextColor={colors.textMuted}
                      value={set.reps != null ? String(set.reps) : ''}
                      onChangeText={(v) => handleChangeSet(entryIndex, setIndex, 'reps', v)}
                    />
                  </View>
                ))}
              </View>
            ))}

            <Pressable style={styles.secondaryButton} onPress={() => setReviewEntries(null)}>
              <Text style={styles.secondaryButtonText}>Start over</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={handleApply}>
              <Text style={styles.primaryButtonText}>Apply to session</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <View style={styles.content}>
            <Text style={styles.hint}>
              Describe what you did, or tap the mic on your keyboard to dictate. e.g. "Bulgarian split
              squat, 3 sets of 12 at 15 kilos each leg."
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={text}
              onChangeText={setText}
              placeholder="Squat, 3x10 at 80kg..."
              placeholderTextColor={colors.textMuted}
              multiline
              autoFocus
            />
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            <Pressable
              style={[styles.primaryButton, (loading || !text.trim()) && styles.primaryButtonDisabled]}
              onPress={handleParse}
              disabled={loading || !text.trim()}
            >
              {loading ? (
                <ActivityIndicator color={colors.bg} />
              ) : (
                <Text style={styles.primaryButtonText}>Parse</Text>
              )}
            </Pressable>
            <Pressable style={styles.changeKeyLink} onPress={handleChangeApiKey}>
              <Text style={styles.changeKeyLinkText}>Change API key</Text>
            </Pressable>
          </View>
        )}

        <ExercisePickerModal
          visible={pickerForIndex !== null}
          excludeIds={[]}
          onSelect={handleResolveExercise}
          onClose={() => setPickerForIndex(null)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  changeKeyLink: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  changeKeyLinkText: {
    color: colors.textMuted,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  entryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  entryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  entryName: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  entryNameUnmatched: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '700',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  setIndex: {
    color: colors.textMuted,
    fontSize: 13,
    width: 16,
  },
  setInput: {
    flex: 1,
    backgroundColor: colors.cardAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
  },
});
