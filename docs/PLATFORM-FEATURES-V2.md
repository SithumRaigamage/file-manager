# PLATFORM-FEATURES-V2.md

> Source: founder-provided "FileFlow v2.0 — Professional File Management Suite" vision. This document organizes the 40 proposed features into the phased roadmap defined in `docs/PRODUCT-STRATEGY.md`, with brief spec notes. Full acceptance-criteria-level specs (matching the depth of `docs/FEATURE-SPECIFICATION.md`) should be written per-feature immediately before its phase begins, not all upfront — per VentureForge Phase 9, documentation should track current work, not speculative future work in exhaustive detail.

## v2.0 — Platform Foundation (Dashboard, Search, Duplicates, Previews)

| #   | Feature                    | Notes                                                                                                                                                                                                                                                                                                                        |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Dashboard**              | Replaces direct-to-tools launch. Widgets: storage overview, top file types, recent jobs, active jobs, favorite folders, weekly stats. This becomes the new default landing view — Organize/Rename/Convert become entry points _from_ the dashboard, not the app's root.                                                      |
| 3   | **Smart Duplicate Finder** | Exact (hash-based) + near-duplicate (perceptual hashing for images, similar approach for video/audio) detection. Must reuse the existing preview-then-commit pattern (see DESIGN-SYSTEM.md) for delete/move/merge actions — this is a destructive-operation category and inherits all the safety requirements from RISKS.md. |
| 4   | **Large File Analyzer**    | Interactive treemap + charts (largest folders/files, old/unused files). Read-only analytics view; no new destructive-operation risk.                                                                                                                                                                                         |
| 5   | **Advanced Search Engine** | Instant indexing, regex/wildcard, metadata/content search, saved searches. Requires a genuine search index (see DATA-MODEL.md `SearchIndexEntry`), not naive re-scanning per query — this is the first feature requiring background indexing infrastructure.                                                                 |
| 11  | **File Preview System**    | Preview video/audio/office/code/images/PDF/3D without opening external apps. Natural extension of the existing before/after preview component philosophy.                                                                                                                                                                    |
| 25  | **Multi-tab Explorer**     | Tabs, split/dual/quad pane, drag between panes. Significant renderer-state complexity increase — needs its own Zustand store design pass before implementation.                                                                                                                                                              |

## v2.1 — Automation Depth

| #   | Feature                                 | Notes                                                                                                                                                                                                                   |
| --- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12  | **Workflow Automation**                 | Chain trigger → actions (move/rename/compress/convert/notify). This is the "saved multi-step Workflow" concept already scoped in the original `docs/DATA-MODEL.md` phasing note — v2.1 is where it actually gets built. |
| 13  | **Rule Builder (visual, Zapier-style)** | IF/AND/THEN visual builder. Supersedes the MVP's simpler Smart Rules form (see `tasks/03-MVP.md`) — should be designed as a superset/replacement, not a parallel system.                                                |
| 14  | **Scheduled Tasks**                     | Nightly/weekly/monthly jobs (organize, cleanup, backup, duplicate scan). Requires a persistent background scheduler (see TECH-STACK.md job scheduler addition).                                                         |
| 19  | **Folder Watcher (advanced)**           | Extends MVP's basic Auto Mode to more sources (USB, NAS, cloud folders) and ties into Workflow triggers.                                                                                                                |
| 15  | **Batch Processor**                     | Multi-operation chains (rename+compress+convert+move+metadata-cleanup) as one workflow run.                                                                                                                             |

## v2.2 — AI & Organization Depth

| #   | Feature                       | Notes                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2   | **AI File Organizer**         | Content/OCR/EXIF-based classification (invoices, resumes, screenshots, etc.), not just extension-based. **Must ship as an inspectable, overridable suggestion layer over the deterministic rules engine — never silent/automatic by default.** This directly preserves the local-first/privacy positioning against FilesDesk established in `docs/PRODUCT-STRATEGY.md` and `docs/INTEGRATIONS.md`. |
| 7   | **AI Smart Rename**           | Content-aware filename generation (OCR, object detection, face recognition, metadata). Same guardrail as above — suggestions, not silent renames; face recognition specifically raises privacy questions that need explicit user consent flows, not just a settings toggle (see RISKS.md addition below).                                                                                          |
| 34  | **AI Assistant**              | Natural-language command interface ("organize my Downloads", "find duplicate photos"). Should route through the same engines/IPC contract as manual actions — the assistant is a new UI surface, not a new backend capability.                                                                                                                                                                     |
| 6   | **File Tagging System**       | Virtual, multi-tag-per-file metadata layer, independent of folder structure.                                                                                                                                                                                                                                                                                                                       |
| 30  | **Universal Command Palette** | Search commands/files/settings/actions in one place — extends the MVP's Cmd/Ctrl+K concept (already noted as a "Should Have" in `tasks/03-MVP.md`).                                                                                                                                                                                                                                                |

## v2.3 — Adjacent Toolkits

