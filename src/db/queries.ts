import { getDb } from './database';
import {
  EffortLevel,
  ExerciseHistoryPoint,
  ExerciseStat,
  PlannedSession,
  PreviousExerciseLog,
  ScheduleActivity,
  SessionRow,
  VoiceCommandFeedback,
  VoiceCommandIntent,
  VoiceCommandLogRow,
  WeeklySchedule,
} from '../types';

export function createSession(dateISO: string, startedAtISO: string | null = null): number {
  const result = getDb().runSync('INSERT INTO sessions (date, started_at) VALUES (?, ?)', [dateISO, startedAtISO]);
  return result.lastInsertRowId;
}

export function startSession(sessionId: number, startedAtISO: string) {
  getDb().runSync('UPDATE sessions SET started_at = ? WHERE id = ?', [startedAtISO, sessionId]);
}

/** Any session (finished or still in progress) for a given date — used to resume where you left off. */
export function getSessionForDate(
  dateISO: string
): { id: number; startedAt: string | null; finishedAt: string | null } | null {
  const row = getDb().getFirstSync<{ id: number; started_at: string | null; finished_at: string | null }>(
    'SELECT id, started_at, finished_at FROM sessions WHERE date = ? ORDER BY id DESC LIMIT 1',
    [dateISO]
  );
  if (!row) return null;
  return { id: row.id, startedAt: row.started_at, finishedAt: row.finished_at };
}

export function finishSession(sessionId: number, finishedAtISO: string) {
  getDb().runSync('UPDATE sessions SET finished_at = ? WHERE id = ?', [finishedAtISO, sessionId]);
}

export function addSessionExercise(
  sessionId: number,
  exerciseId: string,
  orderIndex: number,
  effort: EffortLevel | null = null
): number {
  const result = getDb().runSync(
    'INSERT INTO session_exercises (session_id, exercise_id, order_index, effort) VALUES (?, ?, ?, ?)',
    [sessionId, exerciseId, orderIndex, effort]
  );
  return result.lastInsertRowId;
}

export interface SessionExerciseWrite {
  exerciseId: string;
  effort: EffortLevel | null;
  sets: { weightKg: number | null; reps: number | null }[];
}

/**
 * Wholesale-replaces a session's exercises/sets/effort — used both to save a session the first
 * time and to save edits made after it's already finished, so "Finish" never has to be the last
 * word on a session.
 */
export function replaceSessionExercises(sessionId: number, exercises: SessionExerciseWrite[]) {
  getDb().withTransactionSync(() => {
    getDb().runSync(
      `DELETE FROM sets WHERE session_exercise_id IN (SELECT id FROM session_exercises WHERE session_id = ?)`,
      [sessionId]
    );
    getDb().runSync('DELETE FROM session_exercises WHERE session_id = ?', [sessionId]);
    exercises.forEach((ex, orderIndex) => {
      const result = getDb().runSync(
        'INSERT INTO session_exercises (session_id, exercise_id, order_index, effort) VALUES (?, ?, ?, ?)',
        [sessionId, ex.exerciseId, orderIndex, ex.effort]
      );
      const sessionExerciseId = result.lastInsertRowId;
      ex.sets.forEach((set, setIndex) => {
        if (set.weightKg != null || set.reps != null) {
          getDb().runSync(
            'INSERT INTO sets (session_exercise_id, set_index, weight_kg, reps) VALUES (?, ?, ?, ?)',
            [sessionExerciseId, setIndex, set.weightKg, set.reps]
          );
        }
      });
    });
  });
}

export function upsertSet(
  sessionExerciseId: number,
  setIndex: number,
  weightKg: number | null,
  reps: number | null
) {
  const existing = getDb().getFirstSync<{ id: number }>(
    'SELECT id FROM sets WHERE session_exercise_id = ? AND set_index = ?',
    [sessionExerciseId, setIndex]
  );
  if (existing) {
    getDb().runSync('UPDATE sets SET weight_kg = ?, reps = ? WHERE id = ?', [weightKg, reps, existing.id]);
  } else {
    getDb().runSync(
      'INSERT INTO sets (session_exercise_id, set_index, weight_kg, reps) VALUES (?, ?, ?, ?)',
      [sessionExerciseId, setIndex, weightKg, reps]
    );
  }
}

