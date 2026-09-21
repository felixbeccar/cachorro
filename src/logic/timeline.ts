import { Exercise } from '../types';

export const WARMUP_MINUTES = 5;

/**
 * Per-exercise duration, calibrated so a standard 7-exercise full-body session
 * (one per muscle group, 3 sets each) lands at ~40 min total including warm-up —
 * the low end of the app's ~40-45 min target.
 */
export function estimateExerciseMinutes(exercise: Exercise, setsOverride?: number | null): number {
  const sets = setsOverride ?? exercise.defaultSets;
  return Math.max(4, Math.round(sets * 1.7));
}

export function estimateSessionMinutes(exercises: Exercise[]): number {
  return WARMUP_MINUTES + exercises.reduce((sum, e) => sum + estimateExerciseMinutes(e), 0);
}