| #   | Feature             | Notes                                                                                                                                                                                                            |
| --- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8   | **Image Toolkit**   | Resize/compress/crop/convert/background-removal/watermark/EXIF editor; HEIC/WebP/AVIF support.                                                                                                                   |
| 9   | **PDF Toolkit**     | Merge/split/compress/rotate/OCR/watermark/password/extract.                                                                                                                                                      |
| 10  | **Archive Manager** | ZIP/RAR/7Z/TAR/GZ/ISO — preview, extract, compress, password-protect, split.                                                                                                                                     |
| 21  | **Metadata Editor** | Cross-format (audio/video/image/PDF/office) metadata editing.                                                                                                                                                    |
| 37  | **Developer Tools** | Node modules cleaner, git repo manager, Docker cleanup, unused-assets finder — a distinct power-user persona from the original target users (see PROJECT-VISION.md); validate demand before over-investing here. |

## v2.4 — Cloud & Ecosystem

| #   | Feature                         | Notes                                                                                                                                                                                                                                       |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 26  | **Cloud Integration**           | Google Drive/Dropbox/OneDrive/iCloud/S3/Backblaze. First real network dependency — needs explicit opt-in and a data-handling policy (see RISKS.md, INTEGRATIONS.md).                                                                        |
| 35  | **Cross-platform Sync**         | Sync settings/rules/presets/themes/history across devices — depends on #26 or a dedicated sync backend; same privacy caveats apply.                                                                                                         |
| 27  | **Plugin System / Marketplace** | Requires a capability-based permission model (see TECH-STACK.md Plugin SDK addition) — a plugin with unrestricted file-system/FFmpeg access would undo all the IPC security work from MVP (`docs/SYSTEM-ARCHITECTURE.md` Security section). |
| 23  | **Favorites & Workspaces**      | Pinned folders, named workspaces (Work/University/Photos), one-click switching.                                                                                                                                                             |
| 24  | **Session Restore**             | Restore open folders/tabs/queue/history on relaunch.                                                                                                                                                                                        |

## v3.0 — Enterprise

| #   | Feature                 | Notes                                                                                                                                                                        |
| --- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 40  | **Enterprise Features** | Multi-user profiles, shared workflow templates, team automation rules, audit logs, RBAC, policy management, remote execution agents, centralized settings, opt-in telemetry. |
| 36  | **Security Center**     | Permission manager, safe delete, encrypted vault, checksum verification, malware-scan integration.                                                                           |

## Cross-Cutting Features (span multiple phases — implement incrementally alongside the phase they most support)

| #   | Feature                                                                                                                                      | Suggested Phase Alignment                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 16  | File Version History                                                                                                                         | v2.1 (natural extension of MVP's undo/history service)                        |
| 17  | Recycle Center (own retention-policy trash)                                                                                                  | v2.0–v2.1                                                                     |
| 18  | Clipboard Manager                                                                                                                            | v2.1                                                                          |
| 20  | Media Converter Pro (GPU accel, filters, subtitle burn, watermark, frame extraction, GIF, thumbnails, audio normalization)                   | v2.2–v2.3, extends MVP Converter                                              |
| 22  | Storage Analytics (charts/trends)                                                                                                            | v2.0, pairs with Dashboard + Large File Analyzer                              |
| 28  | Theme Engine (glassmorphism, OLED, dynamic accent, custom themes)                                                                            | v2.0–v2.2, extends `docs/DESIGN-SYSTEM.md`                                    |
| 29  | Keyboard Power User Mode                                                                                                                     | v2.0, extends MVP accessibility baseline                                      |
| 31  | Activity Timeline                                                                                                                            | v2.0–v2.1, extends Undo/History view                                          |
| 32  | Performance Monitor                                                                                                                          | v2.1–v2.2                                                                     |
| 33  | Notifications Center                                                                                                                         | v2.0, extends MVP OS-notification integration                                 |
| 38  | File Insights (most modified/unused/duplicated)                                                                                              | v2.0, pairs with Dashboard                                                    |
| 39  | Modern UI Improvements (Fluent Design 3 / macOS Tahoe-inspired, glass surfaces, skeleton states, dockable panels, multi-window, WCAG 2.2 AA) | Ongoing — treat as a continuous DESIGN-SYSTEM.md evolution, not a single task |

## Recommended Architecture Improvements (from founder vision — adopted into core docs now)

These are adopted immediately rather than deferred, because they're expensive to retrofit:

- Modular feature architecture (`features/organizer`, `features/renamer`, `features/converter`, etc.) — see `docs/SYSTEM-ARCHITECTURE.md`.
- Domain layer separating business logic from Electron IPC — see `docs/SYSTEM-ARCHITECTURE.md`.
- Background job scheduler with persistent queue — see `docs/TECH-STACK.md`.
- Command/event architecture for undo/redo and history — extends MVP's simpler append-only log; formalize when Workflow automation (v2.1) arrives.
- Plugin SDK with typed APIs and capability-based permissions — build the permission model _before_ the marketplace UI (v2.4), not after.
- Worker threads for CPU-intensive operations (hashing, duplicate detection, previews) — see `docs/TECH-STACK.md`.
- Indexed local database (SQLite + Drizzle ORM) for search/history/rules/tags/analytics — see `docs/TECH-STACK.md`, `docs/DATA-MODEL.md`.
- Comprehensive logging, crash recovery, opt-in telemetry — extends MVP's `docs/SYSTEM-ARCHITECTURE.md` Analytics & Monitoring sections.
