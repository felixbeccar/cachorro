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
import { parseVoiceCommand } from '../src/ai/parseVoiceCommand';
import { getExerciseById } from '../src/data/exercises';
import { logVoiceCommand } from '../src/db/queries';
import { colors, radius, spacing } from '../src/theme';
import { Exercise, MuscleGroup } from '../src/types';
import { ExercisePickerModal } from './ExercisePickerModal';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

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
  /** Pre-captured transcript (from the native voice bar) — parses immediately, skipping the typing screen. */
  initialText?: string;
  onClose: () => void;
  onApplyLog: (entries: { exercise: Exercise; sets: ReviewSet[] }[]) => void;
  onAdjustRoutine: (
    excludeGroups: MuscleGroup[],
    setsOverride: number | null,
    targetMinutes: number | null,
    summary: string
  ) => void;
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function VoiceLogModal({ visible, initialText, onClose, onApplyLog, onAdjustRoutine }: Props) {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [checkingKey, setCheckingKey] = useState(true);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [reviewEntries, setReviewEntries] = useState<ReviewEntry[] | null>(null);
  const [adjustSummary, setAdjustSummary] = useState<string | null>(null);
  const [pickerForIndex, setPickerForIndex] = useState<number | null>(null);
  const [initialTextHandled, setInitialTextHandled] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCheckingKey(true);
    getApiKey().then((key) => {
      setApiKeyState(key);
      setCheckingKey(false);
    });
  }, [visible]);

  // Voice bar handed us a final transcript — parse right away, no typing/Parse tap needed.
  useEffect(() => {
    if (visible && initialText && apiKey && !checkingKey && !initialTextHandled) {
      setInitialTextHandled(true);
      setText(initialText);
      handleParse(initialText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialText, apiKey, checkingKey, initialTextHandled]);

  function resetAndClose() {
    setText('');
    setReviewEntries(null);
    setAdjustSummary(null);
    setErrorMessage('');
    setInitialTextHandled(false);
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

  async function handleParse(spokenText: string) {
    if (!apiKey || !spokenText.trim()) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const result = await parseVoiceCommand(apiKey, spokenText.trim());
      logVoiceCommand(todayISO(), spokenText.trim(), result.intent, result.summary);
      if (result.intent === 'log_sets') {
        setReviewEntries(
          result.logEntries.map((p) => ({
            exercise: p.exerciseId ? getExerciseById(p.exerciseId) ?? null : null,
            nameGuess: p.exerciseNameGuess,
            sets: p.sets.map((s) => ({ weightKg: s.weightKg, reps: s.reps })),
          }))
        );
      } else if (
        result.intent === 'adjust_routine' &&
        (result.excludeMuscleGroups.length > 0 || result.setsOverride != null || result.targetMinutes != null)
      ) {
        // A response with nothing to apply (no exclusions, no sets/duration change) is really a
        // clarifying question, not a decision — an empty excludeMuscleGroups list means "exclude
        // nothing," which would silently reset any muscle-group filter already in place. Guard
        // against applying that even if the model misclassifies it as adjust_routine.
        onAdjustRoutine(
          result.excludeMuscleGroups as MuscleGroup[],
          result.setsOverride,
          result.targetMinutes,
          result.summary
        );
        setAdjustSummary(result.summary || 'Session updated.');
        setTimeout(resetAndClose, 1800);
      } else {
        setErrorMessage(result.summary || "Didn't catch a clear instruction — try again.");
      }
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
    onApplyLog(resolved);
    resetAndClose();
  }

  const readyForInput = !checkingKey && !!apiKey && !reviewEntries && !adjustSummary;
  const showListeningState = readyForInput && (loading || (!!initialText && !initialTextHandled));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={resetAndClose} presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Voice command</Text>
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
        ) : adjustSummary ? (
          <View style={styles.center}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={styles.adjustSummaryText}>{adjustSummary}</Text>
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
        ) : showListeningState ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.hint}>{initialText ? `"${initialText}"` : 'Thinking…'}</Text>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.hint}>
              Type what you did, or an instruction — e.g. "Bulgarian split squat, 3 sets of 12 at 15 kilos"
              or "no legs today, my knee hurts."
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
              onPress={() => handleParse(text)}
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
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  adjustSummaryText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
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
    textAlign: 'center',
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
