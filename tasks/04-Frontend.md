# 04-Frontend.md — Renderer / React App

## Foundation

- [ ] Initialize React 19 + TypeScript + Vite renderer app (already scaffolded per project — confirm structure matches `docs/SYSTEM-ARCHITECTURE.md`).
- [ ] Configure Tailwind CSS v4 + base theme CSS variables per `docs/DESIGN-SYSTEM.md`.
- [ ] Wrap shadcn/ui primitives into FileFlow-branded base components (Button, Dialog, Table, Command, Progress).
- [ ] Set up Zustand stores per domain: organizer, renamer, converter, history, settings.

## App Shell

- [ ] Left rail navigation: Organize / Rename / Convert / Recent Folders / Undo History.
- [ ] Main pane: virtualized file-list component (handles 10k+ entries without jank per `docs/API-CONTRACT.md` performance notes).
- [ ] Right contextual panel: rule/pattern/preset builder per active mode.
- [ ] Shared before/after preview row component (single implementation reused across all three tools).
- [ ] Empty/Loading/Error state components per `docs/USER-EXPERIENCE.md`.

## Organizer UI

- [ ] Quick Rules one-click buttons (Images/Videos/Docs/Archives).
- [ ] Smart Rule builder form (condition rows, AND/OR toggle) — MVP subset.
- [ ] Conflict resolution dialog (rename/skip/overwrite).
- [ ] Auto Mode toggle + watched-folder indicator.

## Renamer UI

- [ ] Pattern step builder (numbering, prefix/suffix, find & replace, date insert) with live preview column.
- [ ] Conflict flags inline in preview list.
- [ ] Commit + Undo affordance.

## Converter UI

- [ ] Batch queue view with per-file progress bars + aggregate progress.
- [ ] Preset selector (Web/Small, Balanced, Archival).
- [ ] Cancel-per-job control.
- [ ] Inline per-file error display (corrupt/unsupported input).

## Cross-Cutting UI

- [ ] Command palette (Cmd/Ctrl+K) for mode-switching and recent folders (Should Have, not MVP-blocking — confirm against `03-MVP.md` before committing time).
- [ ] Dark/light theme toggle wired to CSS variables + OS appearance detection.
- [ ] Reduced-motion setting wired to Framer Motion transitions app-wide.
- [ ] Undo/History view (filterable by operation type).

## API Client / IPC Wiring

- [ ] Implement typed wrapper around `window.fileflow.*` matching `docs/API-CONTRACT.md` exactly (no ad hoc IPC calls outside this wrapper).
- [ ] Implement global error handling/toast surface for `IpcResponse` error envelopes.
- [ ] Implement progress-event subscription hooks (React hooks wrapping `onProgress`).
