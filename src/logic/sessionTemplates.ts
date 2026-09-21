import { getExerciseById } from '../data/exercises';
import { getSessionDetail, listSessions } from '../db/queries';
import { estimateExerciseMinutes, WARMUP_MINUTES } from './timeline';
import { Exercise, ExerciseStat, MuscleGroup, RoutinePick } from '../types';

export interface SessionTemplate {
  sessionId: number;
  date: string;
  exerciseIds: string[];
  estimatedMinutes: number;
  groups: MuscleGroup[];
}

/** How often a matching past session gets suggested instead of a freshly generated routine. */
const REPLAY_CHANCE = 0.4;
/** How close a past session's estimated length has to be to the request to count as a match. */
const DURATION_TOLERANCE_MINUTES = 8;

/**
 * Turns your finished session history into reusable templates — "a good ~45 min session you
 * already did" — so a request for a routine can sometimes resurface one instead of generating
 * from scratch every time. Only sessions with enough exercises, most of them actually logged
 * with real weights/reps (not just checked off), count as reusable.
 */
export function buildSessionTemplates(): SessionTemplate[] {
  const templates: SessionTemplate[] = [];

  for (const session of listSessions()) {
    const detail = getSessionDetail(session.id);
    if (detail.length < 4) continue;

    const substantive = detail.filter((d) => d.sets.some((s) => s.weightKg != null || s.reps != null));
    if (substantive.length / detail.length < 0.7) continue;

    const exerciseIds: string[] = [];
    const groups = new Set<MuscleGroup>();
    let minutes = WARMUP_MINUTES;

    for (const d of detail) {
      const exercise = getExerciseById(d.exerciseId);
      if (!exercise) continue;
      exerciseIds.push(d.exerciseId);
      exercise.muscleGroups.forEach((g) => groups.add(g));
      minutes += estimateExerciseMinutes(exercise, Math.max(1, d.sets.length));
    }
    if (exerciseIds.length === 0) continue;

    templates.push({
      sessionId: session.id,
      date: session.date,
      exerciseIds,
      estimatedMinutes: minutes,
      groups: Array.from(groups),
    });
  }

  return templates;
}

/**
 * Rolls the dice on whether to suggest a matching past session instead of generating fresh —
 * `avoidIds` (usually today's/last session's exercise ids) keeps it from "suggesting" the
 * session you literally just repeated.
 */
export function maybePickTemplate(
  templates: SessionTemplate[],
  targetMinutes: number,
  excludeGroups: MuscleGroup[],
  avoidIds: string[]
): SessionTemplate | null {
  const excluded = new Set(excludeGroups);
  const avoidSet = new Set(avoidIds);

  const candidates = templates.filter((t) => {
    if (t.groups.some((g) => excluded.has(g))) return false;
    if (Math.abs(t.estimatedMinutes - targetMinutes) > DURATION_TOLERANCE_MINUTES) return false;
    const isSameAsAvoided = t.exerciseIds.length > 0 && t.exerciseIds.every((id) => avoidSet.has(id));
    return !isSameAsAvoided;
  });
  if (candidates.length === 0) return null;
  if (Math.random() >= REPLAY_CHANCE) return null;

  candidates.sort(
    (a, b) => Math.abs(a.estimatedMinutes - targetMinutes) - Math.abs(b.estimatedMinutes - targetMinutes)
  );
  const pool = candidates.slice(0, 3);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function templateToPicks(template: SessionTemplate, stats: Record<string, ExerciseStat>): RoutinePick[] {
  return template.exerciseIds
    .map((id) => getExerciseById(id))
    .filter((e): e is Exercise => !!e)
    .map((exercise) => ({
      exercise,
      isNew: !stats[exercise.id] || stats[exercise.id].timesDone === 0,
      group: exercise.muscleGroups[0],
    }));
}
