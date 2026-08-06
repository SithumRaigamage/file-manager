# FEATURE-SPECIFICATION.md

## 1. Smart File Organizer

### User Story

As a user with a cluttered folder, I want files automatically sorted into categorized folders by type, so I don't have to move them manually.

**Acceptance Criteria**

- Given a watched folder, when a new file appears, then it is matched against rules (Quick Rules first, Smart Rules if configured) and moved/copied within [defined SLA, e.g. 2s] of appearing.
- User can preview the proposed destination for every file before applying (live preview), matching the "preview-before-apply" baseline the competitive research shows users expect (Bulk Rename Utility, File Arbor).
- Quick Rules (one-click): sort by common type — Images, Videos, Docs, Archives — with zero configuration.
- Smart Rules: user-defined conditions (extension, name pattern/regex, size, date) combined with AND/OR logic, mirroring Hazel's conditions+actions model but cross-platform.
- Conflict handling: if destination file already exists, user is prompted with rename/skip/overwrite options — never silently overwritten.

**Edge Cases**

- Locked/in-use files (e.g., mid-download) must not be moved prematurely — needs file-stability check (e.g., size unchanged across N polls) before acting.
- Symlinks and system files are excluded by default.
- Circular rule conflicts (rule A moves into folder that rule B watches) must be detected and surfaced, not silently looped.

---

## 2. Professional Bulk Renamer

### User Story

As a user with hundreds of files to rename consistently, I want to apply a pattern (numbering, prefix/suffix, find & replace, date) across a batch, with a safe way to undo if something goes wrong.

**Acceptance Criteria**

- Live preview of old name → new name for every selected file before commit (matches Bulk Rename Utility / ABFR baseline).
- Supported patterns at MVP: sequential numbering (with configurable start/padding), prefix/suffix insertion, find & replace (plain text), date/time insertion (from file metadata).
- Conflict detection: if a proposed rename collides with an existing filename (including another file in the same batch), it is flagged before commit, not after.
- Smart undo: a single action reverts the entire batch rename operation, even after the app has been closed and reopened in the same session history window.

**Edge Cases**

- Renaming across mixed file systems (case-sensitive vs. case-insensitive) must not silently produce collisions.
- Extremely large batches (10,000+ files) must not block the UI thread — must run on the Node.js backend process, streaming progress back to the renderer.
- Regex-based find & replace (V1.1, not MVP) needs a "test on 3 sample files" affordance before running on the full batch.

---

## 3. High-Speed File Converter

### User Story

As a user with a folder of client video/audio files, I want to batch-convert them to a target format and quality with FFmpeg, without touching a command line.

**Acceptance Criteria**

- Supported input/output formats at MVP: MP4, MKV, MOV (video); MP3, WAV, AAC (audio) — matching the common set covered by HandBrake/XMedia Recode.
- Quality presets (e.g., "Web/Small", "Balanced", "Archival/Max Quality") abstract away raw FFmpeg flags, matching HandBrake's preset-first philosophy.
- Batch queue: multiple files process sequentially (or in parallel up to a configurable worker count) with per-file progress and the ability to cancel individual jobs without killing the whole queue.
- Conversion runs in the Node.js main/utility process via FFmpeg child process — never blocks the renderer UI.

**Edge Cases**

- Corrupt or unsupported input files must fail gracefully with a clear per-file error, not halt the whole batch.
- Disk space check before starting a large batch (estimate output size vs. available space).
- FFmpeg binary must be located/bundled per-platform (see INFRASTRUCTURE.md) — app must fail with a clear message if FFmpeg is missing/unreachable, not crash silently.

---

## Cross-Feature Requirements

- All three tools share one consistent preview-then-commit interaction pattern (see DESIGN-SYSTEM.md) — this is a deliberate differentiation point since no competitor unifies preview UX across operation types.
- All destructive operations (move, rename, convert-and-replace) must be undoable or produce a non-destructive copy by default, configurable in settings.
