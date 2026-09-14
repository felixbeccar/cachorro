import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../src/theme';

const DEFAULT_SECONDS = 90;

export function RestTimer() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function start(seconds: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRemaining(seconds);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev == null) return null;
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          Vibration.vibrate([0, 300, 150, 300]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function addTime(seconds: number) {
    setRemaining((prev) => (prev != null ? prev + seconds : prev));
  }

  function cancel() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRemaining(null);
  }

  if (remaining == null) {
    return (
      <Pressable style={styles.startButton} onPress={() => start(DEFAULT_SECONDS)}>
        <Ionicons name="timer-outline" size={16} color={colors.textMuted} />
        <Text style={styles.startButtonText}>Rest 90s</Text>
      </Pressable>
    );
  }

  const isDone = remaining === 0;

  return (
    <View style={[styles.timerBar, isDone && styles.timerBarDone]}>
      <Text style={[styles.timerText, isDone && styles.timerTextDone]}>
        {isDone ? 'Rest done' : `Resting… ${remaining}s`}
      </Text>
      <View style={styles.timerActions}>
        {!isDone && (
          <Pressable hitSlop={8} onPress={() => addTime(30)}>
            <Text style={styles.timerActionText}>+30s</Text>
          </Pressable>
        )}
        <Pressable hitSlop={8} onPress={cancel}>
          <Text style={styles.timerActionText}>{isDone ? 'Dismiss' : 'Cancel'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  startButtonText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  timerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  timerBarDone: {
    borderColor: colors.success,
  },
  timerText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  timerTextDone: {
    color: colors.success,
  },
  timerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timerActionText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});
