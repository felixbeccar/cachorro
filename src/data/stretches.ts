import { Stretch } from '../types';

// ~15 minutes total including transitions between stretches
export const STRETCHES: Stretch[] = [
  { id: 'neck-side', name: 'Neck Side Stretch', seconds: 60, notes: '30s each side' },
  { id: 'shoulder-cross-body', name: 'Shoulder Cross-Body Stretch', seconds: 60, notes: '30s each side' },
  { id: 'chest-doorway', name: 'Chest Doorway Stretch', seconds: 45, notes: 'Lean gently into a door frame' },
  { id: 'cat-cow', name: 'Cat-Cow', seconds: 60, notes: 'Slow, controlled spine movement' },
  { id: 'hip-flexor-lunge', name: 'Hip Flexor Lunge Stretch', seconds: 90, notes: '45s each side' },
  { id: 'seated-hamstring', name: 'Seated Hamstring Stretch', seconds: 90, notes: '45s each side' },
  { id: 'figure-4-glute', name: 'Figure-4 Glute Stretch', seconds: 90, notes: '45s each side' },
  { id: 'quad-stretch', name: 'Standing Quad Stretch', seconds: 60, notes: '30s each side' },
  { id: 'childs-pose', name: "Child's Pose", seconds: 60, notes: 'Breathe deeply, relax lower back' },
  { id: 'calf-wall', name: 'Calf Wall Stretch', seconds: 60, notes: '30s each side' },
];

export const STRETCH_TOTAL_SECONDS = STRETCHES.reduce((sum, s) => sum + s.seconds, 0);
