# cachorro

A simple, personal gym app: a ~40-45 minute well-rounded workout you can run through twice a week, progress tracking over time, and (on iOS, with a custom build) your Apple Health workouts (padel, walking, etc.) pulled into one activity view.

Everything is stored locally on your phone (SQLite) — no backend, no account, no syncing.

## Features

- **Today tab** — the live session you use in the gym. A voice command bar and a session report card sit at the top, then the exercise list, in a ~40-45 min routine covering every major muscle group (chest, back, shoulders, legs, glutes, core, arms). It favors exercises you haven't done, or haven't done in a while, over ones you keep repeating, and avoids exactly repeating last session's picks.
  - **Voice command**: tap the mic and it starts listening immediately (native speech recognition, no typing screen first). Report a set you just did — "Bulgarian split squat, 3 sets of 12 at 15 kilos" — and it's parsed into the right exercise + sets, with a review step before anything's applied. Or reshape the whole session — "I'm wiped, make it light", "no legs today, my knee hurts", "legs and core, 45 minutes" — and it's replanned immediately (lighter sets, a group dropped, or padded with extra exercises in the groups you kept to actually fill a requested duration), no confirmation needed. Needs an Anthropic API key and a microphone/speech-recognition permission (see below).
  - **Session report card**: a body diagram of exactly what *this* session hits, its estimated duration, and a forecasted effort (from how hard these exercises felt last time you logged them).
  - Tap the checkmark to mark an exercise done, log weight/reps per set + an effort rating, see how it went last time, swap/add/remove/reorder exercises, or regenerate the whole routine. Each collapsed card shows its estimated minutes next to the name. Each exercise card shows a demo photo (tap it to toggle start/finish position) when one's available, and a rest timer.
  - **Finish workout** saves immediately, no confirmation dialog — and the session stays right there, fully editable. Change a set, add an exercise, whatever — the button becomes **Save changes** and every tap just overwrites that same saved session, so there's no dead end and no separate "history" you have to go find to fix a typo.
- **Plan tab** — a real weekly schedule (which days are Gym/Padel/Pilates/Rest, tap a day to cycle), a front/back body diagram showing which muscles you worked last session vs. what's coming up next, and — for each upcoming gym day — the same session report card as Today (muscles hit, duration, forecasted effort) plus a persisted, editable session timeline (with suggested weights). Edits here carry over: swap/add/remove/reorder an exercise for Wednesday, and Wednesday's Today tab shows that when it arrives.
- **Progress tab** — a dashboard: sessions/volume in the last 30 days, a weekly training streak, a muscle-group balance chart (are you neglecting legs?), a weight-over-time trend and personal best per exercise, and full session history (deletable).
- **Activity tab** (iOS only, requires a dev-client/EAS build — see below) — reads your recent workouts from Apple Health (padel, walking, running, anything logged there) into a simple list.

Daily stretching isn't tracked in-app anymore — do it on your own, no logging needed. (The old stretch checklist/streak/reminder code is still in the repo, just unlinked from the Today tab, in case it's wanted back.)

## Installing on your iPhone

There are two ways to get this on your phone, depending on whether you want to just try it or actually use it week to week.

### Quick test (5 min, no account needed)

```bash
npm install
npx expo start
```

Install **Expo Go** from the App Store, scan the QR code the command prints. Today and Progress work fully. This needs your computer running `expo start` and both devices on the same network (or a tunnel) every time you open the app — fine for trying it out, not for daily use. No Apple Health, and no voice command (see below for why).

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

## Enabling the voice command (Workout mode)

`expo-speech-recognition` links native speech-recognition code (iOS `SFSpeechRecognizer`), so — like Apple Health — it only works in a real build, not Expo Go: a fresh `eas build --profile preview --platform ios` (or a dev-client build) picks it up, since it's a new native module, not something `eas update` can ship over the air. See "Updating after that first install" above.

Tap the mic bar on the Today tab. First tap, iOS will ask for microphone + speech-recognition permission; grant both. It also needs an Anthropic API key, same as before:

