import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../src/theme';
import { MUSCLE_GROUP_LABEL, MuscleGroup } from '../src/types';

export function MuscleBadge({ group }: { group: MuscleGroup }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{MUSCLE_GROUP_LABEL[group]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  text: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
});
