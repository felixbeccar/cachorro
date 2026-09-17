import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { estimateExerciseMinutes } from '../src/logic/timeline';
import { colors, radius, spacing } from '../src/theme';
import { EXERCISE_IMAGES } from '../src/data/exerciseImages';
import { EFFORT_LABEL, EffortLevel, Exercise, PreviousExerciseLog, SetEntry } from '../src/types';
import { MuscleBadge } from './MuscleBadge';
import { RestTimer } from './RestTimer';

const EFFORT_LEVELS: EffortLevel[] = ['easy', 'mid', 'hard'];

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function summarizePreviousSets(sets: { weightKg: number | null; reps: number | null }[]): string {
  const logged = sets.filter((s) => s.weightKg != null || s.reps != null);
  if (logged.length === 0) return 'no sets logged';
  const first = logged[0];
  const allSame = logged.every((s) => s.weightKg === first.weightKg && s.reps === first.reps);
  if (allSame) {
    return `${logged.length}×${first.weightKg ?? '-'}kg×${first.reps ?? '-'}`;
  }
  return logged.map((s) => `${s.weightKg ?? '-'}kg×${s.reps ?? '-'}`).join(', ');
}

interface Props {
  exercise: Exercise;
  isNew: boolean;
  sets: SetEntry[];
  done: boolean;
  previousLog: PreviousExerciseLog | null;
  effort: EffortLevel | null;
  onChangeSet: (setIndex: number, field: 'weightKg' | 'reps', value: string) => void;
  onAddSet: () => void;
  onToggleDone: () => void;
  onChangeExercise: () => void;
  onRemove: () => void;
  onSetEffort: (effort: EffortLevel) => void;
  /** Long-press the drag handle to start reordering (from the enclosing DraggableFlatList). */
  onDragStart?: () => void;
  dragActive?: boolean;
}

export function ExerciseCard({
  exercise,
  isNew,
  sets,
  done,
  previousLog,
  effort,
  onChangeSet,
  onAddSet,
  onToggleDone,
  onChangeExercise,
  onRemove,
  onSetEffort,
  onDragStart,
  dragActive,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [frame, setFrame] = useState<0 | 1>(0);
  const demoImages = EXERCISE_IMAGES[exercise.id];

  return (
    <View style={[styles.card, done && styles.cardDone, dragActive && styles.cardDragging]}>
      <Pressable style={styles.header} onPress={() => setExpanded((e) => !e)}>
        {onDragStart && (
          <Pressable
            hitSlop={12}
            onLongPress={onDragStart}
            delayLongPress={150}
            style={styles.dragHandle}
          >
            <Ionicons name="reorder-three" size={26} color={colors.textMuted} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{exercise.name}</Text>
            <Text style={styles.durationPill}>{estimateExerciseMinutes(exercise)}'</Text>
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
          {previousLog && (
            <Text style={styles.previousText}>
              Previous: {formatShortDate(previousLog.date)} · {summarizePreviousSets(previousLog.sets)}
              {previousLog.effort ? ` · Effort: ${EFFORT_LABEL[previousLog.effort]}` : ''}
            </Text>
          )}
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
          {demoImages && (
            <Pressable onPress={() => setFrame((f) => (f === 0 ? 1 : 0))} style={styles.demoWrap}>
              <Image source={demoImages[frame]} style={styles.demoImage} resizeMode="cover" />
              <View style={styles.demoHint}>
                <Ionicons name="sync-outline" size={12} color={colors.text} />
                <Text style={styles.demoHintText}>tap to see {frame === 0 ? 'finish' : 'start'}</Text>
              </View>
            </Pressable>
          )}
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

          <View style={styles.effortRow}>
            <Text style={styles.effortLabel}>Effort</Text>
            {EFFORT_LEVELS.map((level) => {
              const active = effort === level;
              return (
                <Pressable
                  key={level}
                  onPress={() => onSetEffort(level)}
                  style={[styles.effortPill, active && styles.effortPillActive]}
                >
                  <Text style={[styles.effortPillText, active && styles.effortPillTextActive]}>
                    {EFFORT_LABEL[level]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

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

          <RestTimer />
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
  cardDragging: {
    borderColor: colors.primary,
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    padding: spacing.lg,
    alignItems: 'flex-start',
  },
  dragHandle: {
    marginRight: spacing.sm,
    marginTop: spacing.xs,
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
  durationPill: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
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
  previousText: {
    color: colors.primary,
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
  demoWrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
    backgroundColor: colors.cardAlt,
  },
  demoImage: {
    width: '100%',
    aspectRatio: 850 / 567,
  },
  demoHint: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  demoHintText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
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
  effortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  effortLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginRight: spacing.xs,
  },
  effortPill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  effortPillActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  effortPillText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  effortPillTextActive: {
    color: colors.primary,
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
