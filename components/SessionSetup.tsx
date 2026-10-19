import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DurationSlider } from './DurationSlider';
import { VoiceCommandBar } from './VoiceCommandBar';
import { colors, radius, spacing } from '../src/theme';
import { MUSCLE_GROUP_LABEL, MuscleGroup } from '../src/types';

// Glutes isn't its own checkbox — it rides along with Legs (see excludeGroupsFromSelection below,
// matching the same pairing rule the voice command already applies).
const SETUP_GROUPS: MuscleGroup[] = ['legs', 'core', 'chest', 'back', 'arms', 'shoulders'];

const DEFAULT_MINUTES = 45;

interface Props {
  onBuild: (selectedGroups: MuscleGroup[], targetMinutes: number) => void;
  onFinalVoiceText: (text: string) => void;
  onTypeInstead: () => void;
  onManageApiKey: () => void;
  /** Exercise count of a routine already queued for today from the Plan tab, if any. */
  plannedCount?: number;
  onUsePlanned?: () => void;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function SessionSetup({
  onBuild,
  onFinalVoiceText,
  onTypeInstead,
  onManageApiKey,
  plannedCount,
  onUsePlanned,
}: Props) {
  const [selected, setSelected] = useState<Set<MuscleGroup>>(new Set());
  const [targetMinutes, setTargetMinutes] = useState(DEFAULT_MINUTES);

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
      <Image source={require('../assets/images/icon.png')} style={styles.logo} />
      <Text style={styles.greeting}>{greeting()}, Felix</Text>
      <Text style={styles.question}>What do you want to train today?</Text>

      {plannedCount != null && plannedCount > 0 && onUsePlanned && (
        <Pressable style={styles.plannedBanner} onPress={onUsePlanned}>
          <Ionicons name="calendar" size={18} color={colors.primary} />
          <View style={styles.plannedBannerText}>
            <Text style={styles.plannedBannerTitle}>Today's planned session is ready</Text>
            <Text style={styles.plannedBannerSubtitle}>{plannedCount} exercises, set up from the Plan tab</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
      )}

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

      <DurationSlider value={targetMinutes} onChange={setTargetMinutes} min={15} max={90} step={15} />

      <Pressable style={styles.buildButton} onPress={() => onBuild(Array.from(selected), targetMinutes)}>
        <Text style={styles.buildButtonText}>Build session</Text>
      </Pressable>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <VoiceCommandBar
        variant="circle"
        onFinalText={onFinalVoiceText}
        onTypeInstead={onTypeInstead}
        idleHint={'Tap and tell me what you want to build — "legs and core, 45 minutes"'}
      />
      <Pressable style={styles.manageKeyLink} onPress={onManageApiKey}>
        <Text style={styles.manageKeyLinkText}>Manage API key</Text>
      </Pressable>
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
  logo: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignSelf: 'center',
    marginBottom: spacing.md,
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
  plannedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  plannedBannerText: {
    flex: 1,
  },
  plannedBannerTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  plannedBannerSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
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
  manageKeyLink: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  manageKeyLinkText: {
    color: colors.textMuted,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
});
