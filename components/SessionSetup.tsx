import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { VoiceCommandBar } from './VoiceCommandBar';
import { colors, radius, spacing } from '../src/theme';
import { MUSCLE_GROUP_LABEL, MuscleGroup } from '../src/types';

// Glutes isn't its own checkbox — it rides along with Legs (see excludeGroupsFromSelection below,
// matching the same pairing rule the voice command already applies).
const SETUP_GROUPS: MuscleGroup[] = ['legs', 'core', 'chest', 'back', 'arms', 'shoulders'];

interface Props {
  onBuild: (selectedGroups: MuscleGroup[]) => void;
  onFinalVoiceText: (text: string) => void;
  onTypeInstead: () => void;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function SessionSetup({ onBuild, onFinalVoiceText, onTypeInstead }: Props) {
  const [selected, setSelected] = useState<Set<MuscleGroup>>(new Set());

  function toggle(group: MuscleGroup) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>{greeting()}, Felix</Text>
      <Text style={styles.question}>What do you want to train today?</Text>

      <View style={styles.grid}>
        {SETUP_GROUPS.map((group) => {
          const active = selected.has(group);
          return (
            <Pressable key={group} onPress={() => toggle(group)} style={[styles.chip, active && styles.chipActive]}>
              <Ionicons
                name={active ? 'checkbox' : 'square-outline'}
                size={20}
                color={active ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{MUSCLE_GROUP_LABEL[group]}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.hint}>
        {selected.size === 0
          ? "Nothing checked yet — leave it that way for a full-body session, or pick a few."
          : ' '}
      </Text>

      <Pressable style={styles.buildButton} onPress={() => onBuild(Array.from(selected))}>
        <Text style={styles.buildButtonText}>Build session</Text>
      </Pressable>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <VoiceCommandBar
        onFinalText={onFinalVoiceText}
        onTypeInstead={onTypeInstead}
        idleHint={'"Legs and core, 45 minutes" · tap to talk and I\'ll build it'}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  greeting: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  question: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    width: '31%',
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.primary,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: spacing.lg,
    minHeight: 16,
  },
  buildButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buildButtonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
