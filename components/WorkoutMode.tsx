import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { ExerciseCard } from './ExerciseCard';
import { ExercisePickerModal } from './ExercisePickerModal';
import { SessionReportCard } from './SessionReportCard';
import { SessionSetup } from './SessionSetup';
import { VoiceCommandBar } from './VoiceCommandBar';
import { VoiceFeedbackModal } from './VoiceFeedbackModal';
import { VoiceLogModal } from './VoiceLogModal';
import { getExerciseById } from '../src/data/exercises';
import {
  createSession,
  deletePlannedSessionForDate,
  finishSession,
  getExerciseStats,
  getLastSessionExerciseIds,
  getPlannedSession,
  getPreviousExerciseLog,
  getSessionDetail,
  getSessionForDate,
  getUnratedVoiceCommandsForDate,
  replaceSessionExercises,
  startSession,
} from '../src/db/queries';
import { generateRoutine } from '../src/logic/routineGenerator';
import { estimateSessionEffort } from '../src/logic/sessionReport';
import { buildSessionTemplates, maybePickTemplate, templateToPicks } from '../src/logic/sessionTemplates';
import { colors, radius, spacing } from '../src/theme';
import {
  EffortLevel,
  Exercise,
  ExerciseStat,
  MUSCLE_GROUPS,
  MuscleGroup,
  PreviousExerciseLog,
  RoutinePick,
  SetEntry,
  VoiceCommandLogRow,
} from '../src/types';

// Matches the app's own ~40-45 min target — used to find a matching past session when a voice
// command didn't give an explicit duration.
const DEFAULT_TARGET_MINUTES = 42;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

function makeDefaultSets(count: number): SetEntry[] {
  return Array.from({ length: count }, (_, i) => ({ setIndex: i, weightKg: null, reps: null }));
}

