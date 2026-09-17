# cachorro

A simple, personal gym app: a ~45 minute well-rounded workout you can run through twice a week, daily 15-minute stretching with reminders, progress tracking over time, and (on iOS, with a custom build) your Apple Health workouts (padel, walking, etc.) pulled into one activity view.

Everything is stored locally on your phone (SQLite) — no backend, no account, no syncing.

## Features

- **Today tab** — a Workout/Stretch switch at the top.
  - **Workout mode**: a session report card up top — a body diagram of what this session hits, estimated duration, and a forecasted effort (from how hard these exercises felt last time) — then generates a ~45 min routine covering every major muscle group (chest, back, shoulders, legs, glutes, core, arms). It favors exercises you haven't done, or haven't done in a while, over ones you keep repeating, and avoids exactly repeating last session's picks. Tap the checkmark to mark an exercise done, log weight/reps per set + an effort rating, see how it went last time, swap/add/remove exercises, or regenerate the whole routine. Long-press the drag handle (⠿) on a card to reorder it, iOS-reorder-style. Each exercise card shows a demo photo (tap it to toggle start/finish position) when one's available. Each exercise has a rest timer. **Log by voice**: describe what you did (typed, or dictated via your keyboard's mic button) — "Bulgarian split squat, 3 sets of 12 at 15 kilos" — and it's parsed into the right exercise + sets, with a review step before anything's applied. Needs an Anthropic API key (see below).
  - **Stretch mode**: a ~15 minute daily stretching routine as a checklist, a streak counter, and an optional daily local reminder notification.
- **Plan tab** — a real weekly schedule (which days are Gym/Padel/Pilates/Rest, tap a day to cycle), a front/back body diagram showing which muscles you worked last session vs. what's coming up next, and — for each upcoming gym day — the same session report card as Today (muscles hit, duration, forecasted effort) plus a persisted, editable session timeline (with suggested weights). Edits here carry over: swap/add/remove/reorder (long-press the drag handle) an exercise for Wednesday, and Wednesday's Today tab shows that when it arrives.
- **Progress tab** — a dashboard: sessions/volume in the last 30 days, a weekly training streak, a muscle-group balance chart (are you neglecting legs?), a weight-over-time trend and personal best per exercise, and full session history (deletable).
- **Activity tab** (iOS only, requires a dev-client/EAS build — see below) — reads your recent workouts from Apple Health (padel, walking, running, anything logged there) into a simple list.

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

### Updating after that first install

Most changes to this app are JS/TS only (new exercises, screen tweaks, bug fixes in `.ts`/`.tsx` files) — those ship **over the air**, no reinstall:

```bash
eas update --branch preview --message "what changed"
```

The app checks for an update on launch and applies it automatically (or on the next launch after that) — usually live within a minute or two, no App Store-style download/install step.

A full rebuild (`eas build --profile preview --platform ios` + reinstalling from the link) is only needed when something **native** changes — a new native library gets added (like `react-native-health` or `expo-notifications`), an iOS permission/entitlement changes, or the Expo SDK version is upgraded. `runtimeVersion` is set to the `fingerprint` policy, which tracks this automatically: if you publish a JS update whose native fingerprint doesn't match what's installed on the phone, the app just won't pick it up (rather than crashing), so `eas update` is always the safe thing to try first — worst case it's a no-op and you fall back to a full build.

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

## Enabling voice logging (Workout mode)

Tap **Log by voice** on the Today tab. The first time, it'll ask for an Anthropic API key:

1. Get one at [console.anthropic.com](https://console.anthropic.com) (requires setting up billing — this feature costs a small fraction of a cent per use, on the `claude-haiku-4-5` model).
2. Paste it in when prompted. It's stored only on your phone, in the iOS Keychain via `expo-secure-store` — never synced anywhere, never leaves the device except in the API call itself.

How it works: type or dictate (tap the mic icon on your keyboard) a description of what you did — "Bulgarian split squat, 3 sets of 12 at 15 kilos each leg" — tap Parse, and it sends that text (plus your exercise catalog, so it can match names) to Claude, which returns structured sets per exercise. You get a review screen to fix any misheard numbers or pick the right exercise if it couldn't match one, before anything is applied to today's session. Nothing is auto-saved without that confirmation step.

## How the routine generator works

See `src/logic/routineGenerator.ts`. For each muscle group it scores every exercise in `src/data/exercises.ts`:

- Never done before → always wins.
- Otherwise, score = days since last done, minus a small penalty per time already done.

That means brand-new exercises get suggested first, exercises you haven't touched in a while come next, and exercises you do constantly get deprioritized (but can still show up — nothing is ever fully excluded). It also avoids exactly repeating the exercises from your last finished session. Add more exercises any time by extending `EXERCISES` in `src/data/exercises.ts` — no other code needs to change.

### Exercise demo photos

Most exercises show a start/finish demo photo (`src/data/exerciseImages.ts` maps exercise id → two `require()`d JPGs in `assets/exercises/`), sourced from [free-exercise-db](https://github.com/yuhonas/free-exercise-db), a public-domain (Unlicense) exercise dataset — no scraping, no licensing risk. A few exercises with no close match in that dataset (e.g. `high-plank-arm-reach`, `seated-windshield-wipers`) just don't have a photo yet. To add one: drop `<id>-0.jpg` and `<id>-1.jpg` (~480px wide) into `assets/exercises/` and add a line to `EXERCISE_IMAGES`.

## Data model

Everything lives in a local SQLite database (`expo-sqlite`, see `src/db/`):

- `sessions` — one row per finished workout.
- `session_exercises` — which exercises were done in a session, and in what order.
- `sets` — weight/reps per set.
- `stretch_logs` — one row per day, whether the full stretch routine was completed.

There's no server and no export yet — data lives on-device. If you want a backup/export or iCloud sync later, that's the natural next feature to add.

## Project structure

```
app/(tabs)/        expo-router screens: index (Today shell), plan, progress, activity
components/        WorkoutMode, StretchMode, ExerciseCard, ExercisePickerModal, RestTimer,
                   ProgressChart, MuscleBalanceChart, MuscleBadge, BodyDiagram,
                   SessionTimeline, WeeklyScheduleEditor, VoiceLogModal
src/data/          exercise library, stretch routine
src/db/            SQLite schema + queries
src/logic/         routine generator, weekly schedule helpers, session-duration estimates,
                   dashboard stats (streaks, muscle balance)
src/ai/            voice-log text parsing (Claude API) + secure API key storage
src/health/        HealthKit wrapper (guarded so it's a no-op outside a dev-client build)
src/notifications/ daily stretch reminder scheduling
plugins/           local Expo config plugin adding the HealthKit entitlement
patches/           patch-package fix for react-native-health's New Architecture bug
```

## Stack

Expo (React Native, TypeScript) + expo-router + expo-sqlite + expo-notifications + react-native-svg + react-native-health + react-native-draggable-flatlist (reorder gestures, via reanimated + gesture-handler).
