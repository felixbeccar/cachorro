import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { ExerciseCard } from './ExerciseCard';
import { ExercisePickerModal } from './ExercisePickerModal';
import { SessionReportCard } from './SessionReportCard';
import { VoiceCommandBar } from './VoiceCommandBar';
import { VoiceFeedbackModal } from './VoiceFeedbackModal';
import { VoiceLogModal } from './VoiceLogModal';
import { getExerciseById } from '../src/data/exercises';
import {
  createSession,
  deletePlannedSessionForDate,
  finishSession,
  getExerciseStats,
  getLastSessionExerciseIds,
  getPlannedSession,
  getPreviousExerciseLog,
  getUnratedVoiceCommandsForDate,
  replaceSessionExercises,
} from '../src/db/queries';
import { generateRoutine } from '../src/logic/routineGenerator';
import { estimateSessionEffort } from '../src/logic/sessionReport';
import { colors, radius, spacing } from '../src/theme';
import {
  EffortLevel,
  Exercise,
  ExerciseStat,
  MuscleGroup,
  PreviousExerciseLog,
  RoutinePick,
  SetEntry,
  VoiceCommandLogRow,
} from '../src/types';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function makeDefaultSets(count: number): SetEntry[] {
  return Array.from({ length: count }, (_, i) => ({ setIndex: i, weightKg: null, reps: null }));
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function WorkoutMode() {
  const [stats, setStats] = useState<Record<string, ExerciseStat>>({});
  const [routine, setRoutine] = useState<RoutinePick[]>([]);
  const [setsByExercise, setSetsByExercise] = useState<Record<string, SetEntry[]>>({});
  const [doneByExercise, setDoneByExercise] = useState<Record<string, boolean>>({});
  const [effortByExercise, setEffortByExercise] = useState<Record<string, EffortLevel | null>>({});
  // Set once this session is first saved — further "Finish"/edits update the same DB row instead
  // of creating a new one, so the session stays reachable and editable, not a dead end.
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  // 'add' appends a new exercise; a number replaces the exercise at that index in `routine`.
  const [pickerTarget, setPickerTarget] = useState<'add' | number | null>(null);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [pendingVoiceText, setPendingVoiceText] = useState<string | undefined>(undefined);
  const [feedbackLogs, setFeedbackLogs] = useState<VoiceCommandLogRow[] | null>(null);

  const buildRoutine = useCallback((freshStats: Record<string, ExerciseStat>) => {
    const planned = getPlannedSession(todayISO());
    let picks: RoutinePick[];
    if (planned && planned.exercises.length > 0) {
      // Today was set up from the Plan tab — use that instead of generating a fresh one, so
      // edits made there actually show up here.
      picks = planned.exercises
        .map((pe) => getExerciseById(pe.exerciseId))
        .filter((e): e is Exercise => !!e)
        .map((exercise) => ({
          exercise,
          isNew: !freshStats[exercise.id] || freshStats[exercise.id].timesDone === 0,
          group: exercise.muscleGroups[0],
        }));
    } else {
      const avoidIds = getLastSessionExerciseIds();
      picks = generateRoutine(freshStats, avoidIds);
    }
    const sets: Record<string, SetEntry[]> = {};
    for (const pick of picks) {
      sets[pick.exercise.id] = makeDefaultSets(pick.exercise.defaultSets);
    }
    setRoutine(picks);
    setSetsByExercise(sets);
    setDoneByExercise({});
    setEffortByExercise({});
    setSessionId(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!loaded) {
        const freshStats = getExerciseStats();
        setStats(freshStats);
        buildRoutine(freshStats);
        setLoaded(true);
      }
    }, [loaded, buildRoutine])
  );

  const previousLogByExercise = useMemo(() => {
    const map: Record<string, PreviousExerciseLog | null> = {};
    for (const pick of routine) {
      map[pick.exercise.id] = getPreviousExerciseLog(pick.exercise.id);
    }
    return map;
  }, [routine]);

  function handleRegenerate() {
    const currentIds = routine.map((p) => p.exercise.id);
    const freshStats = getExerciseStats();
    setStats(freshStats);
    const picks = generateRoutine(freshStats, currentIds);
    const sets: Record<string, SetEntry[]> = {};
    for (const pick of picks) {
      sets[pick.exercise.id] = makeDefaultSets(pick.exercise.defaultSets);
    }
    setRoutine(picks);
    setSetsByExercise(sets);
    setDoneByExercise({});
    setEffortByExercise({});
  }

  function handleSelectFromPicker(exercise: Exercise) {
    const isNew = !stats[exercise.id] || stats[exercise.id].timesDone === 0;
    const newPick: RoutinePick = { exercise, isNew, group: exercise.muscleGroups[0] };

    if (pickerTarget === 'add') {
      setRoutine((prev) => [...prev, newPick]);
      setSetsByExercise((prev) => ({ ...prev, [exercise.id]: makeDefaultSets(exercise.defaultSets) }));
    } else if (typeof pickerTarget === 'number') {
      const replaced = routine[pickerTarget];
      const nextRoutine = [...routine];
      nextRoutine[pickerTarget] = newPick;
      setRoutine(nextRoutine);
      setSetsByExercise((prev) => {
        const next = { ...prev };
        delete next[replaced.exercise.id];
        next[exercise.id] = makeDefaultSets(exercise.defaultSets);
        return next;
      });
      setDoneByExercise((prev) => {
        const next = { ...prev };
        delete next[replaced.exercise.id];
        return next;
      });
      setEffortByExercise((prev) => {
        const next = { ...prev };
        delete next[replaced.exercise.id];
        return next;
      });
    }
    setPickerTarget(null);
  }

  function handleRemoveExercise(index: number) {
    const removed = routine[index];
    setRoutine((prev) => prev.filter((_, i) => i !== index));
    setSetsByExercise((prev) => {
      const next = { ...prev };
      delete next[removed.exercise.id];
      return next;
    });
    setDoneByExercise((prev) => {
      const next = { ...prev };
      delete next[removed.exercise.id];
      return next;
    });
    setEffortByExercise((prev) => {
      const next = { ...prev };
      delete next[removed.exercise.id];
      return next;
    });
  }

  function handleChangeSet(exerciseId: string, setIndex: number, field: 'weightKg' | 'reps', value: string) {
    setSetsByExercise((prev) => {
      const next = { ...prev };
      const sets = [...(next[exerciseId] ?? [])];
      sets[setIndex] = { ...sets[setIndex], [field]: parseNumber(value) };
      next[exerciseId] = sets;
      return next;
    });
  }

  function handleAddSet(exerciseId: string) {
    setSetsByExercise((prev) => {
      const next = { ...prev };
      const sets = [...(next[exerciseId] ?? [])];
      sets.push({ setIndex: sets.length, weightKg: null, reps: null });
      next[exerciseId] = sets;
      return next;
    });
  }

  function handleToggleDone(exerciseId: string) {
    setDoneByExercise((prev) => ({ ...prev, [exerciseId]: !prev[exerciseId] }));
  }

  function handleSetEffort(exerciseId: string, effort: EffortLevel) {
    setEffortByExercise((prev) => ({ ...prev, [exerciseId]: prev[exerciseId] === effort ? null : effort }));
  }

  function handleApplyVoiceLog(entries: { exercise: Exercise; sets: { weightKg: number | null; reps: number | null }[] }[]) {
    const existingIds = new Set(routine.map((p) => p.exercise.id));
    const additions: RoutinePick[] = [];
    for (const entry of entries) {
      if (!existingIds.has(entry.exercise.id)) {
        const isNew = !stats[entry.exercise.id] || stats[entry.exercise.id].timesDone === 0;
        additions.push({ exercise: entry.exercise, isNew, group: entry.exercise.muscleGroups[0] });
        existingIds.add(entry.exercise.id);
      }
    }
    if (additions.length > 0) {
      setRoutine((prev) => [...prev, ...additions]);
    }
    setSetsByExercise((prev) => {
      const next = { ...prev };
      for (const entry of entries) {
        next[entry.exercise.id] = entry.sets.map((s, i) => ({ setIndex: i, weightKg: s.weightKg, reps: s.reps }));
      }
      return next;
    });
  }

  function handleAdjustRoutine(excludeGroups: MuscleGroup[], setsOverride: number | null, targetMinutes: number | null) {
    const currentIds = routine.map((p) => p.exercise.id);
    const freshStats = getExerciseStats();
    const picks = generateRoutine(freshStats, currentIds, excludeGroups, targetMinutes, setsOverride);
    const sets: Record<string, SetEntry[]> = {};
    for (const pick of picks) {
      sets[pick.exercise.id] = makeDefaultSets(setsOverride ?? pick.exercise.defaultSets);
    }
    setRoutine(picks);
    setSetsByExercise(sets);
    setDoneByExercise({});
    setEffortByExercise({});
  }

  function handleVoiceFinalText(text: string) {
    setPendingVoiceText(text);
    setVoiceModalVisible(true);
  }

  function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= routine.length) return;
    setRoutine((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const sessionEffort = useMemo(
    () => estimateSessionEffort(routine.map((p) => previousLogByExercise[p.exercise.id]?.effort)),
    [routine, previousLogByExercise]
  );

  function handleSave() {
    let id = sessionId;
    const isFirstSave = id == null;
    if (id == null) {
      id = createSession(todayISO());
      setSessionId(id);
    }
    replaceSessionExercises(
      id,
      routine.map((pick) => ({
        exerciseId: pick.exercise.id,
        effort: effortByExercise[pick.exercise.id] ?? null,
        sets: setsByExercise[pick.exercise.id] ?? [],
      }))
    );
    finishSession(id, new Date().toISOString());
    if (isFirstSave) {
      deletePlannedSessionForDate(todayISO());
    }
    const unrated = getUnratedVoiceCommandsForDate(todayISO());
    if (unrated.length > 0) {
      setFeedbackLogs(unrated);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Today's session</Text>
            {sessionId != null && (
              <View style={styles.savedPill}>
                <Ionicons name="checkmark" size={12} color={colors.success} />
                <Text style={styles.savedPillText}>Saved</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>{routine.length} exercises, full body</Text>
        </View>
        <Pressable style={styles.regenButton} onPress={handleRegenerate}>
          <Ionicons name="refresh" size={16} color={colors.primary} />
          <Text style={styles.regenButtonText}>Regenerate</Text>
        </Pressable>
      </View>

      <VoiceCommandBar
        onFinalText={handleVoiceFinalText}
        onTypeInstead={() => {
          setPendingVoiceText(undefined);
          setVoiceModalVisible(true);
        }}
      />
      <SessionReportCard exercises={routine.map((p) => p.exercise)} effort={sessionEffort} />

      {routine.map((pick, i) => (
        <ExerciseCard
          key={pick.exercise.id}
          exercise={pick.exercise}
          isNew={pick.isNew}
          sets={setsByExercise[pick.exercise.id] ?? []}
          done={!!doneByExercise[pick.exercise.id]}
          canMoveUp={i > 0}
          canMoveDown={i < routine.length - 1}
          previousLog={previousLogByExercise[pick.exercise.id] ?? null}
          effort={effortByExercise[pick.exercise.id] ?? null}
          onChangeSet={(setIndex, field, value) => handleChangeSet(pick.exercise.id, setIndex, field, value)}
          onAddSet={() => handleAddSet(pick.exercise.id)}
          onToggleDone={() => handleToggleDone(pick.exercise.id)}
          onChangeExercise={() => setPickerTarget(i)}
          onRemove={() => handleRemoveExercise(i)}
          onSetEffort={(effort) => handleSetEffort(pick.exercise.id, effort)}
          onMoveUp={() => handleMove(i, -1)}
          onMoveDown={() => handleMove(i, 1)}
        />
      ))}

      <Pressable style={styles.addExerciseButton} onPress={() => setPickerTarget('add')}>
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text style={styles.addExerciseButtonText}>Add exercise</Text>
      </Pressable>

      <Pressable style={styles.primaryButton} onPress={handleSave}>
        <Text style={styles.primaryButtonText}>{sessionId != null ? 'Save changes' : 'Finish workout'}</Text>
      </Pressable>

      <ExercisePickerModal
        visible={pickerTarget !== null}
        excludeIds={routine.map((p) => p.exercise.id)}
        onSelect={handleSelectFromPicker}
        onClose={() => setPickerTarget(null)}
      />

      <VoiceLogModal
        visible={voiceModalVisible}
        initialText={pendingVoiceText}
        onClose={() => {
          setVoiceModalVisible(false);
          setPendingVoiceText(undefined);
        }}
        onApplyLog={handleApplyVoiceLog}
        onAdjustRoutine={(excludeGroups, setsOverride, targetMinutes) =>
          handleAdjustRoutine(excludeGroups, setsOverride, targetMinutes)
        }
      />

      <VoiceFeedbackModal
        visible={feedbackLogs != null}
        logs={feedbackLogs ?? []}
        onClose={() => setFeedbackLogs(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  savedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.successMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savedPillText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  regenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  regenButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  addExerciseButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: '700',
  },
});
