import { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EXERCISES } from '../src/data/exercises';
import { EXERCISE_IMAGES } from '../src/data/exerciseImages';
import { colors, radius, spacing } from '../src/theme';
import { Exercise, MUSCLE_GROUPS, MUSCLE_GROUP_LABEL } from '../src/types';
import { MuscleBadge } from './MuscleBadge';

interface Props {
  visible: boolean;
  excludeIds: string[];
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

export function ExercisePickerModal({ visible, excludeIds, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MUSCLE_GROUPS.map((group) => ({
      group,
      // Group by primary muscle group only, so an exercise that hits several groups shows once.
      exercises: EXERCISES.filter(
        (e) => e.muscleGroups[0] === group && (q === '' || e.name.toLowerCase().includes(q))
      ),
    })).filter((g) => g.exercises.length > 0);
  }, [query]);

  function handleClose() {
    setQuery('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose exercise</Text>
          <Pressable onPress={handleClose} hitSlop={10}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
        </View>
        <TextInput
          style={styles.search}
          placeholder="Search exercises"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {grouped.map(({ group, exercises }) => (
            <View key={group} style={styles.groupSection}>
              <Text style={styles.groupTitle}>{MUSCLE_GROUP_LABEL[group]}</Text>
              {exercises.map((exercise) => {
                const alreadyAdded = excludeIds.includes(exercise.id);
                return (
                  <Pressable
                    key={exercise.id}
                    disabled={alreadyAdded}
                    style={[styles.row, alreadyAdded && styles.rowDisabled]}
                    onPress={() => {
                      onSelect(exercise);
                      handleClose();
                    }}
                  >
                    {EXERCISE_IMAGES[exercise.id] && (
                      <Image source={EXERCISE_IMAGES[exercise.id][0]} style={styles.rowThumb} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowName, alreadyAdded && styles.rowNameMuted]}>{exercise.name}</Text>
                      <View style={styles.badgeRow}>
                        {exercise.muscleGroups.map((g) => (
                          <MuscleBadge key={g} group={g} />
                        ))}
                      </View>
                    </View>
                    {alreadyAdded ? (
                      <Text style={styles.addedText}>Added</Text>
                    ) : (
                      <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
          {grouped.length === 0 && <Text style={styles.emptyText}>No exercises match "{query}".</Text>}
        </ScrollView>
      </View>
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
  search: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  groupSection: {
    marginBottom: spacing.lg,
  },
  groupTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowThumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    marginRight: spacing.md,
    backgroundColor: colors.cardAlt,
  },
  rowName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rowNameMuted: {
    color: colors.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  addedText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
