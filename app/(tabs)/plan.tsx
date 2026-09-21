import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { BodyDiagram } from '../../components/BodyDiagram';
import { ExercisePickerModal } from '../../components/ExercisePickerModal';
import { SessionReportCard } from '../../components/SessionReportCard';
import { SessionTimeline } from '../../components/SessionTimeline';
import { WeeklyScheduleEditor } from '../../components/WeeklyScheduleEditor';
import { getExerciseById } from '../../src/data/exercises';
import {
  createPlannedSession,
  getExerciseStats,
  getLastSessionExerciseIds,
  getPlannedSession,
  getPreviousExerciseLog,
  getWeeklySchedule,
  listSessions,
  setDaySchedule,
  setPlannedSessionExercises,
} from '../../src/db/queries';
import { generateRoutine } from '../../src/logic/routineGenerator';
import { activityForDate, getNextWeekDates } from '../../src/logic/schedule';
import { estimateSessionEffort } from '../../src/logic/sessionReport';
import { colors, radius, spacing } from '../../src/theme';
import {
  EffortLevel,
  Exercise,
  ExerciseStat,
  MuscleGroup,
  PlannedSession,
  SCHEDULE_ACTIVITY_LABEL,
  ScheduleActivity,
  WeeklySchedule,
} from '../../src/types';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDayLabel(dateISO: string): string {
  const today = todayISO();
  if (dateISO === today) return 'Today';
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (dateISO === tomorrow) return 'Tomorrow';
  return new Date(`${dateISO}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function muscleGroupsFor(exerciseIds: string[]): MuscleGroup[] {
  const groups = new Set<MuscleGroup>();
  for (const id of exerciseIds) {
    const exercise = getExerciseById(id);
    exercise?.muscleGroups.forEach((g) => groups.add(g));
  }
  return Array.from(groups);
}

export default function PlanScreen() {
  const [schedule, setSchedule] = useState<WeeklySchedule>({});
  const [plannedByDate, setPlannedByDate] = useState<Record<string, PlannedSession>>({});
  const [doneGymDates, setDoneGymDates] = useState<Set<string>>(new Set());
  const [lastGroups, setLastGroups] = useState<MuscleGroup[]>([]);
  const [nextGroups, setNextGroups] = useState<MuscleGroup[]>([]);
  const [pickerTarget, setPickerTarget] = useState<{ date: string; index: number | 'add' } | null>(null);

  const loadWeek = useCallback(() => {
    const freshSchedule = getWeeklySchedule();
    const freshStats: Record<string, ExerciseStat> = getExerciseStats();
    const finishedDates = new Set(listSessions().map((s) => s.date));
    const weekDates = getNextWeekDates();

    const planned: Record<string, PlannedSession> = {};
    let avoidIds = getLastSessionExerciseIds();

    for (const date of weekDates) {
      if (activityForDate(freshSchedule, date) !== 'gym') continue;
      if (finishedDates.has(date)) continue;

      let session = getPlannedSession(date);
      if (!session) {
        const picks = generateRoutine(freshStats, avoidIds);
        session = createPlannedSession(
          date,
          picks.map((p) => p.exercise.id)
        );
      }
      planned[date] = session;
      avoidIds = session.exercises.map((e) => e.exerciseId);
    }

    setSchedule(freshSchedule);
    setPlannedByDate(planned);
    setDoneGymDates(
      new Set(weekDates.filter((d) => activityForDate(freshSchedule, d) === 'gym' && finishedDates.has(d)))
    );
    setLastGroups(muscleGroupsFor(getLastSessionExerciseIds()));

    const firstPlannedDate = weekDates.find((d) => planned[d]);
    setNextGroups(firstPlannedDate ? muscleGroupsFor(planned[firstPlannedDate].exercises.map((e) => e.exerciseId)) : []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWeek();
    }, [loadWeek])
  );

  function handleChangeDaySchedule(dayOfWeek: number, activity: ScheduleActivity) {
    setDaySchedule(dayOfWeek, activity);
    loadWeek();
  }

  function updatePlanned(date: string, updater: (exerciseIds: string[]) => string[]) {
    setPlannedByDate((prev) => {
      const existing = prev[date];
      if (!existing) return prev;
      const nextIds = updater(existing.exercises.map((e) => e.exerciseId));
      setPlannedSessionExercises(existing.id, nextIds);
      return {
        ...prev,
        [date]: {
          ...existing,
          exercises: nextIds.map((exerciseId, i) => ({ id: i, exerciseId, orderIndex: i })),
        },
      };
    });
  }

  function handleRemove(date: string, index: number) {
    updatePlanned(date, (ids) => ids.filter((_, i) => i !== index));
  }

  function handleMove(date: string, index: number, direction: -1 | 1) {
    updatePlanned(date, (ids) => {
      const target = index + direction;
      if (target < 0 || target >= ids.length) return ids;
      const next = [...ids];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleSelectFromPicker(exercise: Exercise) {
    if (!pickerTarget) return;
    const { date, index } = pickerTarget;
    updatePlanned(date, (ids) => {
      if (index === 'add') return [...ids, exercise.id];
      const next = [...ids];
      next[index] = exercise.id;
      return next;
    });
    setPickerTarget(null);
  }

  const weekDates = getNextWeekDates();
  const pickerExcludeIds = pickerTarget
    ? plannedByDate[pickerTarget.date]?.exercises.map((e) => e.exerciseId) ?? []
    : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Plan</Text>

      <Text style={styles.sectionTitle}>Weekly schedule</Text>
      <Text style={styles.sectionCaption}>Tap a day to cycle Gym → Padel → Pilates → Rest</Text>
      <WeeklyScheduleEditor schedule={schedule} onChangeDay={handleChangeDaySchedule} />

      <Text style={styles.sectionTitle}>Muscles worked</Text>
      <View style={styles.card}>
        <BodyDiagram lastGroups={lastGroups} nextGroups={nextGroups} />
      </View>

      <Text style={styles.sectionTitle}>This week</Text>
      {weekDates.map((date) => {
        const activity = activityForDate(schedule, date);
        const label = formatDayLabel(date);

        if (activity === 'gym' && doneGymDates.has(date)) {
          return (
            <View key={date} style={styles.simpleRow}>
              <Text style={styles.simpleRowLabel}>
                {label} — {SCHEDULE_ACTIVITY_LABEL.gym}
              </Text>
              <Text style={styles.simpleRowDone}>Done</Text>
            </View>
          );
        }

        if (activity === 'gym' && plannedByDate[date]) {
          const session = plannedByDate[date];
          const exercises = session.exercises
            .map((e) => getExerciseById(e.exerciseId))
            .filter((e): e is Exercise => !!e);
          const suggestedWeights: Record<string, number | null> = {};
          const previousEfforts: (EffortLevel | null | undefined)[] = [];
          for (const exercise of exercises) {
            const log = getPreviousExerciseLog(exercise.id);
            const weights = log?.sets.map((s) => s.weightKg).filter((w): w is number => w != null) ?? [];
            suggestedWeights[exercise.id] = weights.length ? Math.max(...weights) : null;
            previousEfforts.push(log?.effort);
          }
          return (
            <View key={date} style={styles.sessionCard}>
              <Text style={styles.sessionLabel}>{label}</Text>
              <SessionReportCard exercises={exercises} effort={estimateSessionEffort(previousEfforts)} />
              <SessionTimeline
                exercises={exercises}
                suggestedWeights={suggestedWeights}
                editable
                onChangeExercise={(index) => setPickerTarget({ date, index })}
                onRemove={(index) => handleRemove(date, index)}
                onMoveUp={(index) => handleMove(date, index, -1)}
                onMoveDown={(index) => handleMove(date, index, 1)}
                onAdd={() => setPickerTarget({ date, index: 'add' })}
              />
            </View>
          );
        }

        return (
          <View key={date} style={styles.simpleRow}>
            <Text style={styles.simpleRowLabel}>
              {label} — {SCHEDULE_ACTIVITY_LABEL[activity]}
            </Text>
            {activity !== 'rest' && <Text style={styles.simpleRowNote}>logged via Apple Health</Text>}
          </View>
        );
      })}

      <ExercisePickerModal
        visible={pickerTarget !== null}
        excludeIds={pickerExcludeIds}
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
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionCaption: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  sessionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sessionLabel: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  simpleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  simpleRowLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  simpleRowNote: {
    color: colors.textMuted,
    fontSize: 11,
  },
  simpleRowDone: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
});
