import { useRef, useState } from 'react';
import { GestureResponderEvent, PanResponder, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../src/theme';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const TRACK_HEIGHT = 40;
const THUMB_SIZE = 22;

export function DurationSlider({ value, onChange, min = 15, max = 90, step = 15 }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const numSteps = Math.round((max - min) / step);

  function setFromX(x: number) {
    if (trackWidth <= 0) return;
    const clamped = Math.max(0, Math.min(trackWidth, x));
    const stepIndex = Math.round((clamped / trackWidth) * numSteps);
    const next = min + stepIndex * step;
    if (next !== value) onChange(next);
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => setFromX(evt.nativeEvent.locationX),
      onPanResponderMove: (evt: GestureResponderEvent) => setFromX(evt.nativeEvent.locationX),
    })
  ).current;

  const fraction = max > min ? (value - min) / (max - min) : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{value} minutes</Text>
      <View
        style={styles.touchArea}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={styles.trackBg} />
        <View style={[styles.trackFill, { width: `${fraction * 100}%` }]} />
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            { left: `${fraction * 100}%`, transform: [{ translateX: -THUMB_SIZE / 2 }] },
          ]}
        />
      </View>
      <View style={styles.ticksRow}>
        <Text style={styles.tickText}>{min}'</Text>
        <Text style={styles.tickText}>{max}'</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  touchArea: {
    height: TRACK_HEIGHT,
    justifyContent: 'center',
  },
  trackBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  trackFill: {
    position: 'absolute',
    top: (TRACK_HEIGHT - 4) / 2,
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  thumb: {
    position: 'absolute',
    top: (TRACK_HEIGHT - THUMB_SIZE) / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.bg,
  },
  ticksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  tickText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
});
