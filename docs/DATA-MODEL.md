# DATA-MODEL.md

> Adaptation note: FileFlow has no remote database. "Data model" here refers to local persisted state (SQLite or structured JSON under the OS app-data directory, per TECH-STACK.md open question) — rule sets, rename patterns, presets, and undo/history logs. The actual "records" being organized are files on disk, not database rows.

## Core Entities

### `RuleSet` (Organizer)

```ts
{
  id: string;
  name: string;
  type: "quick" | "smart";
  quickRuleId?: "images" | "videos" | "docs" | "archives";
  conditions?: SmartCondition[]; // for type: "smart"
  conditionLogic?: "AND" | "OR";
  action: { type: "move" | "copy"; destination: string };
  watchedFolder?: string; // present if used in Auto Mode
  createdAt: string; // ISO date
}
```

### `RenamePattern`

```ts
{
  id: string;
  name: string;
  steps: RenameStep[]; // ordered: numbering, prefix/suffix, find&replace, date-insert
  createdAt: string;
}
```

### `ConversionPreset`

```ts
{
  id: string;
  name: string; // e.g. "Web/Small", "Balanced", "Archival"
  targetContainer: "mp4" | "mkv" | "mp3" | "wav" | "aac";
  ffmpegArgs: string[]; // validated, never raw user-injected string
}
```

### `BatchRecord` (Undo/History)

```ts
{
  id: string
  type: 'organize' | 'rename' | 'convert'
  timestamp: string
  items: Array<{ before: string; after: string; status: 'success' | 'skipped' | 'failed' }>
  reversible: boolean
}
```

### `AppSettings`

```ts
{
  ffmpegPath: string | null // bundled path or user-configured system path
  defaultDestructiveBehavior: 'prompt' | 'always-copy'
  reducedMotion: boolean
  telemetryOptIn: boolean // default false, see SYSTEM-ARCHITECTURE.md
}
```

## Indexing Strategy

- `BatchRecord` indexed by `timestamp` (descending) for the Undo History view, and by `type` for filtered history views.
- `RuleSet.watchedFolder` indexed for fast lookup when the Watcher Service needs to match an incoming file-change event to its owning rule set.

## Data Integrity

- **Orphaned watchers**: if a `watchedFolder` is deleted/moved outside the app, the Watcher Service must detect the failure and mark the `RuleSet` as `inactive` rather than silently failing.
- **Duplicate/conflicting rule sets**: two active `RuleSet`s watching the same folder with overlapping conditions must be flagged to the user at creation time (see FEATURE-SPECIFICATION.md Organizer edge cases).
- **History cleanup**: `BatchRecord` entries older than a configurable retention window (e.g. 90 days) are pruned automatically to avoid unbounded local storage growth, with a setting to disable auto-pruning for users who want a permanent audit log.

## Phasing

- **MVP**: `RuleSet` (quick rules only + basic smart conditions), `RenamePattern`, `ConversionPreset`, `BatchRecord`, `AppSettings`. Persisted in **SQLite via Drizzle ORM** (see TECH-STACK.md — this supersedes the earlier SQLite-vs-JSON open question).
- **Deferred to V1.1**: nested/grouped Smart Rule conditions (complex AND/OR trees), regex-based find & replace validation layer.
- **Deferred to v2.0+ (see `docs/PLATFORM-FEATURES-V2.md` for full feature-to-phase mapping)**: additional entities anticipated —
  - `Workflow` (v2.1): chains `RuleSet` → `RenamePattern` → `ConversionPreset` as a saved pipeline.
  - `DuplicateGroup` (v2.0): hash/perceptual-hash clusters of files identified as exact or near-duplicates, with resolution status (kept/deleted/merged).
  - `SearchIndexEntry` (v2.0): indexed metadata/content per file to power Advanced Search without re-scanning on every query.
  - `Tag` and `FileTag` (v2.2): many-to-many virtual tags independent of folder structure.
  - `Workspace` (v2.4): named, pinned folder collections for one-click context switching.
  - `PluginManifest` (v2.4): declared capabilities/permissions per installed plugin (see SYSTEM-ARCHITECTURE.md Plugin Architecture).
  - These are **not implemented at MVP time** — they're listed here so the MVP schema (especially `BatchRecord`'s command/event shape, see TECH-STACK.md) is designed with enough headroom that adding them later is additive, not a migration/rewrite.
