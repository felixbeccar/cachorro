import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { ExerciseCard } from '../../components/ExerciseCard';
import { ExercisePickerModal } from '../../components/ExercisePickerModal';
import {
  addSessionExercise,
  createSession,
  finishSession,
  getExerciseStats,
  getLastSessionExerciseIds,
  upsertSet,
} from '../../src/db/queries';
import { generateRoutine } from '../../src/logic/routineGenerator';
import { colors, radius, spacing } from '../../src/theme';
import { Exercise, ExerciseStat, RoutinePick, SetEntry } from '../../src/types';

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

export default function TodayScreen() {
  const [stats, setStats] = useState<Record<string, ExerciseStat>>({});
  const [routine, setRoutine] = useState<RoutinePick[]>([]);
  const [setsByExercise, setSetsByExercise] = useState<Record<string, SetEntry[]>>({});
  const [doneByExercise, setDoneByExercise] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // 'add' appends a new exercise; a number replaces the exercise at that index in `routine`.
  const [pickerTarget, setPickerTarget] = useState<'add' | number | null>(null);

  const buildRoutine = useCallback((freshStats: Record<string, ExerciseStat>) => {
    const avoidIds = getLastSessionExerciseIds();
    const picks = generateRoutine(freshStats, avoidIds);
    const sets: Record<string, SetEntry[]> = {};
    for (const pick of picks) {
      sets[pick.exercise.id] = makeDefaultSets(pick.exercise.defaultSets);
    }
    setRoutine(picks);
    setSetsByExercise(sets);
    setDoneByExercise({});
    setFinished(false);
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

  const totalSetsLogged = useMemo(() => {
    return Object.values(setsByExercise)
      .flat()
      .filter((s) => s.reps != null).length;
  }, [setsByExercise]);

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

  function handleFinish() {
    if (totalSetsLogged === 0) {
      Alert.alert('Nothing logged yet', 'Log at least one set before finishing.');
      return;
    }
    const sessionId = createSession(todayISO());
    routine.forEach((pick, orderIndex) => {
      const sessionExerciseId = addSessionExercise(sessionId, pick.exercise.id, orderIndex);
      const sets = setsByExercise[pick.exercise.id] ?? [];
      sets.forEach((set) => {
        if (set.weightKg != null || set.reps != null) {
          upsertSet(sessionExerciseId, set.setIndex, set.weightKg, set.reps);
        }
      });
    });
    finishSession(sessionId, new Date().toISOString());
    setFinished(true);
  }

  if (finished) {
    return (
      <View style={styles.center}>
        <Ionicons name="checkmark-circle" size={64} color={colors.success} />
        <Text style={styles.finishedTitle}>Workout saved</Text>
        <Text style={styles.finishedSubtitle}>
          {routine.length} exercises · {totalSetsLogged} sets logged
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            setLoaded(false);
          }}
        >
          <Text style={styles.primaryButtonText}>Start another session</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Today's session</Text>
          <Text style={styles.subtitle}>~45 min · {routine.length} exercises, full body</Text>
        </View>
        <Pressable style={styles.regenButton} onPress={handleRegenerate}>
          <Ionicons name="refresh" size={16} color={colors.primary} />
          <Text style={styles.regenButtonText}>Regenerate</Text>
        </Pressable>
      </View>

      {routine.map((pick, i) => (
        <ExerciseCard
          key={pick.exercise.id}
          exercise={pick.exercise}
          isNew={pick.isNew}
          sets={setsByExercise[pick.exercise.id] ?? []}
          done={!!doneByExercise[pick.exercise.id]}
          onChangeSet={(setIndex, field, value) => handleChangeSet(pick.exercise.id, setIndex, field, value)}
          onAddSet={() => handleAddSet(pick.exercise.id)}
          onToggleDone={() => handleToggleDone(pick.exercise.id)}
          onChangeExercise={() => setPickerTarget(i)}
          onRemove={() => handleRemoveExercise(i)}
        />
      ))}

      <Pressable style={styles.addExerciseButton} onPress={() => setPickerTarget('add')}>
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text style={styles.addExerciseButtonText}>Add exercise</Text>
      </Pressable>

      <Pressable style={styles.primaryButton} onPress={handleFinish}>
        <Text style={styles.primaryButtonText}>Finish workout</Text>
      </Pressable>

      <ExercisePickerModal
        visible={pickerTarget !== null}
        excludeIds={routine.map((p) => p.exercise.id)}
        onSelect={handleSelectFromPicker}
        onClose={() => setPickerTarget(null)}
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
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
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
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  finishedTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  finishedSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing.lg,
  },
});
