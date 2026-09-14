import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { MuscleBalanceChart } from '../../components/MuscleBalanceChart';
import { ProgressChart } from '../../components/ProgressChart';
import { getExerciseById } from '../../src/data/exercises';
import {
  deleteSession,
  getAllSessionDates,
  getExerciseHistory,
  getExerciseIdsSince,
  getLoggedExerciseIds,
  getSessionCountSince,
  getSessionDetail,
  getTotalVolumeSince,
  listSessions,
} from '../../src/db/queries';
import { computeMuscleGroupCounts, computeWeeklyStreak, daysAgoISO } from '../../src/logic/stats';
import { colors, radius, spacing } from '../../src/theme';
import { EFFORT_LABEL, ExerciseHistoryPoint, MuscleGroup, SessionRow } from '../../src/types';

const DASHBOARD_WINDOW_DAYS = 30;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ProgressScreen() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [exerciseIds, setExerciseIds] = useState<string[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryPoint[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);
  const [sessionsInWindow, setSessionsInWindow] = useState(0);
  const [volumeInWindow, setVolumeInWindow] = useState(0);
  const [weeklyStreak, setWeeklyStreak] = useState(0);
  const [muscleGroupCounts, setMuscleGroupCounts] = useState<Record<MuscleGroup, number> | null>(null);

  useFocusEffect(
    useCallback(() => {
      const allSessions = listSessions();
      const ids = getLoggedExerciseIds();
      setSessions(allSessions);
      setExerciseIds(ids);
      setSelectedExerciseId((prev) => prev ?? ids[0] ?? null);

      const since = daysAgoISO(DASHBOARD_WINDOW_DAYS);
      setSessionsInWindow(getSessionCountSince(since));
      setVolumeInWindow(getTotalVolumeSince(since));
      setWeeklyStreak(computeWeeklyStreak(getAllSessionDates()));
      setMuscleGroupCounts(computeMuscleGroupCounts(getExerciseIdsSince(since)));
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (selectedExerciseId) {
        setHistory(getExerciseHistory(selectedExerciseId));
      }
    }, [selectedExerciseId])
  );

  const selectedExercise = useMemo(
    () => (selectedExerciseId ? getExerciseById(selectedExerciseId) : null),
    [selectedExerciseId]
  );

  const personalBest = useMemo(() => {
    const weights = history.map((h) => h.maxWeightKg).filter((w): w is number => w != null);
    return weights.length ? Math.max(...weights) : null;
  }, [history]);

  function handleDeleteSession(sessionId: number) {
    Alert.alert('Delete session?', "This removes the workout and all its logged sets. Can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteSession(sessionId);
          setSessions(listSessions());
          setExpandedSessionId((prev) => (prev === sessionId ? null : prev));
          const ids = getLoggedExerciseIds();
          setExerciseIds(ids);
          const nextSelected = selectedExerciseId && ids.includes(selectedExerciseId) ? selectedExerciseId : ids[0] ?? null;
          setSelectedExerciseId(nextSelected);
          setHistory(nextSelected ? getExerciseHistory(nextSelected) : []);

          const since = daysAgoISO(DASHBOARD_WINDOW_DAYS);
          setSessionsInWindow(getSessionCountSince(since));
          setVolumeInWindow(getTotalVolumeSince(since));
          setWeeklyStreak(computeWeeklyStreak(getAllSessionDates()));
          setMuscleGroupCounts(computeMuscleGroupCounts(getExerciseIdsSince(since)));
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Progress</Text>

      <View style={styles.kpiRow}>
        <View style={styles.kpiTile}>
          <Text style={styles.kpiValue}>{sessionsInWindow}</Text>
          <Text style={styles.kpiLabel}>Sessions{'\n'}last 30d</Text>
        </View>
        <View style={styles.kpiTile}>
          <Text style={styles.kpiValue}>{weeklyStreak}</Text>
          <Text style={styles.kpiLabel}>Week{'\n'}streak</Text>
        </View>
        <View style={styles.kpiTile}>
          <Text style={styles.kpiValue}>{Math.round(volumeInWindow / 1000)}k</Text>
          <Text style={styles.kpiLabel}>kg lifted{'\n'}last 30d</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Muscle balance</Text>
      <Text style={styles.sectionCaption}>Times each muscle group was trained, last 30 days</Text>
      {muscleGroupCounts && Object.values(muscleGroupCounts).every((c) => c === 0) ? (
        <Text style={styles.emptyText}>Finish a workout to see your balance across muscle groups.</Text>
      ) : (
        muscleGroupCounts && (
          <View style={styles.card}>
            <MuscleBalanceChart counts={muscleGroupCounts} />
          </View>
        )
      )}

      <Text style={styles.sectionTitle}>Exercise trend</Text>
      {exerciseIds.length === 0 ? (
        <Text style={styles.emptyText}>Finish a workout to start tracking progress.</Text>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
            {exerciseIds.map((id) => {
              const exercise = getExerciseById(id);
              if (!exercise) return null;
              const active = id === selectedExerciseId;
              return (
                <Pressable
                  key={id}
                  onPress={() => setSelectedExerciseId(id)}
                  style={[styles.pickerChip, active && styles.pickerChipActive]}
                >
                  <Text style={[styles.pickerChipText, active && styles.pickerChipTextActive]}>
                    {exercise.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.exerciseName}>{selectedExercise?.name}</Text>
              {personalBest != null && <Text style={styles.pr}>PR {personalBest}kg</Text>}
            </View>
            <ProgressChart points={history} />
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Recent sessions</Text>
      {sessions.length === 0 ? (
        <Text style={styles.emptyText}>No sessions logged yet.</Text>
      ) : (
        sessions.map((session) => {
          const expanded = expandedSessionId === session.id;
          return (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionHeaderRow}>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => setExpandedSessionId(expanded ? null : session.id)}
                >
                  <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
                </Pressable>
                <Pressable hitSlop={10} onPress={() => handleDeleteSession(session.id)}>
                  <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
              {expanded && <SessionDetail sessionId={session.id} />}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function SessionDetail({ sessionId }: { sessionId: number }) {
  const detail = useMemo(() => getSessionDetail(sessionId), [sessionId]);
  return (
    <View style={{ marginTop: spacing.sm }}>
      {detail.map((ex) => {
        const exercise = getExerciseById(ex.exerciseId);
        return (
          <View key={ex.sessionExerciseId} style={styles.sessionExerciseRow}>
            <Text style={styles.sessionExerciseName}>{exercise?.name ?? ex.exerciseId}</Text>
            <Text style={styles.sessionExerciseSets}>
              {ex.sets
                .filter((s) => s.weightKg != null || s.reps != null)
                .map((s) => `${s.weightKg ?? '-'}kg×${s.reps ?? '-'}`)
                .join('  ') || 'no sets logged'}
              {ex.effort ? `  ·  Effort: ${EFFORT_LABEL[ex.effort]}` : ''}
            </Text>
          </View>
        );
      })}
    </View>
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
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  kpiTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  kpiValue: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '800',
  },
  kpiLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14,
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
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  pickerRow: {
    marginBottom: spacing.sm,
  },
  pickerChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
  },
  pickerChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  pickerChipText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  pickerChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  pr: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '700',
  },
  sessionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionDate: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  sessionExerciseRow: {
    marginBottom: spacing.xs,
  },
  sessionExerciseName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  sessionExerciseSets: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
