import { Exercise } from '../types';

export const WARMUP_MINUTES = 5;

/** Rough per-exercise duration: ~3 min per set (work + rest between sets), 5 min floor. */
export function estimateExerciseMinutes(exercise: Exercise): number {
  return Math.max(5, exercise.defaultSets * 3);
}

export function estimateSessionMinutes(exercises: Exercise[]): number {
  return WARMUP_MINUTES + exercises.reduce((sum, e) => sum + estimateExerciseMinutes(e), 0);
}
