import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { STRETCHES, STRETCH_TOTAL_SECONDS } from '../src/data/stretches';
import { getStretchLog, getStretchStreak, setStretchLogCompleted } from '../src/db/queries';
import {
  cancelDailyStretchReminder,
  getStretchReminderTime,
  requestNotificationPermission,
  scheduleDailyStretchReminder,
} from '../src/notifications/reminders';
import { colors, radius, spacing } from '../src/theme';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_REMINDER_TIME = { hour: 19, minute: 0 };

const REMINDER_PRESETS = [
  { hour: 7, minute: 0 },
  { hour: 8, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 18, minute: 0 },
  { hour: 19, minute: 0 },
  { hour: 20, minute: 0 },
  { hour: 21, minute: 0 },
];

function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function StretchMode() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState(0);
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderTime, setReminderTime] = useState(DEFAULT_REMINDER_TIME);

  useFocusEffect(
    useCallback(() => {
      const doneToday = getStretchLog(todayISO());
      if (doneToday) {
        const all: Record<string, boolean> = {};
        STRETCHES.forEach((s) => (all[s.id] = true));
        setChecked(all);
      }
      setStreak(getStretchStreak());
      getStretchReminderTime().then((t) => {
        setReminderOn(!!t);
        if (t) setReminderTime(t);
      });
    }, [])
  );

  const allDone = useMemo(() => STRETCHES.every((s) => checked[s.id]), [checked]);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      const done = STRETCHES.every((s) => next[s.id]);
      setStretchLogCompleted(todayISO(), done);
      if (done) setStreak(getStretchStreak());
      return next;
    });
  }

  async function handleReminderToggle(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('Notifications disabled', 'Enable notifications in Settings to get a daily reminder.');
        return;
      }
      await scheduleDailyStretchReminder(reminderTime.hour, reminderTime.minute);
      setReminderOn(true);
    } else {
      await cancelDailyStretchReminder();
      setReminderOn(false);
    }
  }

  async function handleSelectTime(time: { hour: number; minute: number }) {
    setReminderTime(time);
    if (reminderOn) {
      await scheduleDailyStretchReminder(time.hour, time.minute);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Daily stretch</Text>
          <Text style={styles.subtitle}>~{Math.round(STRETCH_TOTAL_SECONDS / 60)} min</Text>
        </View>
        <View style={styles.streakPill}>
          <Ionicons name="flame" size={16} color={colors.warning} />
          <Text style={styles.streakText}>{streak}</Text>
        </View>
      </View>

      <View style={styles.reminderCard}>
        <View style={styles.reminderTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reminderTitle}>Daily reminder</Text>
            <Text style={styles.reminderSubtitle}>
              {reminderOn ? `Every day at ${formatTime(reminderTime.hour, reminderTime.minute)}` : 'Off'}
            </Text>
          </View>
          <Switch
            value={reminderOn}
            onValueChange={handleReminderToggle}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeRow}>
          {REMINDER_PRESETS.map((time) => {
            const active = time.hour === reminderTime.hour && time.minute === reminderTime.minute;
            return (
              <Pressable
                key={formatTime(time.hour, time.minute)}
                onPress={() => handleSelectTime(time)}
                style={[styles.timeChip, active && styles.timeChipActive]}
              >
                <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>
                  {formatTime(time.hour, time.minute)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {STRETCHES.map((stretch) => {
        const done = !!checked[stretch.id];
        return (
          <Pressable key={stretch.id} style={[styles.row, done && styles.rowDone]} onPress={() => toggle(stretch.id)}>
            <Ionicons
              name={done ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={done ? colors.success : colors.textMuted}
            />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[styles.rowTitle, done && styles.rowTitleDone]}>{stretch.name}</Text>
              <Text style={styles.rowSubtitle}>{stretch.notes}</Text>
            </View>
            <Text style={styles.rowSeconds}>{stretch.seconds}s</Text>
          </Pressable>
        );
      })}

      {allDone && (
        <View style={styles.doneBanner}>
          <Text style={styles.doneBannerText}>All done for today. Nice work.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  streakText: {
    color: colors.text,
    fontWeight: '700',
  },
  reminderCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  reminderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  reminderSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  timeRow: {
    marginTop: spacing.md,
  },
  timeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
  },
  timeChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  timeChipText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  timeChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowDone: {
    borderColor: colors.success,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rowTitleDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  rowSeconds: {
    color: colors.textMuted,
    fontSize: 12,
  },
  doneBanner: {
    backgroundColor: colors.successMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  doneBannerText: {
    color: colors.success,
    fontWeight: '700',
  },
});
