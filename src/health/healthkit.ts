import { NativeModules, Platform } from 'react-native';

export interface HealthWorkout {
  id: string;
  activityName: string;
  start: string;
  end: string;
  durationMin: number;
  calories: number | null;
  distanceKm: number | null;
}

// react-native-health's own index.js wraps the native module with
// `Object.assign({}, NativeModules.AppleHealthKit, { Constants: {...} })`. Under React Native's
// New Architecture, the native module object isn't a plain enumerable object, so Object.assign
// copies zero of its methods — the wrapper object exists (so a naive "!= null" check passes) but
// every function on it, like initHealthKit, comes back undefined. Talking to the native module
// directly (and pulling Permissions from the library's constants submodule) sidesteps that
// broken wrapper entirely. Also guarded so the rest of the app keeps working when HealthKit isn't
// linked at all (Expo Go, Android).
let AppleHealthKitNative: any = null;
let Permissions: any = null;
if (Platform.OS === 'ios') {
  try {
    AppleHealthKitNative = NativeModules.AppleHealthKit;
    Permissions = require('react-native-health/src/constants').Permissions;
  } catch {
    AppleHealthKitNative = null;
  }
}

export function isHealthKitLinked(): boolean {
  return (
    Platform.OS === 'ios' &&
    AppleHealthKitNative != null &&
    typeof AppleHealthKitNative.initHealthKit === 'function'
  );
}

export function initHealthKit(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isHealthKitLinked()) {
      reject(new Error('HealthKit is only available in an iOS dev client build, not Expo Go.'));
      return;
    }
    const options = {
      permissions: {
        read: [
          Permissions.Workout,
          Permissions.Steps,
          Permissions.DistanceWalkingRunning,
          Permissions.ActiveEnergyBurned,
        ],
        write: [],
      },
    };
    AppleHealthKitNative.initHealthKit(options, (error: string) => {
      if (error) reject(new Error(error));
      else resolve();
    });
  });
}

export function fetchRecentWorkouts(days = 30): Promise<HealthWorkout[]> {
  return new Promise((resolve, reject) => {
    if (!isHealthKitLinked()) {
      resolve([]);
      return;
    }
    const options = {
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      type: 'Workout',
    };
    AppleHealthKitNative.getAnchoredWorkouts(options, (error: string, results: { data: any[] }) => {
      if (error) {
        reject(new Error(error));
        return;
      }
      const workouts: HealthWorkout[] = (results?.data ?? []).map((w) => ({
        id: `${w.start}-${w.activityName}`,
        activityName: w.activityName ?? 'Workout',
        start: w.start,
        end: w.end,
        durationMin: Math.round((w.duration ?? 0) / 60),
        calories: w.calories ?? null,
        distanceKm: w.distance ? w.distance / 1000 : null,
      }));
      workouts.sort((a, b) => (a.start < b.start ? 1 : -1));
      resolve(workouts);
    });
  });
}
