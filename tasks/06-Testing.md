# 06-Testing.md — QA, Automation, Performance, Security

## Unit Tests

- [ ] Rules Engine: Quick Rule matchers, Smart Rule condition evaluation (AND/OR), edge cases (locked files, symlinks).
- [ ] Rename Engine: pattern step application, conflict detection (intra-batch + destination), case-sensitivity edge cases.
- [ ] Conversion Engine: preset-to-FFmpeg-flag mapping validation, disk-space estimate logic.
- [ ] Data layer: `BatchRecord` retention/pruning logic.

## Integration Tests

- [ ] Full IPC contract round-trip tests for every `fileflow.*` action in `docs/API-CONTRACT.md`.
- [ ] Progress-event streaming correctness under simulated large-batch load.
- [ ] Security regression: confirm no Node.js globals reachable from renderer devtools console.
- [ ] Path-traversal / injection attempt tests against IPC payload validation.

## Performance Tests

- [ ] Folder listing + preview generation for 10,000+ file folders — confirm no UI thread block (target frame budget, e.g. no dropped frames > [threshold]).
- [ ] Batch rename/organize of 1,000+ files completes without freeze (ties to `docs/PROJECT-VISION.md` success metric).
- [ ] Conversion queue under configurable concurrency — confirm CPU/memory stays within acceptable bounds on reference low-end hardware.

## Cross-Platform Smoke Tests

- [ ] Packaged macOS .dmg: install, launch, run one operation from each of the three tools.
- [ ] Packaged Windows .exe/.msi: same smoke test.
- [ ] FFmpeg detection/fallback messaging verified on both platforms (bundled and system-install scenarios).

## Manual QA Pass

- [ ] Keyboard-only pass through all three tools' core flows (accessibility requirement, `docs/USER-EXPERIENCE.md`).
- [ ] Reduced-motion setting verified to disable non-essential animations.
- [ ] Undo correctness verified manually for at least one real-world messy folder per tool (dogfooding pass before beta).
