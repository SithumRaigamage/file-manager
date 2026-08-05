# 05-Backend.md — Main Process Engines

> Note: numbered per Universal Blueprint convention, but sequenced _before_ `04-Frontend.md` in actual build order — see dependency note in `00-MASTER-ROADMAP.md`.

## Rules Engine (Organizer)

- [ ] Implement Quick Rule matchers (extension-based categorization for Images/Videos/Docs/Archives).
- [ ] Implement Smart Rule condition evaluator (extension, name pattern, size, date; AND/OR combination) — MVP subset per `docs/DATA-MODEL.md` phasing.
- [ ] Implement file-stability check (avoid acting on in-progress downloads/writes).
- [ ] Implement circular-rule-conflict detection.

## Watcher Service

- [ ] Integrate chokidar for cross-platform folder watching.
- [ ] Implement watcher lifecycle management (`watchFolder` / `unwatchFolder`) tied to `RuleSet.watchedFolder`.
- [ ] Handle OS watch-handle-limit failures with graceful fallback (see `docs/INTEGRATIONS.md`).

## Rename Engine

- [ ] Implement pattern steps: numbering, prefix/suffix, find & replace, date insertion.
- [ ] Implement preview-diff generation (old → new name per file).
- [ ] Implement conflict detection (intra-batch + destination collisions, case-sensitivity aware).
- [ ] Implement batch commit + reversible undo log entry.

## Conversion Engine

- [ ] Implement FFmpeg child-process wrapper with preset-to-flag mapping (never raw user-injected flag strings — validate against allow-listed preset definitions).
- [ ] Implement job queue with configurable concurrency.
- [ ] Implement per-file progress parsing from FFmpeg output, streamed via IPC progress events.
- [ ] Implement disk-space pre-flight check before large batch starts.
- [ ] Implement cancel-single-job-without-killing-queue behavior.

## Undo/History Service

- [ ] Implement append-only `BatchRecord` log writer for all three engines.
- [ ] Implement `revertBatch` logic per operation type (move-back for organize, rename-back for renamer; convert is non-reversible by nature — document this clearly in UI copy, not just code).
- [ ] Implement retention/pruning per `docs/DATA-MODEL.md`.

## Security Hardening

- [ ] Validate all IPC payload paths against path-traversal patterns before any file-system or FFmpeg call.
- [ ] Confirm `contextIsolation: true` / `nodeIntegration: false` enforced in Electron BrowserWindow config (regression-tested per `02-Architecture.md`).
