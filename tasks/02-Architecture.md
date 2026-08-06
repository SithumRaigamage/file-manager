# 02-Architecture.md — Foundation & Data Layer Tasks

## Repo & Environment

- [x] Confirm/standardize repo structure: `src/main`, `src/renderer`, `src/preload`, `docs/`, `tasks/`.
- [x] Set up ESLint + Prettier + TypeScript strict config shared across main/renderer/preload.
- [x] Configure Vite for Electron renderer build; confirm HMR works with `npm run dev`.

## CI/CD Skeleton

- [x] Set up GitHub Actions (or Jenkins, per `docs/INFRASTRUCTURE.md`) pipeline: lint → type-check → unit test on every PR.
- [x] Add build job producing unsigned macOS/Windows artifacts on merge to main (signing deferred to `07-Launch.md`).

## Local Persistence Layer

- [x] Resolve SQLite vs. JSON decision (see `01-Discovery.md`); implement chosen storage adapter.
- [x] Implement schemas for `RuleSet`, `RenamePattern`, `ConversionPreset`, `BatchRecord`, `AppSettings` per `docs/DATA-MODEL.md`.
- [x] Implement history retention/pruning logic (configurable window, default 90 days).

## IPC Contract Scaffolding

- [x] Implement `contextBridge` preload script exposing `window.fileflow.*` namespace per `docs/API-CONTRACT.md`.
- [x] Implement standard `IpcResponse<T>` envelope + error code enum.
- [x] Implement progress-event channel pattern (`onProgress` subscriptions) for long-running jobs.
- [x] Write integration tests confirming no raw Node.js APIs are reachable from renderer devtools console (security regression test).

## FFmpeg Dependency Setup

- [x] Implement platform detection + bundled-vs-system FFmpeg resolution logic per `docs/INFRASTRUCTURE.md`.
- [x] Implement `FFMPEG_NOT_FOUND` detection and user-facing messaging path.
