import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../src/theme';
import { SCHEDULE_ACTIVITY_ORDER, ScheduleActivity, WeeklySchedule } from '../src/types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ACTIVITY_ICON: Record<ScheduleActivity, keyof typeof Ionicons.glyphMap> = {
  gym: 'barbell-outline',
  padel: 'tennisball-outline',
  pilates: 'body-outline',
  rest: 'moon-outline',
};

const ACTIVITY_COLOR: Record<ScheduleActivity, string> = {
  gym: colors.primary,
  padel: colors.success,
  pilates: colors.warning,
  rest: colors.textMuted,
};

interface Props {
  schedule: WeeklySchedule;
  onChangeDay: (dayOfWeek: number, activity: ScheduleActivity) => void;
}

export function WeeklyScheduleEditor({ schedule, onChangeDay }: Props) {
  function handlePress(dayOfWeek: number) {
    const current = schedule[dayOfWeek] ?? 'rest';
    const currentIndex = SCHEDULE_ACTIVITY_ORDER.indexOf(current);
    const next = SCHEDULE_ACTIVITY_ORDER[(currentIndex + 1) % SCHEDULE_ACTIVITY_ORDER.length];
    onChangeDay(dayOfWeek, next);
  }

  return (
    <View style={styles.row}>
      {DAY_LABELS.map((label, dayOfWeek) => {
        const activity = schedule[dayOfWeek] ?? 'rest';
        return (
          <Pressable key={dayOfWeek} style={styles.dayChip} onPress={() => handlePress(dayOfWeek)}>
            <Text style={styles.dayLabel}>{label}</Text>
            <Ionicons name={ACTIVITY_ICON[activity]} size={18} color={ACTIVITY_COLOR[activity]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  dayChip: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    flex: 1,
    marginHorizontal: 2,
  },
  dayLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
});
