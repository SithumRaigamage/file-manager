import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';
import { app } from 'electron';

// When running in tests or outside of Electron runtime, `app` might be undefined.
const userDataPath = app ? app.getPath('userData') : process.cwd();
const dbPath = path.join(userDataPath, 'fileflow.db');

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

// Initialize tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS rule_sets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    quick_rule_id TEXT,
    conditions TEXT,
    condition_logic TEXT,
    action TEXT NOT NULL,
    watched_folder TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rename_patterns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    steps TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversion_presets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_container TEXT NOT NULL,
    ffmpeg_args TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS batch_records (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    items TEXT NOT NULL,
    reversible INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY,
    ffmpeg_path TEXT,
    default_destructive_behavior TEXT NOT NULL DEFAULT 'prompt',
    reduced_motion INTEGER NOT NULL DEFAULT 0,
    telemetry_opt_in INTEGER NOT NULL DEFAULT 0,
    crash_reporting_opt_in INTEGER NOT NULL DEFAULT 0,
    history_retention_days INTEGER NOT NULL DEFAULT 90
  );

  CREATE TABLE IF NOT EXISTS duplicate_groups (
    id TEXT PRIMARY KEY,
    hash TEXT NOT NULL,
    size INTEGER NOT NULL,
    files TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_batch_records_timestamp ON batch_records(timestamp);

  CREATE TABLE IF NOT EXISTS search_index (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    extension TEXT NOT NULL,
    size INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_directory INTEGER NOT NULL DEFAULT 0,
    metadata TEXT
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS search_index_fts USING fts5(
    filename, path, content='search_index', content_rowid='rowid'
  );

  -- Triggers to keep FTS index up to date
  CREATE TRIGGER IF NOT EXISTS search_index_ai AFTER INSERT ON search_index BEGIN
    INSERT INTO search_index_fts(rowid, filename, path) VALUES (new.rowid, new.filename, new.path);
  END;
  CREATE TRIGGER IF NOT EXISTS search_index_ad AFTER DELETE ON search_index BEGIN
    INSERT INTO search_index_fts(search_index_fts, rowid, filename, path) VALUES('delete', old.rowid, old.filename, old.path);
  END;
  CREATE TRIGGER IF NOT EXISTS search_index_au AFTER UPDATE ON search_index BEGIN
    INSERT INTO search_index_fts(search_index_fts, rowid, filename, path) VALUES('delete', old.rowid, old.filename, old.path);
    INSERT INTO search_index_fts(rowid, filename, path) VALUES (new.rowid, new.filename, new.path);
  END;
`);

// Lightweight migration for new columns
try {
  sqlite.exec(`ALTER TABLE app_settings ADD COLUMN crash_reporting_opt_in INTEGER NOT NULL DEFAULT 0;`);
} catch (error: any) {
  // Ignore error if column already exists
  if (!error.message.includes('duplicate column name')) {
    console.warn('Failed to migrate app_settings:', error.message);
  }
}

export const db = drizzle(sqlite, { schema });
