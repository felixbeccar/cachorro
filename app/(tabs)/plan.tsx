import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { MuscleBadge } from '../../components/MuscleBadge';
import { getExerciseStats, getLastSessionExerciseIds } from '../../src/db/queries';
import { previewUpcomingSessions } from '../../src/logic/routineGenerator';
import { colors, radius, spacing } from '../../src/theme';
import { ExerciseStat, RoutinePick } from '../../src/types';

const SESSION_LABELS = ['Today', 'Next session', 'Session after that'];

export default function PlanScreen() {
  const [stats, setStats] = useState<Record<string, ExerciseStat>>({});
  const [avoidIds, setAvoidIds] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      setStats(getExerciseStats());
      setAvoidIds(getLastSessionExerciseIds());
    }, [])
  );

  const forecast = useMemo(() => previewUpcomingSessions(stats, avoidIds, 3), [stats, avoidIds]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Plan</Text>
      <Text style={styles.subtitle}>
        A forecast of what's next, generated the same way as your actual routine. Not a fixed
        schedule — it updates based on what you log (or skip), so check back after each session.
      </Text>

      {forecast.map((picks: RoutinePick[], i: number) => (
        <View key={i} style={styles.sessionCard}>
          <Text style={styles.sessionLabel}>{SESSION_LABELS[i] ?? `Session ${i + 1}`}</Text>
          {picks.map((pick) => (
            <View key={pick.exercise.id} style={styles.exerciseRow}>
              <Text style={styles.exerciseName}>{pick.exercise.name}</Text>
              <View style={styles.badgeRow}>
                {pick.exercise.muscleGroups.map((g) => (
                  <MuscleBadge key={g} group={g} />
                ))}
              </View>
            </View>
          ))}
        </View>
      ))}
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
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: 18,
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
    marginBottom: spacing.md,
  },
  exerciseRow: {
    marginBottom: spacing.sm,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
});
