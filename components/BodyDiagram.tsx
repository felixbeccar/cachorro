import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { colors, spacing } from '../src/theme';
import { MuscleGroup } from '../src/types';

interface Props {
  lastGroups: MuscleGroup[];
  nextGroups: MuscleGroup[];
}

type HighlightState = 'both' | 'last' | 'next' | 'none';

function stateFor(group: MuscleGroup, last: Set<MuscleGroup>, next: Set<MuscleGroup>): HighlightState {
  const inLast = last.has(group);
  const inNext = next.has(group);
  if (inLast && inNext) return 'both';
  if (inLast) return 'last';
  if (inNext) return 'next';
  return 'none';
}

function colorFor(state: HighlightState): string {
  switch (state) {
    case 'both':
      return colors.warning;
    case 'last':
      return colors.success;
    case 'next':
      return colors.primary;
    default:
      return colors.border;
  }
}

export function BodyDiagram({ lastGroups, nextGroups }: Props) {
  const last = new Set(lastGroups);
  const next = new Set(nextGroups);
  const colorOf = (group: MuscleGroup) => colorFor(stateFor(group, last, next));

  return (
    <View>
      <View style={styles.figuresRow}>
        <View style={styles.figureColumn}>
          <Svg width="100%" height={200} viewBox="0 0 100 220">
            {/* Front view */}
            <Circle cx={50} cy={14} r={12} fill={colors.cardAlt} />
            <Rect x={44} y={24} width={12} height={10} fill={colors.cardAlt} />
            <Rect x={30} y={84} width={40} height={12} rx={4} fill={colors.cardAlt} />
            <Rect x={32} y={92} width={15} height={90} rx={7} fill={colorOf('legs')} />
            <Rect x={53} y={92} width={15} height={90} rx={7} fill={colorOf('legs')} />
            <Circle cx={26} cy={38} r={9} fill={colorOf('shoulders')} />
            <Circle cx={74} cy={38} r={9} fill={colorOf('shoulders')} />
            <Rect x={10} y={40} width={13} height={58} rx={6} fill={colorOf('arms')} />
            <Rect x={77} y={40} width={13} height={58} rx={6} fill={colorOf('arms')} />
            <Rect x={30} y={34} width={40} height={26} rx={10} fill={colorOf('chest')} />
            <Rect x={34} y={60} width={32} height={26} rx={8} fill={colorOf('core')} />
          </Svg>
          <Text style={styles.figureLabel}>Front</Text>
        </View>

        <View style={styles.figureColumn}>
          <Svg width="100%" height={200} viewBox="0 0 100 220">
            {/* Back view */}
            <Circle cx={50} cy={14} r={12} fill={colors.cardAlt} />
            <Rect x={44} y={24} width={12} height={10} fill={colors.cardAlt} />
            <Rect x={32} y={92} width={15} height={90} rx={7} fill={colorOf('legs')} />
            <Rect x={53} y={92} width={15} height={90} rx={7} fill={colorOf('legs')} />
            <Circle cx={26} cy={38} r={9} fill={colorOf('shoulders')} />
            <Circle cx={74} cy={38} r={9} fill={colorOf('shoulders')} />
            <Rect x={10} y={40} width={13} height={58} rx={6} fill={colorOf('arms')} />
            <Rect x={77} y={40} width={13} height={58} rx={6} fill={colorOf('arms')} />
            <Rect x={30} y={34} width={40} height={40} rx={10} fill={colorOf('back')} />
            <Rect x={31} y={82} width={38} height={22} rx={9} fill={colorOf('glutes')} />
          </Svg>
          <Text style={styles.figureLabel}>Back</Text>
        </View>
      </View>

      <View style={styles.legend}>
        <LegendItem color={colors.success} label="Last session" />
        <LegendItem color={colors.primary} label="Next session" />
        <LegendItem color={colors.warning} label="Both" />
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  figuresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  figureColumn: {
    alignItems: 'center',
    width: 100,
  },
  figureLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
