import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MuscleFigure } from './BodyDiagram';
import { estimateSessionMinutes } from '../src/logic/timeline';
import { colors, radius, spacing } from '../src/theme';
import { EFFORT_LABEL, EffortLevel, Exercise, MuscleGroup } from '../src/types';

interface Props {
  exercises: Exercise[];
  effort: EffortLevel | null;
}

const EFFORT_COLOR: Record<EffortLevel, string> = {
  easy: colors.success,
  mid: colors.warning,
  hard: colors.danger,
};

/**
 * Same "what am I in for" summary shown at the top of a session on both Today (live) and Plan
 * (upcoming) — a single body diagram of the groups this session hits, estimated duration, and
 * a forecasted effort. Deliberately not the same diagram as the Plan tab's last/next comparison.
 */
export function SessionReportCard({ exercises, effort }: Props) {
  const touched = new Set<MuscleGroup>();
  exercises.forEach((e) => e.muscleGroups.forEach((g) => touched.add(g)));
  const colorOf = (group: MuscleGroup) => (touched.has(group) ? colors.primary : colors.border);
  const minutes = estimateSessionMinutes(exercises);

  return (
    <View style={styles.card}>
      <View style={styles.figuresRow}>
        <MuscleFigure side="front" colorOf={colorOf} height={150} />
        <MuscleFigure side="back" colorOf={colorOf} height={150} />
      </View>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="time-outline" size={15} color={colors.textMuted} />
          <Text style={styles.statText}>~{minutes} min</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="flash-outline" size={15} color={effort ? EFFORT_COLOR[effort] : colors.textMuted} />
          <Text style={[styles.statText, effort && { color: EFFORT_COLOR[effort] }]}>
            {effort ? `${EFFORT_LABEL[effort]} effort` : 'New — no history yet'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  figuresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
});
