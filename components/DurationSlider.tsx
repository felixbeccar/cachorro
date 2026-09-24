import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

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

  // Plain PanResponder doesn't reliably receive touches once the app root is wrapped in
  // GestureHandlerRootView (needed for expo-router's nav gestures) — gesture-handler's own
  // API is what actually gets the touch stream in that setup. runOnJS(true) keeps the callback
  // as a normal JS function, no Reanimated worklet compilation involved.
  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => setFromX(e.x))
    .onUpdate((e) => setFromX(e.x));

  const fraction = max > min ? (value - min) / (max - min) : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{value} minutes</Text>
      <GestureDetector gesture={pan}>
        <View style={styles.touchArea} onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
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
      </GestureDetector>
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
