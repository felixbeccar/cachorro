import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../src/theme';
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABEL, MuscleGroup } from '../src/types';

interface Props {
  counts: Record<MuscleGroup, number>;
}

export function MuscleBalanceChart({ counts }: Props) {
  const max = Math.max(1, ...MUSCLE_GROUPS.map((g) => counts[g]));

  return (
    <View>
      {MUSCLE_GROUPS.map((group) => {
        const count = counts[group];
        const widthPct = Math.max((count / max) * 100, count > 0 ? 4 : 0);
        return (
          <View key={group} style={styles.row}>
            <Text style={styles.label}>{MUSCLE_GROUP_LABEL[group]}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${widthPct}%` }, count === 0 && styles.fillEmpty]} />
            </View>
            <Text style={styles.count}>{count}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    width: 74,
    color: colors.textMuted,
    fontSize: 12,
  },
  track: {
    flex: 1,
    height: 10,
    backgroundColor: colors.cardAlt,
    borderRadius: radius.sm,
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  fillEmpty: {
    backgroundColor: colors.border,
  },
  count: {
    width: 18,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
});
