# SYSTEM-ARCHITECTURE.md

> Note: FileFlow is a local desktop app, not a client-server web app. This document adapts the Universal Blueprint's web-service architecture concepts (services, API contract, database) to Electron's main/renderer process model and local file-based storage.

## High-Level Architecture

```
┌─────────────────────────────┐         IPC (context-isolated)        ┌──────────────────────────────┐
│   Renderer Process (UI)     │ <────────────────────────────────────> │   Main Process (Node.js)     │
│   React 19 + TS + Vite      │         contextBridge / preload        │   File I/O, FFmpeg, rules     │
│   Zustand state             │                                        │   engine, job queue           │
└─────────────────────────────┘                                        └──────────────────────────────┘
                                                                                    │
                                                                                    ▼
                                                                         ┌────────────────────┐
                                                                         │  Local file system  │
                                                                         │  + local config/db   │
                                                                         │  (SQLite or JSON)     │
                                                                         └────────────────────┘
                                                                                    │
                                                                                    ▼
                                                                         ┌────────────────────┐
                                                                         │   FFmpeg (bundled    │
                                                                         │   or system binary)   │
                                                                         └────────────────────┘
```

## Services (Main Process Modules)

- **Rules Engine**: evaluates Organizer conditions (Quick Rules + Smart Rules) against file metadata.
- **Rename Engine**: builds and validates rename patterns, detects conflicts, generates preview diffs.
- **Conversion Engine**: manages FFmpeg child processes, job queue, progress reporting.
- **Watcher Service**: file-system watcher (chokidar or native fs.watch) for Organizer's auto mode.
- **Undo/History Service**: append-only log of batch operations, enabling reversal.

## Frontend

React 19 SPA rendered in Electron's renderer process; no server-side rendering needed. State managed via Zustand stores per domain (organizer, renamer, converter, history).

## Authentication

Not applicable for MVP — FileFlow is a single-user local desktop app with no accounts. If cloud sync or license activation is added later (see RISKS.md monetization dependency), a lightweight local license-key validation would be introduced without a full auth/session system.

## Storage

No traditional database. Local persistent state (rule sets, rename patterns, undo history, app settings) stored in a local SQLite file or structured JSON under the OS-appropriate app-data directory. See DATA-MODEL.md for schema.

## Caching

Thumbnail/preview caching for file lists (especially large folders) to avoid re-reading file metadata on every render; invalidated on file-system change events.

## Background Jobs

FFmpeg conversions and large batch renames/organizes run as background jobs in the main process, reporting progress via IPC events so the renderer never blocks.

## Search

Local, in-memory filtering/search over the currently loaded file list (by name, extension, date) — no external search index needed at this scale.

## Notifications

OS-native notifications (Electron `Notification` API) for job completion/failure, especially for long-running conversion batches that may run while the window isn't focused.

## Analytics & Logging

- Local structured logs (rotated) for debugging, not sent externally by default (privacy-first, per PROJECT-VISION positioning against cloud-AI competitors).
- Optional, explicitly opt-in anonymous usage analytics post-MVP, never default-on.

## Monitoring

Desktop crash reporting (e.g., Electron's built-in crashReporter) — opt-in, surfaced clearly in onboarding/settings, not silent telemetry.

## Security

- Context-isolated IPC bridge (contextIsolation: true, nodeIntegration: false in renderer) — no direct Node.js access from untrusted renderer code.
- All file-system and FFmpeg operations happen only in the main process, invoked via a narrow, explicit preload API surface (see API-CONTRACT.md for the IPC contract).
- Input validation on all IPC payloads (file paths, rule definitions) before they reach file-system or child-process calls, to prevent path traversal or command injection into FFmpeg args.

## Scalability (Desktop Context)

"Scalability" here means: handling large local batches (10,000+ files) without UI freeze or excessive memory use — achieved via streaming IPC updates, chunked file-list rendering (virtualized lists), and worker-limited FFmpeg concurrency rather than horizontal server scaling.

## Deployment

Electron Builder packages produce signed installers/binaries for macOS (.dmg) and Windows (.exe/.msi). See INFRASTRUCTURE.md for CI/CD pipeline detail.

## Testing Strategy

See `tasks/06-Testing.md`. Summary: unit tests for rules/rename/conversion engines (pure logic, easily testable in isolation from Electron), integration tests for IPC contract, and manual/automated smoke tests for the packaged installers on both platforms.

## Modular Architecture (adopted at MVP time for v2.0+ readiness)

Per `docs/PLATFORM-FEATURES-V2.md`, the codebase is structured as feature modules from day one rather than a flat main-process folder, so v2.0+ features (duplicate finder, AI organizer, PDF toolkit, plugins, etc.) can be added without restructuring MVP code:

```
src/
  main/
    features/
      organizer/        (Rules Engine, Watcher Service)
      renamer/           (Rename Engine)
      converter/         (Conversion Engine, FFmpeg wrapper)
      history/           (Undo/History Service — command/event architecture, see TECH-STACK.md)
      [future: duplicates/, search/, tagging/, ai/, plugins/, cloud/ — added per phase, same pattern]
    domain/              (pure business logic, no Electron/IPC imports — testable in isolation)
    ipc/                 (preload bridge + IPC handler registration only — thin layer over domain/features)
    scheduler/           (persistent job queue — see TECH-STACK.md, supports v2.1 Scheduled Tasks)
  renderer/
    features/            (mirrors main-process feature boundaries: organizer/, renamer/, converter/, dashboard/, etc.)
    shared/              (before/after preview component, design-system primitives)
  preload/
```

**Domain layer rule**: business logic (rule evaluation, rename pattern application, conflict detection) lives in `domain/` with zero Electron imports, so it can be unit-tested without spinning up Electron and is reusable if a future module (e.g., a plugin, or a CLI) needs the same logic.

**IPC layer rule**: `ipc/` handlers are thin — they validate/deserialize, call into `features/*` or `domain/*`, and serialize the response per `docs/API-CONTRACT.md`. No business logic lives in the IPC layer itself.

## Plugin Architecture (design shaped now, built in v2.4)

Per `docs/PLATFORM-FEATURES-V2.md`, the plugin system is not implemented at MVP time, but the module boundaries above are chosen specifically so a future `features/plugins/` module can host a **capability-based permission model** — a plugin manifest declares exactly which domains it needs (e.g., `filesystem:read`, `ffmpeg:invoke`) and the plugin host grants only those, mirroring the same context-isolation principle already applied to the renderer (see Security section above). This is a design constraint on today's architecture, not a v2.4 task, so it's noted here rather than deferred silently.
