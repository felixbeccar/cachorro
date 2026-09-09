import { getDb } from './database';
import { ExerciseHistoryPoint, ExerciseStat, SessionRow } from '../types';

export function createSession(dateISO: string): number {
  const result = getDb().runSync('INSERT INTO sessions (date) VALUES (?)', [dateISO]);
  return result.lastInsertRowId;
}

export function finishSession(sessionId: number, finishedAtISO: string) {
  getDb().runSync('UPDATE sessions SET finished_at = ? WHERE id = ?', [finishedAtISO, sessionId]);
}

export function addSessionExercise(sessionId: number, exerciseId: string, orderIndex: number): number {
  const result = getDb().runSync(
    'INSERT INTO session_exercises (session_id, exercise_id, order_index) VALUES (?, ?, ?)',
    [sessionId, exerciseId, orderIndex]
  );
  return result.lastInsertRowId;
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
  sets: { setIndex: number; weightKg: number | null; reps: number | null }[];
}

export function getSessionDetail(sessionId: number): SessionExerciseDetail[] {
  const exRows = getDb().getAllSync<{ id: number; exercise_id: string }>(
    'SELECT id, exercise_id FROM session_exercises WHERE session_id = ? ORDER BY order_index ASC',
    [sessionId]
  );
  return exRows.map((ex) => {
    const sets = getDb()
      .getAllSync<{ set_index: number; weight_kg: number | null; reps: number | null }>(
        'SELECT set_index, weight_kg, reps FROM sets WHERE session_exercise_id = ? ORDER BY set_index ASC',
        [ex.id]
      )
      .map((s) => ({ setIndex: s.set_index, weightKg: s.weight_kg, reps: s.reps }));
    return { sessionExerciseId: ex.id, exerciseId: ex.exercise_id, sets };
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

export function getLoggedExerciseIds(): string[] {
  const rows = getDb().getAllSync<{ exercise_id: string }>(`
    SELECT DISTINCT se.exercise_id AS exercise_id
    FROM session_exercises se
    JOIN sessions s ON s.id = se.session_id
    WHERE s.finished_at IS NOT NULL
  `);
  return rows.map((r) => r.exercise_id);
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
