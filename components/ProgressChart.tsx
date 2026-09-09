import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { colors, spacing } from '../src/theme';
import { ExerciseHistoryPoint } from '../src/types';

const WIDTH = 320;
const HEIGHT = 140;
const PADDING = 20;

export function ProgressChart({ points }: { points: ExerciseHistoryPoint[] }) {
  const withWeight = points.filter((p) => p.maxWeightKg != null) as (ExerciseHistoryPoint & { maxWeightKg: number })[];

  if (withWeight.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Log a weight for this exercise to see a trend.</Text>
      </View>
    );
  }

  const weights = withWeight.map((p) => p.maxWeightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const coords = withWeight.map((p, i) => {
    const x =
      withWeight.length === 1
        ? WIDTH / 2
        : PADDING + (i / (withWeight.length - 1)) * (WIDTH - PADDING * 2);
    const y = HEIGHT - PADDING - ((p.maxWeightKg - min) / range) * (HEIGHT - PADDING * 2);
    return { x, y };
  });

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');

  return (
    <View>
      <Svg width={WIDTH} height={HEIGHT}>
        <Line x1={PADDING} y1={HEIGHT - PADDING} x2={WIDTH - PADDING} y2={HEIGHT - PADDING} stroke={colors.border} strokeWidth={1} />
        <Polyline points={polylinePoints} fill="none" stroke={colors.primary} strokeWidth={2} />
        {coords.map((c, i) => (
          <Circle key={i} cx={c.x} cy={c.y} r={3.5} fill={colors.primary} />
        ))}
      </Svg>
      <View style={styles.legendRow}>
        <Text style={styles.legendText}>{min}kg</Text>
        <Text style={styles.legendText}>Best: {max}kg</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: PADDING,
    marginTop: spacing.xs,
  },
  legendText: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
