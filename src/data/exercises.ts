import { Exercise } from '../types';

export const EXERCISES: Exercise[] = [
  // Chest
  { id: 'bench-press', name: 'Barbell Bench Press', muscleGroups: ['chest', 'arms'], equipment: 'Barbell', defaultSets: 3, defaultReps: '6-10' },
  { id: 'incline-db-press', name: 'Incline Dumbbell Press', muscleGroups: ['chest', 'shoulders'], equipment: 'Dumbbell', defaultSets: 3, defaultReps: '8-12' },
  { id: 'push-up', name: 'Push-Up', muscleGroups: ['chest', 'arms', 'core'], equipment: 'Bodyweight', defaultSets: 3, defaultReps: '10-20' },
  { id: 'chest-fly', name: 'Cable Chest Fly', muscleGroups: ['chest'], equipment: 'Cable', defaultSets: 3, defaultReps: '12-15' },
  { id: 'dips', name: 'Chest Dips', muscleGroups: ['chest', 'arms'], equipment: 'Dip bars', defaultSets: 3, defaultReps: '8-12' },

  // Back
  { id: 'pull-up', name: 'Pull-Up', muscleGroups: ['back', 'arms'], equipment: 'Pull-up bar', defaultSets: 3, defaultReps: '5-10' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscleGroups: ['back', 'arms'], equipment: 'Cable machine', defaultSets: 3, defaultReps: '8-12' },
  { id: 'barbell-row', name: 'Barbell Row', muscleGroups: ['back', 'arms'], equipment: 'Barbell', defaultSets: 3, defaultReps: '6-10' },
  { id: 'seated-cable-row', name: 'Seated Cable Row', muscleGroups: ['back'], equipment: 'Cable', defaultSets: 3, defaultReps: '10-12' },
  { id: 'db-single-arm-row', name: 'Single-Arm Dumbbell Row', muscleGroups: ['back', 'arms'], equipment: 'Dumbbell', defaultSets: 3, defaultReps: '8-12 / side' },

  // Shoulders
  { id: 'overhead-press', name: 'Standing Overhead Press', muscleGroups: ['shoulders', 'arms'], equipment: 'Barbell', defaultSets: 3, defaultReps: '6-10' },
  { id: 'db-shoulder-press', name: 'Dumbbell Shoulder Press', muscleGroups: ['shoulders', 'arms'], equipment: 'Dumbbell', defaultSets: 3, defaultReps: '8-12' },
  { id: 'lateral-raise', name: 'Dumbbell Lateral Raise', muscleGroups: ['shoulders'], equipment: 'Dumbbell', defaultSets: 3, defaultReps: '12-15' },
  { id: 'face-pull', name: 'Cable Face Pull', muscleGroups: ['shoulders', 'back'], equipment: 'Cable', defaultSets: 3, defaultReps: '12-15' },
  { id: 'rear-delt-fly', name: 'Rear Delt Fly', muscleGroups: ['shoulders', 'back'], equipment: 'Dumbbell', defaultSets: 3, defaultReps: '12-15' },

  // Legs
  { id: 'back-squat', name: 'Barbell Back Squat', muscleGroups: ['legs', 'glutes', 'core'], equipment: 'Barbell', defaultSets: 3, defaultReps: '6-10' },
  { id: 'leg-press', name: 'Leg Press', muscleGroups: ['legs', 'glutes'], equipment: 'Machine', defaultSets: 3, defaultReps: '10-12' },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', muscleGroups: ['legs', 'glutes', 'back'], equipment: 'Barbell', defaultSets: 3, defaultReps: '8-10' },
  { id: 'walking-lunge', name: 'Walking Lunge', muscleGroups: ['legs', 'glutes'], equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12 / leg' },
  { id: 'leg-curl', name: 'Seated Leg Curl', muscleGroups: ['legs'], equipment: 'Machine', defaultSets: 3, defaultReps: '10-12' },
  { id: 'leg-extension', name: 'Leg Extension', muscleGroups: ['legs'], equipment: 'Machine', defaultSets: 3, defaultReps: '12-15' },
  { id: 'calf-raise', name: 'Standing Calf Raise', muscleGroups: ['legs'], equipment: 'Machine / Dumbbell', defaultSets: 3, defaultReps: '12-20' },

  // Glutes
  { id: 'hip-thrust', name: 'Barbell Hip Thrust', muscleGroups: ['glutes', 'legs'], equipment: 'Barbell', defaultSets: 3, defaultReps: '8-12' },
  { id: 'cable-kickback', name: 'Cable Glute Kickback', muscleGroups: ['glutes'], equipment: 'Cable', defaultSets: 3, defaultReps: '12-15 / leg' },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', muscleGroups: ['glutes', 'legs'], equipment: 'Dumbbell', defaultSets: 3, defaultReps: '8-12 / leg' },
  { id: 'glute-bridge', name: 'Glute Bridge', muscleGroups: ['glutes', 'core'], equipment: 'Bodyweight', defaultSets: 3, defaultReps: '15-20' },

  // Core
  { id: 'plank', name: 'Plank', muscleGroups: ['core'], equipment: 'Bodyweight', defaultSets: 3, defaultReps: '30-60 sec' },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscleGroups: ['core'], equipment: 'Pull-up bar', defaultSets: 3, defaultReps: '8-15' },
  { id: 'cable-crunch', name: 'Cable Crunch', muscleGroups: ['core'], equipment: 'Cable', defaultSets: 3, defaultReps: '12-15' },
  { id: 'russian-twist', name: 'Russian Twist', muscleGroups: ['core'], equipment: 'Dumbbell / Plate', defaultSets: 3, defaultReps: '15-20' },
  { id: 'ab-wheel-rollout', name: 'Ab Wheel Rollout', muscleGroups: ['core'], equipment: 'Ab wheel', defaultSets: 3, defaultReps: '8-12' },

  // Arms
  { id: 'barbell-curl', name: 'Barbell Bicep Curl', muscleGroups: ['arms'], equipment: 'Barbell', defaultSets: 3, defaultReps: '8-12' },
  { id: 'hammer-curl', name: 'Dumbbell Hammer Curl', muscleGroups: ['arms'], equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12' },
  { id: 'tricep-pushdown', name: 'Cable Tricep Pushdown', muscleGroups: ['arms'], equipment: 'Cable', defaultSets: 3, defaultReps: '10-15' },
  { id: 'overhead-tricep-extension', name: 'Overhead Tricep Extension', muscleGroups: ['arms'], equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12' },
  { id: 'close-grip-bench', name: 'Close-Grip Bench Press', muscleGroups: ['arms', 'chest'], equipment: 'Barbell', defaultSets: 3, defaultReps: '8-10' },
];

export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}
