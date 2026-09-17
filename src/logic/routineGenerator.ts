import { EXERCISES } from '../data/exercises';
import { ExerciseStat, MUSCLE_GROUPS, MuscleGroup, RoutinePick } from '../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysSince(dateISO: string | null): number {
  if (!dateISO) return 9999;
  return Math.max(0, Math.floor((Date.now() - new Date(dateISO).getTime()) / MS_PER_DAY));
}

// Higher score = more worth suggesting: never-done exercises win, then longest-untouched,
// with a small penalty for exercises that get repeated a lot (so favorites don't dominate).
function noveltyScore(exerciseId: string, stats: Record<string, ExerciseStat>): number {
  const stat = stats[exerciseId];
  if (!stat || stat.timesDone === 0) return 10_000;
  return daysSince(stat.lastDoneAt) - stat.timesDone * 2;
}

/**
 * Builds a well-rounded ~40-45 minute routine: one exercise per major muscle group,
 * preferring exercises the user hasn't done, or hasn't done in a while.
 * `excludeIds` lets the caller avoid repeating exercises picked for another group in the same routine
 * (some exercises hit multiple groups) and `avoidIds` (e.g. last session's picks) nudges variety further.
 * `excludeGroups` drops whole muscle groups from the routine (e.g. a voice command to skip legs).
 */
export function generateRoutine(
  stats: Record<string, ExerciseStat>,
  avoidIds: string[] = [],
  excludeGroups: MuscleGroup[] = []
): RoutinePick[] {
  const avoidSet = new Set(avoidIds);
  const excludedGroups = new Set(excludeGroups);
  const usedIds = new Set<string>();
  const picks: RoutinePick[] = [];

  for (const group of MUSCLE_GROUPS) {
    if (excludedGroups.has(group)) continue;
    const candidates = EXERCISES.filter(
      (e) =>
        e.muscleGroups.includes(group) &&
        !usedIds.has(e.id) &&
        !e.manualOnly &&
        !e.muscleGroups.some((g) => excludedGroups.has(g))
    );
    if (candidates.length === 0) continue;

    const ranked = [...candidates].sort((a, b) => {
      const scoreA = noveltyScore(a.id, stats) - (avoidSet.has(a.id) ? 500 : 0);
      const scoreB = noveltyScore(b.id, stats) - (avoidSet.has(b.id) ? 500 : 0);
      return scoreB - scoreA;
    });

    const chosen = ranked[0];
    usedIds.add(chosen.id);
    picks.push({
      exercise: chosen,
      isNew: !stats[chosen.id] || stats[chosen.id].timesDone === 0,
      group,
    });
  }

  return picks;
}