export function getExerciseStats(): Record<string, ExerciseStat> {
  const rows = getDb().getAllSync<{
    exercise_id: string;
    times_done: number;
    last_done_at: string | null;
    best_weight_kg: number | null;
  }>(`
    SELECT
      se.exercise_id AS exercise_id,
      COUNT(DISTINCT se.session_id) AS times_done,
      MAX(s.date) AS last_done_at,
      MAX(st.weight_kg) AS best_weight_kg
    FROM session_exercises se
    JOIN sessions s ON s.id = se.session_id
    LEFT JOIN sets st ON st.session_exercise_id = se.id
    WHERE s.finished_at IS NOT NULL
    GROUP BY se.exercise_id
  `);

  const stats: Record<string, ExerciseStat> = {};
  for (const row of rows) {
    stats[row.exercise_id] = {
      exerciseId: row.exercise_id,
      timesDone: row.times_done,
      lastDoneAt: row.last_done_at,
      bestWeightKg: row.best_weight_kg,
    };
  }
  return stats;
}

export function listSessions(): SessionRow[] {
  return getDb().getAllSync<SessionRow>(
    'SELECT id, date, finished_at FROM sessions WHERE finished_at IS NOT NULL ORDER BY date DESC'
  );
}

export interface SessionExerciseDetail {
  sessionExerciseId: number;
  exerciseId: string;
  effort: EffortLevel | null;
  sets: { setIndex: number; weightKg: number | null; reps: number | null }[];
}

export function getSessionDetail(sessionId: number): SessionExerciseDetail[] {
  const exRows = getDb().getAllSync<{ id: number; exercise_id: string; effort: string | null }>(
    'SELECT id, exercise_id, effort FROM session_exercises WHERE session_id = ? ORDER BY order_index ASC',
    [sessionId]
  );
  return exRows.map((ex) => {
    const sets = getDb()
      .getAllSync<{ set_index: number; weight_kg: number | null; reps: number | null }>(
        'SELECT set_index, weight_kg, reps FROM sets WHERE session_exercise_id = ? ORDER BY set_index ASC',
        [ex.id]
      )
      .map((s) => ({ setIndex: s.set_index, weightKg: s.weight_kg, reps: s.reps }));
    return {
      sessionExerciseId: ex.id,
      exerciseId: ex.exercise_id,
      effort: (ex.effort as EffortLevel | null) ?? null,
      sets,
    };
  });
}

/** Most recent finished log of this exercise, for the "how did it go last time" recall on the Today card. */
export function getPreviousExerciseLog(exerciseId: string): PreviousExerciseLog | null {
  const row = getDb().getFirstSync<{ session_exercise_id: number; date: string; effort: string | null }>(
    `
    SELECT se.id AS session_exercise_id, s.date AS date, se.effort AS effort
    FROM session_exercises se
    JOIN sessions s ON s.id = se.session_id
    WHERE se.exercise_id = ? AND s.finished_at IS NOT NULL
    ORDER BY s.date DESC, s.id DESC
    LIMIT 1
    `,
    [exerciseId]
  );
  if (!row) return null;
  const sets = getDb()
    .getAllSync<{ weight_kg: number | null; reps: number | null }>(
      'SELECT weight_kg, reps FROM sets WHERE session_exercise_id = ? ORDER BY set_index ASC',
      [row.session_exercise_id]
    )
    .map((s) => ({ weightKg: s.weight_kg, reps: s.reps }));
  return { date: row.date, sets, effort: (row.effort as EffortLevel | null) ?? null };
}

export function deleteSession(sessionId: number) {
  getDb().withTransactionSync(() => {
    getDb().runSync(
      `DELETE FROM sets WHERE session_exercise_id IN (
         SELECT id FROM session_exercises WHERE session_id = ?
       )`,
      [sessionId]
    );
    getDb().runSync('DELETE FROM session_exercises WHERE session_id = ?', [sessionId]);
    getDb().runSync('DELETE FROM sessions WHERE id = ?', [sessionId]);
  });
}

export function getExerciseHistory(exerciseId: string): ExerciseHistoryPoint[] {
  const rows = getDb().getAllSync<{ date: string; max_weight_kg: number | null; total_reps: number }>(
    `
    SELECT
      s.date AS date,
      MAX(st.weight_kg) AS max_weight_kg,
      SUM(COALESCE(st.reps, 0)) AS total_reps
    FROM session_exercises se
    JOIN sessions s ON s.id = se.session_id
    LEFT JOIN sets st ON st.session_exercise_id = se.id
    WHERE se.exercise_id = ? AND s.finished_at IS NOT NULL
    GROUP BY s.id
    ORDER BY s.date ASC
    `,
    [exerciseId]
  );
  return rows.map((r) => ({ date: r.date, maxWeightKg: r.max_weight_kg, totalReps: r.total_reps }));
}

