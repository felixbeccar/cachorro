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

// react-native-health ships native iOS code that only exists once this app has been
// prebuilt/rebuilt with a dev client (it is NOT available in plain Expo Go). Requiring it
// is guarded so the rest of the app keeps working when that native module isn't linked.
let AppleHealthKit: any = null;
if (Platform.OS === 'ios') {
  try {
    // react-native-health does `module.exports = HealthKit` (plain CommonJS, no ESM default
    // wrapper) — requiring `.default` here silently resolved to undefined and made the app
    // think HealthKit was never linked, even in a real native build.
    AppleHealthKit = require('react-native-health');
  } catch {
    AppleHealthKit = null;
  }
}

export function isHealthKitLinked(): boolean {
  return Platform.OS === 'ios' && AppleHealthKit != null && NativeModules.AppleHealthKit != null;
}

export function initHealthKit(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isHealthKitLinked()) {
      reject(new Error('HealthKit is only available in an iOS dev client build, not Expo Go.'));
      return;
    }
    const Permissions = AppleHealthKit.Constants.Permissions;
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
    AppleHealthKit.initHealthKit(options, (error: string) => {
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
    AppleHealthKit.getAnchoredWorkouts(options, (error: string, results: { data: any[] }) => {
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
