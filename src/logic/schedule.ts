import { ScheduleActivity, WeeklySchedule } from '../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function dateISOFromOffset(daysFromToday: number): string {
  return new Date(Date.now() + daysFromToday * MS_PER_DAY).toISOString().slice(0, 10);
}

export function activityForDate(schedule: WeeklySchedule, dateISO: string): ScheduleActivity {
  // Noon avoids a date-only ISO string rolling back a day when parsed in a negative UTC offset.
  const dayOfWeek = new Date(`${dateISO}T12:00:00`).getDay();
  return schedule[dayOfWeek] ?? 'rest';
}

/** The next 7 calendar dates starting today, for the week-view list (includes non-gym days). */
export function getNextWeekDates(): string[] {
  return Array.from({ length: 7 }, (_, i) => dateISOFromOffset(i));
}
