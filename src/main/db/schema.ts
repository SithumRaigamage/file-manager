import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';

export const ruleSets = sqliteTable('rule_sets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['quick', 'smart'] }).notNull(),
  quickRuleId: text('quick_rule_id', { enum: ['images', 'videos', 'docs', 'archives'] }),
  conditions: blob('conditions', { mode: 'json' }), // SmartCondition[]
  conditionLogic: text('condition_logic', { enum: ['AND', 'OR'] }),
  action: blob('action', { mode: 'json' }).notNull(), // { type: 'move' | 'copy', destination: string }
  watchedFolder: text('watched_folder'),
  createdAt: text('created_at').notNull(), // ISO date
});

export const renamePatterns = sqliteTable('rename_patterns', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  steps: blob('steps', { mode: 'json' }).notNull(), // RenameStep[]
  createdAt: text('created_at').notNull(),
});

export const conversionPresets = sqliteTable('conversion_presets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  targetContainer: text('target_container', { enum: ['mp4', 'mkv', 'mp3', 'wav', 'aac'] }).notNull(),
  ffmpegArgs: blob('ffmpeg_args', { mode: 'json' }).notNull(), // string[]
});

export const batchRecords = sqliteTable('batch_records', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['organize', 'rename', 'convert'] }).notNull(),
  timestamp: text('timestamp').notNull(),
  items: blob('items', { mode: 'json' }).notNull(), // Array<{ before: string; after: string; status: 'success' | 'skipped' | 'failed' }>
  reversible: integer('reversible', { mode: 'boolean' }).notNull(),
});

export const duplicateGroups = sqliteTable('duplicate_groups', {
  id: text('id').primaryKey(),
  hash: text('hash').notNull(),
  size: integer('size').notNull(),
  files: blob('files', { mode: 'json' }).notNull(), // Array<{ path: string; lastModified: number }>
  status: text('status', { enum: ['pending', 'resolved'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull(),
});

export const appSettings = sqliteTable('app_settings', {
  id: text('id').primaryKey(), // We can just use a single row id like 'default'
  ffmpegPath: text('ffmpeg_path'), // null or string
  defaultDestructiveBehavior: text('default_destructive_behavior', { enum: ['prompt', 'always-copy'] }).notNull().default('prompt'),
  reducedMotion: integer('reduced_motion', { mode: 'boolean' }).notNull().default(false),
  telemetryOptIn: integer('telemetry_opt_in', { mode: 'boolean' }).notNull().default(false),
  crashReportingOptIn: integer('crash_reporting_opt_in', { mode: 'boolean' }).notNull().default(false),
  historyRetentionDays: integer('history_retention_days').notNull().default(90),
});
