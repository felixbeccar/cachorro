export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'legs' | 'glutes' | 'core' | 'arms';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'legs',
  'glutes',
  'core',
  'arms',
];

export const MUSCLE_GROUP_LABEL: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  legs: 'Legs',
  glutes: 'Glutes',
  core: 'Core',
  arms: 'Arms',
};

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  equipment: string;
  defaultSets: number;
  defaultReps: string;
  // Excluded from the auto-generated routine (e.g. a cooldown block) — still pickable via "Add exercise".
  manualOnly?: boolean;
}

export interface Stretch {
  id: string;
  name: string;
  seconds: number;
  notes: string;
}

export interface ExerciseStat {
  exerciseId: string;
  timesDone: number;
  lastDoneAt: string | null;
  bestWeightKg: number | null;
}

export interface RoutinePick {
  exercise: Exercise;
  isNew: boolean;
  group: MuscleGroup;
}

export interface SetEntry {
  setIndex: number;
  weightKg: number | null;
  reps: number | null;
}

export interface SessionRow {
  id: number;
  date: string;
  finished_at: string | null;
}

export interface ExerciseHistoryPoint {
  date: string;
  maxWeightKg: number | null;
  totalReps: number;
}

export type EffortLevel = 'easy' | 'mid' | 'hard';

export const EFFORT_LABEL: Record<EffortLevel, string> = {
  easy: 'Easy',
  mid: 'Mid',
  hard: 'Hard',
};

export interface PreviousExerciseLog {
  date: string;
  sets: { weightKg: number | null; reps: number | null }[];
  effort: EffortLevel | null;
}