export function getLastSessionExerciseIds(): string[] {
  const last = getDb().getFirstSync<{ id: number }>(
    'SELECT id FROM sessions WHERE finished_at IS NOT NULL ORDER BY date DESC LIMIT 1'
  );
  if (!last) return [];
  const rows = getDb().getAllSync<{ exercise_id: string }>(
    'SELECT exercise_id FROM session_exercises WHERE session_id = ?',
    [last.id]
  );
  return rows.map((r) => r.exercise_id);
}

export function getWeeklySchedule(): WeeklySchedule {
  const rows = getDb().getAllSync<{ day_of_week: number; activity: string }>(
    'SELECT day_of_week, activity FROM weekly_schedule'
  );
  const schedule: WeeklySchedule = {};
  for (const row of rows) {
    schedule[row.day_of_week] = row.activity as ScheduleActivity;
  }
  return schedule;
}

export function setDaySchedule(dayOfWeek: number, activity: ScheduleActivity) {
  getDb().runSync(
    `INSERT INTO weekly_schedule (day_of_week, activity) VALUES (?, ?)
     ON CONFLICT(day_of_week) DO UPDATE SET activity = excluded.activity`,
    [dayOfWeek, activity]
  );
}

export function getPlannedSession(dateISO: string): PlannedSession | null {
  const row = getDb().getFirstSync<{ id: number; date: string }>(
    'SELECT id, date FROM planned_sessions WHERE date = ?',
    [dateISO]
  );
  if (!row) return null;
  const exercises = getDb().getAllSync<{ id: number; exercise_id: string; order_index: number }>(
    'SELECT id, exercise_id, order_index FROM planned_session_exercises WHERE planned_session_id = ? ORDER BY order_index ASC',
    [row.id]
  );
  return {
    id: row.id,
    date: row.date,
    exercises: exercises.map((e) => ({ id: e.id, exerciseId: e.exercise_id, orderIndex: e.order_index })),
  };
}

export function createPlannedSession(dateISO: string, exerciseIds: string[]): PlannedSession {
  const result = getDb().runSync('INSERT INTO planned_sessions (date) VALUES (?)', [dateISO]);
  const plannedSessionId = result.lastInsertRowId;
  exerciseIds.forEach((exerciseId, index) => {
    getDb().runSync(
      'INSERT INTO planned_session_exercises (planned_session_id, exercise_id, order_index) VALUES (?, ?, ?)',
      [plannedSessionId, exerciseId, index]
    );
  });
  return getPlannedSession(dateISO)!;
}

/** Replaces a planned session's exercise list wholesale — simpler and safer than granular mutations. */
export function setPlannedSessionExercises(plannedSessionId: number, exerciseIds: string[]) {
  getDb().withTransactionSync(() => {
    getDb().runSync('DELETE FROM planned_session_exercises WHERE planned_session_id = ?', [plannedSessionId]);
    exerciseIds.forEach((exerciseId, index) => {
      getDb().runSync(
        'INSERT INTO planned_session_exercises (planned_session_id, exercise_id, order_index) VALUES (?, ?, ?)',
        [plannedSessionId, exerciseId, index]
      );
    });
  });
}

export function deletePlannedSessionForDate(dateISO: string) {
  const row = getDb().getFirstSync<{ id: number }>('SELECT id FROM planned_sessions WHERE date = ?', [dateISO]);
  if (!row) return;
  getDb().withTransactionSync(() => {
    getDb().runSync('DELETE FROM planned_session_exercises WHERE planned_session_id = ?', [row.id]);
    getDb().runSync('DELETE FROM planned_sessions WHERE id = ?', [row.id]);
  });
}

export function getSessionCountSince(sinceISO: string): number {
  const row = getDb().getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sessions WHERE finished_at IS NOT NULL AND date >= ?',
    [sinceISO]
  );
  return row?.count ?? 0;
}

export function getTotalVolumeSince(sinceISO: string): number {
  const row = getDb().getFirstSync<{ total: number | null }>(
    `
    SELECT SUM(COALESCE(st.weight_kg, 0) * COALESCE(st.reps, 0)) AS total
    FROM sets st
    JOIN session_exercises se ON se.id = st.session_exercise_id
    JOIN sessions s ON s.id = se.session_id
    WHERE s.finished_at IS NOT NULL AND s.date >= ?
    `,
    [sinceISO]
  );
  return row?.total ?? 0;
}

