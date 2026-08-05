# CHANGELOG.md

All notable updates to FileFlow's `docs/` and `tasks/` documentation are recorded here, per the VentureForge workflow's Phase 9 (Continuous Documentation) requirement that documentation stay synchronized with the current state of the project.

## 2026-08-05 — Initial Scaffolding

- Generated full `docs/` set (PROJECT-VISION, MARKET-RESEARCH, PRODUCT-STRATEGY, FEATURE-SPECIFICATION, USER-EXPERIENCE, SYSTEM-ARCHITECTURE, TECH-STACK, API-CONTRACT, DATA-MODEL, DESIGN-SYSTEM, INTEGRATIONS, INFRASTRUCTURE, RISKS, CHANGELOG) based on:
  - Existing FileFlow summary (Electron + React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui + Framer Motion + Zustand; three tools: Smart File Organizer, Professional Bulk Renamer, High-Speed File Converter).
  - Live competitive research across all three tool categories (organizers: Hazel, File Juggler, File Arbor, FilesDesk; renamers: Bulk Rename Utility, Advanced Renamer, ABFR, PowerRename; converters: HandBrake, FFmpeg, XnConvert, fre:ac, XMedia Recode).
- Generated full `tasks/` build order (00-MASTER-ROADMAP through 08-V2) per the Universal Project Blueprint's phased execution model.
- Flagged open decisions requiring founder input: monetization model (TECH-STACK.md doesn't cover this — see PRODUCT-STRATEGY.md), bundled vs. system FFmpeg (TECH-STACK.md, INFRASTRUCTURE.md), SQLite vs. JSON local persistence (TECH-STACK.md), distribution channel (RISKS.md).

## 2026-08-05 — Platform Vision Expansion (v2.0–v3.0)

- Ingested founder-provided "FileFlow v2.0 — Professional File Management Suite" vision (40 proposed features: dashboard, AI organizer/rename/assistant, duplicate finder, advanced search, tagging, image/PDF toolkits, archive manager, workflow automation, scheduler, cloud sync, plugin marketplace, enterprise features, and UI/architecture upgrades).
- Added `docs/PLATFORM-FEATURES-V2.md` mapping all 40 features to a phased roadmap (v2.0 → v3.0), with rationale per phase.
- Updated `docs/PROJECT-VISION.md`: added "Platform Evolution" section — treats the expansion as validated long-term roadmap, explicitly **not** a change to MVP scope, per VentureForge Phase 4 discipline against unjustified scope creep.
- Updated `docs/PRODUCT-STRATEGY.md`: added full v2.0–v3.0 roadmap table with positioning rationale per phase.
- Updated `docs/TECH-STACK.md`: resolved the SQLite-vs-JSON open question in favor of **SQLite + Drizzle ORM**, adopted now (at MVP time) for v2.0+ readiness; added worker_threads, persistent job scheduler, command/event architecture, and Plugin SDK as adopted architecture decisions.
- Updated `docs/SYSTEM-ARCHITECTURE.md`: added modular feature-folder architecture, domain layer separation, and plugin permission-model design notes — adopted at MVP time even though most features they support are post-MVP.
- Updated `docs/DATA-MODEL.md`: documented anticipated v2.0+ entities (`Workflow`, `DuplicateGroup`, `SearchIndexEntry`, `Tag`/`FileTag`, `Workspace`, `PluginManifest`) without implementing them at MVP time.
- Updated `docs/RISKS.md`: added Platform Expansion Risks table — scope creep, AI/privacy conflicts, plugin attack surface, cloud data-handling obligations, destructive-operation blast radius, enterprise-vs-prosumer buyer mismatch.
- Replaced `tasks/08-V2.md` with six phase-specific task files (`08-v2.0-Platform-Foundation.md` through `13-v3.0-Enterprise.md`); updated `tasks/00-MASTER-ROADMAP.md` accordingly.
- **No change to `tasks/03-MVP.md` scope** — MVP remains Organizer (Quick Rules) + Renamer (core patterns) + Converter (FFmpeg batch), per the standing strategic decision above.

## Template for Future Entries

```
## YYYY-MM-DD — [Short summary]
- What changed and why (research finding, architectural decision, scope change).
- Which docs/tasks files were touched.
- Any new open decisions raised.
```
