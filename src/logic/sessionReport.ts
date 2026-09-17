import { EffortLevel } from '../types';

const EFFORT_SCORE: Record<EffortLevel, number> = { easy: 1, mid: 2, hard: 3 };
const SCORE_EFFORT: EffortLevel[] = ['easy', 'mid', 'hard'];

/**
 * Forecasts a session's overall effort from how hard each of its exercises felt last time it
 * was logged. Exercises never done before are skipped; if none of them have history, returns
 * null (shown as "New" — same on Today and Plan, since neither has a live signal to prefer).
 */
export function estimateSessionEffort(previousEfforts: (EffortLevel | null | undefined)[]): EffortLevel | null {
  const scores = previousEfforts.filter((e): e is EffortLevel => !!e).map((e) => EFFORT_SCORE[e]);
  if (scores.length === 0) return null;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const rounded = Math.min(3, Math.max(1, Math.round(avg)));
  return SCORE_EFFORT[rounded - 1];
}
