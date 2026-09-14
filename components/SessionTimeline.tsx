import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { estimateExerciseMinutes, estimateSessionMinutes, WARMUP_MINUTES } from '../src/logic/timeline';
import { colors, radius, spacing } from '../src/theme';
import { Exercise } from '../src/types';

interface Props {
  exercises: Exercise[];
  suggestedWeights: Record<string, number | null>;
  editable?: boolean;
  onChangeExercise?: (index: number) => void;
  onRemove?: (index: number) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onAdd?: () => void;
}

function formatSetsLine(exercise: Exercise, weightKg: number | null | undefined): string {
  const weightPart = weightKg != null ? `x${weightKg}kg` : '';
  return `${exercise.defaultSets}x${exercise.defaultReps}${weightPart}`;
}

export function SessionTimeline({
  exercises,
  suggestedWeights,
  editable = false,
  onChangeExercise,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAdd,
}: Props) {
  const totalMinutes = estimateSessionMinutes(exercises);

  return (
    <View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Warm-up / stretch</Text>
        </View>
        <Text style={styles.rowMinutes}>{WARMUP_MINUTES}'</Text>
      </View>

      {exercises.map((exercise, i) => (
        <View key={exercise.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{exercise.name}</Text>
            <Text style={styles.rowSets}>{formatSetsLine(exercise, suggestedWeights[exercise.id])}</Text>
          </View>
          <Text style={styles.rowMinutes}>{estimateExerciseMinutes(exercise)}'</Text>
          {editable && (
            <View style={styles.editControls}>
              <Pressable hitSlop={8} disabled={i === 0} onPress={() => onMoveUp?.(i)}>
                <Ionicons name="chevron-up" size={16} color={i === 0 ? colors.border : colors.textMuted} />
              </Pressable>
              <Pressable hitSlop={8} disabled={i === exercises.length - 1} onPress={() => onMoveDown?.(i)}>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={i === exercises.length - 1 ? colors.border : colors.textMuted}
                />
              </Pressable>
              <Pressable hitSlop={8} onPress={() => onChangeExercise?.(i)}>
                <Ionicons name="swap-horizontal" size={16} color={colors.textMuted} />
              </Pressable>
              <Pressable hitSlop={8} onPress={() => onRemove?.(i)}>
                <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          )}
        </View>
      ))}

      {editable && (
        <Pressable style={styles.addButton} onPress={onAdd}>
          <Ionicons name="add" size={16} color={colors.primary} />
          <Text style={styles.addButtonText}>Add exercise</Text>
        </Pressable>
      )}

      <Text style={styles.totalText}>Est. {totalMinutes} min total</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  rowSets: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  rowMinutes: {
    color: colors.textMuted,
    fontSize: 12,
    marginLeft: spacing.sm,
  },
  editControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
  },
  addButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  totalText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
});
