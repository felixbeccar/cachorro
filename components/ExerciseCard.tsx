import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../src/theme';
import { Exercise, SetEntry } from '../src/types';
import { MuscleBadge } from './MuscleBadge';

interface Props {
  exercise: Exercise;
  isNew: boolean;
  sets: SetEntry[];
  done: boolean;
  onChangeSet: (setIndex: number, field: 'weightKg' | 'reps', value: string) => void;
  onAddSet: () => void;
  onToggleDone: () => void;
  onChangeExercise: () => void;
  onRemove: () => void;
}

export function ExerciseCard({
  exercise,
  isNew,
  sets,
  done,
  onChangeSet,
  onAddSet,
  onToggleDone,
  onChangeExercise,
  onRemove,
}: Props) {
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={[styles.card, done && styles.cardDone]}>
      <Pressable style={styles.header} onPress={() => setExpanded((e) => !e)}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{exercise.name}</Text>
            {isNew && (
              <View style={styles.newPill}>
                <Text style={styles.newPillText}>NEW</Text>
              </View>
            )}
          </View>
          <View style={styles.badgeRow}>
            {exercise.muscleGroups.map((g) => (
              <MuscleBadge key={g} group={g} />
            ))}
          </View>
          <Text style={styles.meta}>
            {exercise.equipment} · Target {exercise.defaultSets} x {exercise.defaultReps}
          </Text>
        </View>
        <Pressable hitSlop={10} onPress={onRemove} style={styles.removeButton}>
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </Pressable>
        <Pressable hitSlop={10} onPress={onToggleDone} style={styles.checkbox}>
          <Ionicons
            name={done ? 'checkmark-circle' : 'ellipse-outline'}
            size={28}
            color={done ? colors.success : colors.textMuted}
          />
        </Pressable>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          <View style={styles.setHeaderRow}>
            <Text style={[styles.setHeaderCell, { flex: 0.6 }]}>Set</Text>
            <Text style={styles.setHeaderCell}>Weight (kg)</Text>
            <Text style={styles.setHeaderCell}>Reps</Text>
          </View>
          {sets.map((set, i) => (
            <View style={styles.setRow} key={i}>
              <Text style={[styles.setIndex, { flex: 0.6 }]}>{i + 1}</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="-"
                placeholderTextColor={colors.textMuted}
                value={set.weightKg != null ? String(set.weightKg) : ''}
                onChangeText={(v) => onChangeSet(i, 'weightKg', v)}
              />
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="-"
                placeholderTextColor={colors.textMuted}
                value={set.reps != null ? String(set.reps) : ''}
                onChangeText={(v) => onChangeSet(i, 'reps', v)}
              />
            </View>
          ))}

          <View style={styles.footerRow}>
            <Pressable style={styles.footerButton} onPress={onAddSet}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.footerButtonText}>Add set</Text>
            </Pressable>
            <Pressable style={styles.footerButton} onPress={onChangeExercise}>
              <Ionicons name="swap-horizontal" size={16} color={colors.textMuted} />
              <Text style={[styles.footerButtonText, { color: colors.textMuted }]}>Change exercise</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardDone: {
    borderColor: colors.success,
  },
  header: {
    flexDirection: 'row',
    padding: spacing.lg,
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  newPill: {
    backgroundColor: colors.successMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newPillText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  removeButton: {
    marginLeft: spacing.md,
    marginTop: spacing.xs,
  },
  checkbox: {
    marginLeft: spacing.md,
    marginTop: spacing.xs,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  setHeaderRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  setHeaderCell: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  setIndex: {
    color: colors.text,
    fontSize: 14,
  },
  input: {
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
  footerRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
