# CLAUDE.md

This file governs how Claude (via Claude Code) should work in this repository. It sits alongside `docs/` and `tasks/`, which are the source of truth for what to build and why. This file is about _how_ to work, not what to build.

## What This Project Is

FileFlow is a cross-platform (Windows + macOS) desktop file-management application, built with Electron + React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui + Framer Motion + Zustand. MVP scope is three tools — Smart File Organizer, Professional Bulk Renamer, High-Speed File Converter — with a validated post-MVP roadmap (v2.0–v3.0) expanding it into a full file productivity platform. See `docs/PROJECT-VISION.md` and `docs/PLATFORM-FEATURES-V2.md` for the full picture.

## Before Writing Any Code

1. **Read `docs/` before touching `src/`.** Every architectural decision (why SQLite+Drizzle, why context-isolated IPC, why modular feature folders) is documented with rationale in `docs/`. Don't re-derive or second-guess these without checking the doc first — if something in `docs/` seems wrong, flag it and propose an update rather than silently diverging in code.
2. **Check `tasks/` for the current phase.** Work should map to a checklist item in the active task file (`tasks/03-MVP.md` for MVP work, `tasks/0X-...` for later phases). Don't pull work forward from a later phase without an explicit instruction to do so — this project has already had one scope-expansion pass (see `docs/CHANGELOG.md`, 2026-08-05 entry) and deliberately re-affirmed MVP boundaries against it.
3. **Never skip the docs update.** Per `docs/CHANGELOG.md`'s template, any non-trivial architectural decision, scope change, or research finding made during implementation gets logged there and reflected in the relevant `docs/*.md` file. Documentation is the source of truth, not a historical record — keep it current, not just append-only.

## Architecture Rules (non-negotiable, from `docs/SYSTEM-ARCHITECTURE.md`)

- **Context isolation is mandatory.** `contextIsolation: true`, `nodeIntegration: false` in every `BrowserWindow`. All renderer↔main communication goes through the `contextBridge` preload API defined in `docs/API-CONTRACT.md`. Never expose raw Node.js APIs to the renderer, even temporarily for debugging.
- **Domain layer has zero Electron imports.** Business logic (rule evaluation, rename pattern application, conflict detection, conversion preset validation) lives in `src/main/domain/` and must be unit-testable without spinning up Electron. If you find yourself importing `electron` in a domain file, stop and move the Electron-specific glue into `src/main/ipc/` or `src/main/features/*` instead.
- **IPC handlers are thin.** They validate/deserialize the payload, call into `domain/` or `features/*`, and shape the response into the `IpcResponse<T>` envelope from `docs/API-CONTRACT.md`. No business logic in the IPC layer itself.
- **All FFmpeg invocations use allow-listed preset definitions.** Never construct FFmpeg command strings from raw user input — see the `ConversionPreset.ffmpegArgs` shape in `docs/DATA-MODEL.md` and the injection-prevention note in `docs/SYSTEM-ARCHITECTURE.md`.
- **Every destructive operation (move, rename, delete, overwrite) must be previewable and undoable**, following the shared before/after preview component pattern from `docs/DESIGN-SYSTEM.md`. This is the single most trust-critical property of the app (see `docs/PROJECT-VISION.md` success metrics and `docs/RISKS.md`) — do not ship a destructive action without both preview and undo, even for "obviously simple" cases.
- **Follow the modular feature-folder structure** from `docs/SYSTEM-ARCHITECTURE.md` (`src/main/features/<domain>/`, mirrored in `src/renderer/features/<domain>/`) from the very first commit, even for MVP-only code — this is what makes the v2.0+ roadmap additive instead of a rewrite.

## Coding Conventions

- TypeScript strict mode everywhere (main, renderer, preload).
- Tailwind utility classes composed through the shared patterns in `docs/DESIGN-SYSTEM.md` (`card`, `row-hover`, `status-badge`, etc.) rather than repeated ad hoc utility strings.
- shadcn/ui primitives are wrapped into FileFlow-branded base components, never used unstyled directly in feature code.
- All persisted data goes through the SQLite + Drizzle schema defined incrementally per `docs/DATA-MODEL.md` — no parallel ad hoc JSON files for state that belongs in the database.
- Respect `prefers-reduced-motion` and the in-app `AppSettings.reducedMotion` flag in every Framer Motion animation.

## Testing Expectations

Match `docs/SYSTEM-ARCHITECTURE.md` Testing Strategy and `tasks/06-Testing.md`:

- Unit tests for anything in `domain/` (rules, rename patterns, conflict detection, preset validation) — these should be fast and not require Electron.
- Integration tests for the IPC contract itself (round-trip every action in `docs/API-CONTRACT.md`).
- A security regression test confirming no Node.js globals are reachable from the renderer devtools console — re-run this whenever preload/IPC code changes.

## When Requirements Are Ambiguous

Default to what's already decided in `docs/` and `tasks/`. If a decision is explicitly flagged as open (see `docs/TECH-STACK.md`, `docs/RISKS.md` open-decision lists), don't silently pick one — surface the tradeoff and ask, or make the most reversible choice and note it in `docs/CHANGELOG.md` as a provisional decision.

## Definition of Done (per task)

A checklist item in `tasks/*.md` is done when:

1. The behavior matches its acceptance criteria in `docs/FEATURE-SPECIFICATION.md` (or the relevant phase doc for v2.0+ work).
2. Unit/integration tests exist per the Testing Expectations above.
3. Any new architectural decision or deviation from `docs/` is reflected back into `docs/` and logged in `docs/CHANGELOG.md`.
4. The checklist item is marked complete in its `tasks/*.md` file.