/** Pads a resumed session's logged sets back out to at least the exercise's usual set count. */
function hydrateSets(exercise: Exercise, logged: { setIndex: number; weightKg: number | null; reps: number | null }[]): SetEntry[] {
  const count = Math.max(exercise.defaultSets, ...logged.map((s) => s.setIndex + 1), 1);
  const byIndex = new Map(logged.map((s) => [s.setIndex, s]));
  return Array.from({ length: count }, (_, i) => {
    const existing = byIndex.get(i);
    return { setIndex: i, weightKg: existing?.weightKg ?? null, reps: existing?.reps ?? null };
  });
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Either reuses a past session that's a good match ("learning" from history), or falls back to
 * generating fresh — see maybePickTemplate for the odds and matching rules.
 */
function pickRoutine(
  freshStats: Record<string, ExerciseStat>,
  avoidIds: string[],
  excludeGroups: MuscleGroup[] = [],
  targetMinutes: number | null = null,
  setsOverride: number | null = null
): { picks: RoutinePick[]; templateDate: string | null } {
  const templates = buildSessionTemplates();
  const template = maybePickTemplate(templates, targetMinutes ?? DEFAULT_TARGET_MINUTES, excludeGroups, avoidIds);
  if (template) {
    return { picks: templateToPicks(template, freshStats), templateDate: template.date };
  }
  return {
    picks: generateRoutine(freshStats, avoidIds, excludeGroups, targetMinutes, setsOverride),
    templateDate: null,
  };
}

type Phase = 'loading' | 'setup' | 'built';

export function WorkoutMode() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [stats, setStats] = useState<Record<string, ExerciseStat>>({});
  const [routine, setRoutine] = useState<RoutinePick[]>([]);
  const [setsByExercise, setSetsByExercise] = useState<Record<string, SetEntry[]>>({});
  const [doneByExercise, setDoneByExercise] = useState<Record<string, boolean>>({});
  const [effortByExercise, setEffortByExercise] = useState<Record<string, EffortLevel | null>>({});
  // Set once this session has a DB row — further "Finish"/edits update the same row instead of
  // creating a new one, so the session stays reachable and editable, not a dead end.
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [loaded, setLoaded] = useState(false);
  // 'add' appends a new exercise; a number replaces the exercise at that index in `routine`.
  const [pickerTarget, setPickerTarget] = useState<'add' | number | null>(null);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [pendingVoiceText, setPendingVoiceText] = useState<string | undefined>(undefined);
  const [feedbackLogs, setFeedbackLogs] = useState<VoiceCommandLogRow[] | null>(null);
  // Set when today's routine is a repeat of a good past session rather than freshly generated.
  const [templateDate, setTemplateDate] = useState<string | null>(null);

  const loadToday = useCallback(() => {
    const freshStats = getExerciseStats();
    setStats(freshStats);
    setTemplateDate(null);
    setPickerTarget(null);

    const existing = getSessionForDate(todayISO());
    if (existing) {
      // Already started and/or finished today — resume exactly what's there instead of
      // generating something new (and losing today's real logged sets).
      const detail = getSessionDetail(existing.id);
      const picks: RoutinePick[] = [];
      const sets: Record<string, SetEntry[]> = {};
      const effortByEx: Record<string, EffortLevel | null> = {};
      const doneByEx: Record<string, boolean> = {};
      for (const d of detail) {
        const exercise = getExerciseById(d.exerciseId);
        if (!exercise) continue;
        picks.push({
          exercise,
          isNew: !freshStats[exercise.id] || freshStats[exercise.id].timesDone === 0,
          group: exercise.muscleGroups[0],
        });
        sets[exercise.id] = hydrateSets(exercise, d.sets);
        effortByEx[exercise.id] = d.effort;
        doneByEx[exercise.id] = d.sets.some((s) => s.weightKg != null || s.reps != null);
      }
      setRoutine(picks);
      setSetsByExercise(sets);
      setDoneByExercise(doneByEx);
      setEffortByExercise(effortByEx);
      setSessionId(existing.id);
      setSessionStartedAt(existing.startedAt ? new Date(existing.startedAt).getTime() : null);
      setSessionFinished(!!existing.finishedAt);
      setPhase('built');
      return;
    }

    const planned = getPlannedSession(todayISO());
    if (planned && planned.exercises.length > 0) {
      // Today was set up from the Plan tab — use that instead of generating a fresh one, so
      // edits made there actually show up here.
      const picks = planned.exercises
        .map((pe) => getExerciseById(pe.exerciseId))
        .filter((e): e is Exercise => !!e)
        .map((exercise) => ({
          exercise,
          isNew: !freshStats[exercise.id] || freshStats[exercise.id].timesDone === 0,
          group: exercise.muscleGroups[0],
        }));
      const sets: Record<string, SetEntry[]> = {};
      for (const pick of picks) sets[pick.exercise.id] = makeDefaultSets(pick.exercise.defaultSets);
      setRoutine(picks);
      setSetsByExercise(sets);
      setDoneByExercise({});
      setEffortByExercise({});
      setSessionId(null);
      setSessionStartedAt(null);
      setSessionFinished(false);
      setPhase('built');
      return;
    }

    // Totally fresh day — nothing planned, nothing started. Ask what to train.
    setRoutine([]);
    setSetsByExercise({});
    setDoneByExercise({});
    setEffortByExercise({});
    setSessionId(null);
    setSessionStartedAt(null);
    setSessionFinished(false);
    setPhase('setup');
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!loaded) {
        loadToday();
        setLoaded(true);
      }
    }, [loaded, loadToday])
  );

  useEffect(() => {
    if (sessionStartedAt == null || sessionFinished) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sessionStartedAt, sessionFinished]);

  const previousLogByExercise = useMemo(() => {
    const map: Record<string, PreviousExerciseLog | null> = {};
    for (const pick of routine) {
      map[pick.exercise.id] = getPreviousExerciseLog(pick.exercise.id);
    }
    return map;
  }, [routine]);

  function applyBuiltRoutine(picks: RoutinePick[], templateDate: string | null, setsOverride: number | null = null) {
    const sets: Record<string, SetEntry[]> = {};
    for (const pick of picks) {
      sets[pick.exercise.id] = makeDefaultSets(setsOverride ?? pick.exercise.defaultSets);
    }
    setRoutine(picks);
    setSetsByExercise(sets);
    setDoneByExercise({});
    setEffortByExercise({});
    setTemplateDate(templateDate);
    setPhase('built');
  }

  function handleBuildFromGroups(selectedGroups: MuscleGroup[], targetMinutes: number) {
    const selected = new Set(selectedGroups);
    // Legs and glutes are trained together — selecting Legs keeps glutes in too (same pairing
    // rule the voice command uses). Nothing checked at all means full body, exclude nothing.
    const excludeGroups: MuscleGroup[] =
      selected.size === 0 ? [] : MUSCLE_GROUPS.filter((g) => (g === 'glutes' ? !selected.has('legs') : !selected.has(g)));
    const freshStats = getExerciseStats();
    setStats(freshStats);
    const avoidIds = getLastSessionExerciseIds();
    const { picks, templateDate } = pickRoutine(freshStats, avoidIds, excludeGroups, targetMinutes);
    applyBuiltRoutine(picks, templateDate);
  }

  function handleRegenerate() {
    const currentIds = routine.map((p) => p.exercise.id);
    const freshStats = getExerciseStats();
    setStats(freshStats);
    const { picks, templateDate } = pickRoutine(freshStats, currentIds);
    applyBuiltRoutine(picks, templateDate);
  }

  function handleSelectFromPicker(exercise: Exercise) {
    const isNew = !stats[exercise.id] || stats[exercise.id].timesDone === 0;
    const newPick: RoutinePick = { exercise, isNew, group: exercise.muscleGroups[0] };
    setTemplateDate(null);

    if (pickerTarget === 'add') {
      setRoutine((prev) => [...prev, newPick]);
      setSetsByExercise((prev) => ({ ...prev, [exercise.id]: makeDefaultSets(exercise.defaultSets) }));
    } else if (typeof pickerTarget === 'number') {
      const replaced = routine[pickerTarget];
      const nextRoutine = [...routine];
      nextRoutine[pickerTarget] = newPick;
      setRoutine(nextRoutine);
      setSetsByExercise((prev) => {
        const next = { ...prev };
        delete next[replaced.exercise.id];
        next[exercise.id] = makeDefaultSets(exercise.defaultSets);
        return next;
      });
      setDoneByExercise((prev) => {
        const next = { ...prev };
        delete next[replaced.exercise.id];
        return next;
      });
      setEffortByExercise((prev) => {
        const next = { ...prev };
        delete next[replaced.exercise.id];
        return next;
      });
    }
    setPickerTarget(null);
  }

  function handleRemoveExercise(index: number) {
    const removed = routine[index];
    setTemplateDate(null);
    setRoutine((prev) => prev.filter((_, i) => i !== index));
    setSetsByExercise((prev) => {
      const next = { ...prev };
      delete next[removed.exercise.id];
      return next;
    });
    setDoneByExercise((prev) => {
      const next = { ...prev };
      delete next[removed.exercise.id];
      return next;
    });
    setEffortByExercise((prev) => {
      const next = { ...prev };
      delete next[removed.exercise.id];
      return next;
    });
  }

  function handleChangeSet(exerciseId: string, setIndex: number, field: 'weightKg' | 'reps', value: string) {
    setSetsByExercise((prev) => {
      const next = { ...prev };
      const sets = [...(next[exerciseId] ?? [])];
      sets[setIndex] = { ...sets[setIndex], [field]: parseNumber(value) };
      next[exerciseId] = sets;
      return next;
    });
  }

  function handleAddSet(exerciseId: string) {
    setSetsByExercise((prev) => {
      const next = { ...prev };
      const sets = [...(next[exerciseId] ?? [])];
      sets.push({ setIndex: sets.length, weightKg: null, reps: null });
      next[exerciseId] = sets;
      return next;
    });
  }

  function handleToggleDone(exerciseId: string) {
    setDoneByExercise((prev) => ({ ...prev, [exerciseId]: !prev[exerciseId] }));
    // Checkpoint: marking an exercise done is a natural "save what I've got" moment mid-session.
    if (sessionId != null) persistSnapshot(sessionId, routine, setsByExercise, effortByExercise);
  }

  function handleSetEffort(exerciseId: string, effort: EffortLevel) {
    const next = { ...effortByExercise, [exerciseId]: effortByExercise[exerciseId] === effort ? null : effort };
    setEffortByExercise(next);
    if (sessionId != null) persistSnapshot(sessionId, routine, setsByExercise, next);
  }

  function handleApplyVoiceLog(entries: { exercise: Exercise; sets: { weightKg: number | null; reps: number | null }[] }[]) {
    const existingIds = new Set(routine.map((p) => p.exercise.id));
    const additions: RoutinePick[] = [];
    for (const entry of entries) {
      if (!existingIds.has(entry.exercise.id)) {
        const isNew = !stats[entry.exercise.id] || stats[entry.exercise.id].timesDone === 0;
        additions.push({ exercise: entry.exercise, isNew, group: entry.exercise.muscleGroups[0] });
        existingIds.add(entry.exercise.id);
      }
    }
    if (additions.length > 0) {
      setTemplateDate(null);
      setRoutine((prev) => [...prev, ...additions]);
    }
    setSetsByExercise((prev) => {
      const next = { ...prev };
      for (const entry of entries) {
        next[entry.exercise.id] = entry.sets.map((s, i) => ({ setIndex: i, weightKg: s.weightKg, reps: s.reps }));
      }
      return next;
    });
    setPhase('built');
  }

  function handleAdjustRoutine(excludeGroups: MuscleGroup[], setsOverride: number | null, targetMinutes: number | null) {
    const currentIds = routine.map((p) => p.exercise.id);
    const freshStats = getExerciseStats();
    const { picks, templateDate } = pickRoutine(freshStats, currentIds, excludeGroups, targetMinutes, setsOverride);
    applyBuiltRoutine(picks, templateDate, setsOverride);
  }

  function handleVoiceFinalText(text: string) {
    setPendingVoiceText(text);
    setVoiceModalVisible(true);
  }

  function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= routine.length) return;
    setRoutine((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const sessionEffort = useMemo(
    () => estimateSessionEffort(routine.map((p) => previousLogByExercise[p.exercise.id]?.effort)),
    [routine, previousLogByExercise]
  );

  /** Writes the routine/sets/effort to `session_exercises` so the session survives an app kill mid-workout. */
  function persistSnapshot(
    id: number,
    r: RoutinePick[],
    sets: Record<string, SetEntry[]>,
    effort: Record<string, EffortLevel | null>
  ) {
    replaceSessionExercises(
      id,
      r.map((pick) => ({
        exerciseId: pick.exercise.id,
        effort: effort[pick.exercise.id] ?? null,
        sets: sets[pick.exercise.id] ?? [],
      }))
    );
  }

  function handleStartSession() {
    const nowISO = new Date().toISOString();
    let id = sessionId;
    if (id == null) {
      id = createSession(todayISO(), nowISO);
      setSessionId(id);
    } else {
      startSession(id, nowISO);
    }
    // Write the routine immediately, not just at Finish — otherwise the app being killed
    // mid-workout leaves a session row with no exercises, and resuming loses everything.
    persistSnapshot(id, routine, setsByExercise, effortByExercise);
    setSessionStartedAt(new Date(nowISO).getTime());
    setNow(Date.now());
    setSessionFinished(false);
  }

  function handleSave() {
    let id = sessionId;
    const nowISO = new Date().toISOString();
    if (id == null) {
      id = createSession(todayISO(), nowISO);
      setSessionId(id);
      setSessionStartedAt(new Date(nowISO).getTime());
    }
    persistSnapshot(id, routine, setsByExercise, effortByExercise);
    finishSession(id, nowISO);
    setSessionFinished(true);
    // Idempotent — a no-op once today's planned_sessions row is already gone (or never existed).
    deletePlannedSessionForDate(todayISO());
    const unrated = getUnratedVoiceCommandsForDate(todayISO());
    if (unrated.length > 0) {
      setFeedbackLogs(unrated);
    }
  }

  if (phase === 'loading') {
    return <View style={styles.container} />;
  }

  if (phase === 'setup') {
    return (
      <>
        <SessionSetup
          onBuild={handleBuildFromGroups}
          onFinalVoiceText={handleVoiceFinalText}
          onTypeInstead={() => {
            setPendingVoiceText(undefined);
            setVoiceModalVisible(true);
          }}
        />
        <VoiceLogModal
          visible={voiceModalVisible}
          initialText={pendingVoiceText}
          onClose={() => {
            setVoiceModalVisible(false);
            setPendingVoiceText(undefined);
          }}
          onApplyLog={handleApplyVoiceLog}
          onAdjustRoutine={(excludeGroups, setsOverride, targetMinutes) =>
            handleAdjustRoutine(excludeGroups, setsOverride, targetMinutes)
          }
        />
      </>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Today's session</Text>
            {sessionFinished && (
              <View style={styles.savedPill}>
                <Ionicons name="checkmark" size={12} color={colors.success} />
                <Text style={styles.savedPillText}>Saved</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>
            {routine.length} exercises
            {templateDate ? ` · repeating ${formatShortDate(templateDate)}` : ''}
          </Text>
        </View>
        <Pressable style={styles.regenButton} onPress={handleRegenerate}>
          <Ionicons name="refresh" size={16} color={colors.primary} />
          <Text style={styles.regenButtonText}>Regenerate</Text>
        </Pressable>
      </View>

      {sessionStartedAt == null ? (
        <Pressable style={styles.startButton} onPress={handleStartSession}>
          <Ionicons name="play" size={18} color={colors.bg} />
          <Text style={styles.startButtonText}>Start session</Text>
        </Pressable>
      ) : (
        <View style={styles.timerPill}>
          <Ionicons name="time-outline" size={14} color={colors.primary} />
          <Text style={styles.timerText}>
            {formatElapsed(now - sessionStartedAt)} {sessionFinished ? '· finished' : 'elapsed'}
          </Text>
        </View>
      )}

      <VoiceCommandBar
        onFinalText={handleVoiceFinalText}
        onTypeInstead={() => {
          setPendingVoiceText(undefined);
          setVoiceModalVisible(true);
        }}
      />
      <SessionReportCard exercises={routine.map((p) => p.exercise)} effort={sessionEffort} />

      {routine.map((pick, i) => (
        <ExerciseCard
          key={pick.exercise.id}
          exercise={pick.exercise}
          isNew={pick.isNew}
          sets={setsByExercise[pick.exercise.id] ?? []}
          done={!!doneByExercise[pick.exercise.id]}
          canMoveUp={i > 0}
          canMoveDown={i < routine.length - 1}
          previousLog={previousLogByExercise[pick.exercise.id] ?? null}
          effort={effortByExercise[pick.exercise.id] ?? null}
          onChangeSet={(setIndex, field, value) => handleChangeSet(pick.exercise.id, setIndex, field, value)}
          onAddSet={() => handleAddSet(pick.exercise.id)}
          onToggleDone={() => handleToggleDone(pick.exercise.id)}
          onChangeExercise={() => setPickerTarget(i)}
          onRemove={() => handleRemoveExercise(i)}
          onSetEffort={(effort) => handleSetEffort(pick.exercise.id, effort)}
          onMoveUp={() => handleMove(i, -1)}
          onMoveDown={() => handleMove(i, 1)}
        />
      ))}

      <Pressable style={styles.addExerciseButton} onPress={() => setPickerTarget('add')}>
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text style={styles.addExerciseButtonText}>Add exercise</Text>
      </Pressable>

      <Pressable style={styles.primaryButton} onPress={handleSave}>
        <Text style={styles.primaryButtonText}>{sessionFinished ? 'Save changes' : 'Finish workout'}</Text>
      </Pressable>

      <ExercisePickerModal
        visible={pickerTarget !== null}
        excludeIds={routine.map((p) => p.exercise.id)}
        onSelect={handleSelectFromPicker}
        onClose={() => setPickerTarget(null)}
      />

      <VoiceLogModal
        visible={voiceModalVisible}
        initialText={pendingVoiceText}
        onClose={() => {
          setVoiceModalVisible(false);
          setPendingVoiceText(undefined);
        }}
        onApplyLog={handleApplyVoiceLog}
        onAdjustRoutine={(excludeGroups, setsOverride, targetMinutes) =>
          handleAdjustRoutine(excludeGroups, setsOverride, targetMinutes)
        }
      />

      <VoiceFeedbackModal
        visible={feedbackLogs != null}
        logs={feedbackLogs ?? []}
        onClose={() => setFeedbackLogs(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  savedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.successMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savedPillText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  regenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  regenButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  startButtonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '700',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  timerText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  addExerciseButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: '700',
  },
});