1. Get one at [console.anthropic.com](https://console.anthropic.com) (requires setting up billing — this feature costs a small fraction of a cent per use, on the `claude-haiku-4-5` model).
2. Paste it in when prompted. It's stored only on your phone, in the iOS Keychain via `expo-secure-store` — never synced anywhere, never leaves the device except in the API call itself.

How it works: tap the mic — it starts listening immediately, no text box first. Say what you did ("Bulgarian split squat, 3 sets of 12 at 15 kilos each leg") or an instruction ("I'm wiped, make it light" / "no legs today, my knee hurts"). The transcript goes to Claude (`src/ai/parseVoiceCommand.ts`), which classifies it and either:
- returns structured sets per exercise — you get a review screen to fix any misheard numbers or pick the right exercise before it's applied, or
- returns which muscle groups to drop and/or a new sets-per-exercise count — today's routine is regenerated immediately, no confirmation screen (a quick "✓ &lt;summary&gt;" banner shows what changed).

If mic/speech permission is denied, the bar falls back to a "tap to type a command instead" link that opens the same flow with a text box.

### Improving the voice command over time

Every voice command (transcript, what it was classified as, and the AI's one-line summary of what it did) is logged locally to `voice_command_logs`. If any commands from today weren't rated yet, saving/finishing a session prompts a quick 👍/👎 per command — 👎 opens an optional "what went wrong?" note. This is deliberately not an automated self-tuning loop (too much risk of prompt drift for one person's data with no easy rollback); instead, tap **Share voice command log** on the Progress tab any time to export the full rated log as plain text via the share sheet — send that over and the system prompt in `src/ai/parseVoiceCommand.ts` gets hand-tuned against real patterns.

## How the routine generator works

See `src/logic/routineGenerator.ts`. For each muscle group it scores every exercise in `src/data/exercises.ts`:

- Never done before → always wins.
- Otherwise, score = days since last done, minus a small penalty per time already done.

That means brand-new exercises get suggested first, exercises you haven't touched in a while come next, and exercises you do constantly get deprioritized (but can still show up — nothing is ever fully excluded, unless you explicitly ask by voice to skip a muscle group for the day). It also avoids exactly repeating the exercises from your last finished session. Add more exercises any time by extending `EXERCISES` in `src/data/exercises.ts` — no other code needs to change.

### Learning from your session history

On the Today tab — first load of the day, tapping Regenerate, or any voice command that reshapes the session — there's a ~40% chance (see `src/logic/sessionTemplates.ts`) it suggests a whole past session instead of building one from scratch, if a good match exists: a finished session with 4+ exercises, most of them actually logged with real weights/reps (not just checked off), whose estimated length is close to what you're asking for (default ~42 min, or your stated duration), and that doesn't touch a muscle group you've excluded. It'll never replay the exact session you just did. When it happens, the subtitle under "Today's session" says which day it's repeating; editing the routine (add/remove/swap/voice-log an exercise) clears that label since it's no longer exactly that session. This is intentionally simple — no ML, just "was this a real, complete session close to what you're asking for" — and only wired into Today for now; Plan tab's upcoming-day suggestions still generate fresh every time.

### Exercise demo photos

Most exercises show a start/finish demo photo (`src/data/exerciseImages.ts` maps exercise id → two `require()`d JPGs in `assets/exercises/`), sourced from [free-exercise-db](https://github.com/yuhonas/free-exercise-db), a public-domain (Unlicense) exercise dataset — no scraping, no licensing risk. A few exercises with no close match in that dataset (e.g. `high-plank-arm-reach`, `seated-windshield-wipers`) just don't have a photo yet. To add one: drop `<id>-0.jpg` and `<id>-1.jpg` (~480px wide) into `assets/exercises/` and add a line to `EXERCISE_IMAGES`.

## Data model

Everything lives in a local SQLite database (`expo-sqlite`, see `src/db/`):

- `sessions` — one row per saved workout. A session is created on first "Finish workout" and can be
  re-saved any number of times after — `replaceSessionExercises()` wholesale-replaces its exercises/sets
  each time, so editing a saved session is just saving it again.
- `session_exercises` — which exercises were done in a session, and in what order.
- `sets` — weight/reps per set.
- `stretch_logs` — unused now that stretching isn't tracked in-app, kept for a possible future revival.
- `voice_command_logs` — every voice command used, its classified intent, and your 👍/👎 rating —
  see "Improving the voice command over time" above.

There's no server and no export yet — data lives on-device. If you want a backup/export or iCloud sync later, that's the natural next feature to add.

## Project structure

```
app/(tabs)/        expo-router screens: index (Today shell), plan, progress, activity
components/        WorkoutMode, VoiceCommandBar, VoiceLogModal, VoiceFeedbackModal, SessionReportCard, ExerciseCard,
                   ExercisePickerModal, RestTimer, ProgressChart, MuscleBalanceChart, MuscleBadge,
                   BodyDiagram, SessionTimeline, WeeklyScheduleEditor, StretchMode (unused, see above)
src/data/          exercise library, stretch routine (unused), exercise demo image manifest
src/db/            SQLite schema + queries
src/logic/         routine generator, weekly schedule helpers, session-duration estimates,
                   session-effort forecasting, dashboard stats (streaks, muscle balance)
src/ai/            voice-command parsing (Claude API, log-vs-adjust-routine intent) + secure API key storage
src/health/        HealthKit wrapper (guarded so it's a no-op outside a dev-client build)
src/notifications/ daily stretch reminder scheduling (unused, see above)
plugins/           local Expo config plugin adding the HealthKit entitlement
patches/           patch-package fix for react-native-health's New Architecture bug
```

## Stack

Expo (React Native, TypeScript) + expo-router + expo-sqlite + expo-notifications + react-native-svg + react-native-health + expo-speech-recognition (native voice command). Exercise reordering uses plain up/down buttons, not a gesture library — a drag-to-reorder attempt (react-native-draggable-flatlist) proved unreliable on-device across two fix attempts and was dropped in favor of something boring and dependable.
