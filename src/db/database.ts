import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('cachorro.db');
  }
  return db;
}

export function initDatabase() {
  const database = getDb();
  database.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS session_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      exercise_id TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      effort TEXT
    );

    CREATE TABLE IF NOT EXISTS sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_exercise_id INTEGER NOT NULL,
      set_index INTEGER NOT NULL,
      weight_kg REAL,
      reps INTEGER
    );

    CREATE TABLE IF NOT EXISTS stretch_logs (
      date TEXT PRIMARY KEY,
      completed INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_session_exercises_session ON session_exercises(session_id);
    CREATE INDEX IF NOT EXISTS idx_session_exercises_exercise ON session_exercises(exercise_id);
    CREATE INDEX IF NOT EXISTS idx_sets_session_exercise ON sets(session_exercise_id);
  `);

  // Migration for databases created before the `effort` column existed.
  try {
    database.execSync('ALTER TABLE session_exercises ADD COLUMN effort TEXT');
  } catch {
    // Column already exists.
  }
}
