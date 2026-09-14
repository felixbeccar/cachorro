import { EXERCISES } from '../data/exercises';
import { MUSCLE_GROUPS, MuscleGroup } from '../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = MS_PER_DAY * 7;

/**
 * How many consecutive 7-day windows, counting back from right now, contain at least one
 * session. Simpler than calendar weeks (no week-of-year edge cases) and a better fit than a
 * daily streak for a twice-a-week routine — a session every 3-4 days keeps this alive.
 */
export function computeWeeklyStreak(sessionDatesDesc: string[]): number {
  if (sessionDatesDesc.length === 0) return 0;
  const dates = sessionDatesDesc.map((d) => new Date(d).getTime());
  const now = Date.now();
  let streak = 0;
  for (;;) {
    const windowEnd = now - streak * MS_PER_WEEK;
    const windowStart = windowEnd - MS_PER_WEEK;
    const hasSession = dates.some((d) => d >= windowStart && d < windowEnd);
    if (!hasSession) break;
    streak += 1;
  }
  return streak;
}

/** Tally how many times each muscle group was trained, from a flat list of exercise ids. */
export function computeMuscleGroupCounts(exerciseIds: string[]): Record<MuscleGroup, number> {
  const counts = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as Record<MuscleGroup, number>;
  for (const id of exerciseIds) {
    const exercise = EXERCISES.find((e) => e.id === id);
    if (!exercise) continue;
    for (const group of exercise.muscleGroups) {
      counts[group] += 1;
    }
  }
  return counts;
}

export function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * MS_PER_DAY).toISOString().slice(0, 10);
}
