import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StretchMode } from '../../components/StretchMode';
import { WorkoutMode } from '../../components/WorkoutMode';
import { colors, radius, spacing } from '../../src/theme';

type Mode = 'workout' | 'stretch';

export default function TodayScreen() {
  const [mode, setMode] = useState<Mode>('workout');

  return (
    <View style={styles.container}>
      <View style={styles.switcher}>
        <Pressable
          style={[styles.switchButton, mode === 'workout' && styles.switchButtonActive]}
          onPress={() => setMode('workout')}
        >
          <Text style={[styles.switchText, mode === 'workout' && styles.switchTextActive]}>Workout</Text>
        </Pressable>
        <Pressable
          style={[styles.switchButton, mode === 'stretch' && styles.switchButtonActive]}
          onPress={() => setMode('stretch')}
        >
          <Text style={[styles.switchText, mode === 'stretch' && styles.switchTextActive]}>Stretch</Text>
        </Pressable>
      </View>

      {mode === 'workout' ? <WorkoutMode /> : <StretchMode />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  switcher: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    margin: spacing.lg,
    marginBottom: 0,
    padding: 4,
  },
  switchButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  switchButtonActive: {
    backgroundColor: colors.primaryMuted,
  },
  switchText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  switchTextActive: {
    color: colors.primary,
  },
});
