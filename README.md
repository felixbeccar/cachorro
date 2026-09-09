# fortyfive

A simple, personal gym app: a ~45 minute well-rounded workout you can run through twice a week, daily 15-minute stretching with reminders, progress tracking over time, and (on iOS, with a custom build) your Apple Health workouts (padel, walking, etc.) pulled into one activity view.

Everything is stored locally on your phone (SQLite) — no backend, no account, no syncing.

## Features

- **Today tab** — generates a ~45 min routine covering every major muscle group (chest, back, shoulders, legs, glutes, core, arms). It favors exercises you haven't done, or haven't done in a while, over ones you keep repeating, and avoids exactly repeating last session's picks. Tap the checkmark to mark an exercise done, log weight/reps per set, swap any exercise for an alternative, or regenerate the whole routine.
- **Progress tab** — every finished session, plus a weight-over-time trend and personal best for any exercise you've logged.
- **Stretch tab** — a ~15 minute daily stretching routine as a checklist, a streak counter, and an optional daily local reminder notification.
- **Activity tab** (iOS only, requires a dev-client build — see below) — reads your recent workouts from Apple Health (padel, walking, running, anything logged there) into a simple list.

## Installing on your iPhone

There are two ways to get this on your phone, depending on whether you want to just try it or actually use it week to week.

### Quick test (5 min, no account needed)

```bash
npm install
npx expo start
```

Install **Expo Go** from the App Store, scan the QR code the command prints. Today / Progress / Stretch all work fully. This needs your computer running `expo start` and both devices on the same network (or a tunnel) every time you open the app — fine for trying it out, not for daily use. No Apple Health (see below for why).

### Real install — a standalone app icon on your phone, works offline, includes Apple Health

This needs a free [expo.dev](https://expo.dev) account and an [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/year — Apple requires this to install any app, even your own, on a physical iPhone outside the App Store). No Mac needed, it builds in Expo's cloud.

```bash
npm install -g eas-cli
eas login                                  # creates/logs into your free expo.dev account
eas build --profile preview --platform ios # builds in the cloud, ~15-20 min
```

First run, `eas build` will walk you through logging into your Apple ID and registering your iPhone (it handles certificates/provisioning for you — pick the default/"let Expo handle it" options). When the build finishes it prints a link: open it on your iPhone in Safari and tap **Install**. From then on it's a normal app icon — no dev server, no computer needed, and the Activity tab can request Apple Health access since this is a real native build.

To update the app later after making changes, just re-run the `eas build` command above and reinstall from the new link.

## Enabling Apple Health (Activity tab)

`react-native-health` links native HealthKit code, so it only works in a custom "dev client" build, not Expo Go. Steps:

1. Have a Mac with Xcode installed (or use `eas build` in the cloud instead, see below).
2. `npx expo prebuild -p ios` — generates the native `ios/` project with the HealthKit entitlement and permission strings already wired in (`plugins/withHealthKit.js`).
3. `npx expo run:ios` — builds and installs the dev client on your phone/simulator.
4. Open the app (via `npx expo start --dev-client` from then on), go to the Activity tab, tap **Connect Apple Health**, and grant access.

No Mac? Use [EAS Build](https://docs.expo.dev/build/introduction/) instead:

```bash
npx eas build --profile development --platform ios
```

Install the resulting build on your phone via the link EAS gives you, then run `npx expo start --dev-client` to connect to it.

Padel isn't a built-in Apple Health workout type — whatever type your padel-tracking app (Playtomic, Apple Fitness, etc.) logs it as will show up here, since the Activity tab reads *all* recorded workouts, not a fixed whitelist.

## How the routine generator works

See `src/logic/routineGenerator.ts`. For each muscle group it scores every exercise in `src/data/exercises.ts`:

- Never done before → always wins.
- Otherwise, score = days since last done, minus a small penalty per time already done.

That means brand-new exercises get suggested first, exercises you haven't touched in a while come next, and exercises you do constantly get deprioritized (but can still show up — nothing is ever fully excluded). It also avoids exactly repeating the exercises from your last finished session. Add more exercises any time by extending `EXERCISES` in `src/data/exercises.ts` — no other code needs to change.

## Data model

Everything lives in a local SQLite database (`expo-sqlite`, see `src/db/`):

- `sessions` — one row per finished workout.
- `session_exercises` — which exercises were done in a session, and in what order.
- `sets` — weight/reps per set.
- `stretch_logs` — one row per day, whether the full stretch routine was completed.

There's no server and no export yet — data lives on-device. If you want a backup/export or iCloud sync later, that's the natural next feature to add.

## Project structure

```
app/(tabs)/        expo-router screens: index (Today), progress, stretch, activity
components/        ExerciseCard, ProgressChart, MuscleBadge
src/data/          exercise library, stretch routine
src/db/            SQLite schema + queries
src/logic/         routine generator
src/health/        HealthKit wrapper (guarded so it's a no-op outside a dev-client build)
src/notifications/ daily stretch reminder scheduling
plugins/           local Expo config plugin adding the HealthKit entitlement
```

## Stack

Expo (React Native, TypeScript) + expo-router + expo-sqlite + expo-notifications + react-native-svg + react-native-health.