/** All finished session dates, most recent first — used to compute a weekly training streak. */
export function getAllSessionDates(): string[] {
  const rows = getDb().getAllSync<{ date: string }>(
    'SELECT date FROM sessions WHERE finished_at IS NOT NULL ORDER BY date DESC'
  );
  return rows.map((r) => r.date);
}

/** One row per exercise performed since the given date (not deduped) — used for muscle-group balance. */
export function getExerciseIdsSince(sinceISO: string): string[] {
  const rows = getDb().getAllSync<{ exercise_id: string }>(
    `
    SELECT se.exercise_id AS exercise_id
    FROM session_exercises se
    JOIN sessions s ON s.id = se.session_id
    WHERE s.finished_at IS NOT NULL AND s.date >= ?
    `,
    [sinceISO]
  );
  return rows.map((r) => r.exercise_id);
}

export function getLoggedExerciseIds(): string[] {
  const rows = getDb().getAllSync<{ exercise_id: string }>(`
    SELECT DISTINCT se.exercise_id AS exercise_id
    FROM session_exercises se
    JOIN sessions s ON s.id = se.session_id
    WHERE s.finished_at IS NOT NULL
  `);
  return rows.map((r) => r.exercise_id);
}

function rowToVoiceCommandLog(row: {
  id: number;
  created_at: string;
  session_date: string;
  transcript: string;
  intent: string;
  result_summary: string;
  feedback: string | null;
  feedback_note: string | null;
}): VoiceCommandLogRow {
  return {
    id: row.id,
    createdAt: row.created_at,
    sessionDate: row.session_date,
    transcript: row.transcript,
    intent: row.intent as VoiceCommandIntent,
    resultSummary: row.result_summary,
    feedback: (row.feedback as VoiceCommandFeedback | null) ?? null,
    feedbackNote: row.feedback_note,
  };
}

export function logVoiceCommand(
  sessionDate: string,
  transcript: string,
  intent: VoiceCommandIntent,
  resultSummary: string
): number {
  const result = getDb().runSync(
    'INSERT INTO voice_command_logs (created_at, session_date, transcript, intent, result_summary) VALUES (?, ?, ?, ?, ?)',
    [new Date().toISOString(), sessionDate, transcript, intent, resultSummary]
  );
  return result.lastInsertRowId;
}

/** Voice commands from a given day that haven't been rated yet — drives the end-of-session feedback prompt. */
export function getUnratedVoiceCommandsForDate(sessionDate: string): VoiceCommandLogRow[] {
  return getDb()
    .getAllSync<any>(
      'SELECT * FROM voice_command_logs WHERE session_date = ? AND feedback IS NULL ORDER BY id ASC',
      [sessionDate]
    )
    .map(rowToVoiceCommandLog);
}

export function setVoiceCommandFeedback(id: number, feedback: VoiceCommandFeedback, note: string | null) {
  getDb().runSync('UPDATE voice_command_logs SET feedback = ?, feedback_note = ? WHERE id = ?', [
    feedback,
    note,
    id,
  ]);
}

/** All logged voice commands, newest first — used to export a review log. */
export function getAllVoiceCommandLogs(): VoiceCommandLogRow[] {
  return getDb()
    .getAllSync<any>('SELECT * FROM voice_command_logs ORDER BY id DESC')
    .map(rowToVoiceCommandLog);
}

export function setStretchLogCompleted(dateISO: string, completed: boolean) {
  getDb().runSync(
    `INSERT INTO stretch_logs (date, completed) VALUES (?, ?)
     ON CONFLICT(date) DO UPDATE SET completed = excluded.completed`,
    [dateISO, completed ? 1 : 0]
  );
}

export function getStretchLog(dateISO: string): boolean {
  const row = getDb().getFirstSync<{ completed: number }>(
    'SELECT completed FROM stretch_logs WHERE date = ?',
    [dateISO]
  );
  return !!row?.completed;
}

export function getStretchStreak(): number {
  const rows = getDb().getAllSync<{ date: string }>(
    'SELECT date FROM stretch_logs WHERE completed = 1 ORDER BY date DESC'
  );
  const doneDates = new Set(rows.map((r) => r.date));
  let streak = 0;
  const cursor = new Date();
  if (!doneDates.has(cursor.toISOString().slice(0, 10))) {
    // Today not logged yet — don't break an existing streak just because the day isn't over.
    cursor.setDate(cursor.getDate() - 1);
  }
  for (;;) {
    const iso = cursor.toISOString().slice(0, 10);
    if (doneDates.has(iso)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
