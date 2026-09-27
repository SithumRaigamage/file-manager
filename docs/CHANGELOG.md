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

## 2026-09-21 — Duplication Cleanup (code-level dedup + dead-code removal)

- **Root cause**: an audit of the codebase found the same filename-conflict-resolution logic (`while (fs.existsSync(...)) append " (n)"`) independently reimplemented in 7 places (`ipc/organizer.ts` ×2, `ipc/searcher.ts`, `domain/renamer/rename-executor.ts`, `domain/renamer/rename-evaluator.ts`, `domain/watcher/watcher-service.ts`, `domain/converter/converter-queue.ts`), and directory-tree walking independently reimplemented in 3 places (`features/duplicates/duplicate-scanner.ts`, `features/search/indexer-worker.ts`, `ipc/searcher.ts`), with `domain/organizer/conflict-detector.ts` — the file named for this job — not actually implementing it (it only detects circular watch-folder loops).
- Added `src/main/domain/shared/unique-path.ts` (`resolveUniquePath`, `resolveUniqueName`) and `src/main/domain/shared/directory-walker.ts` (`walkDirectory`) per the Domain layer rule in `docs/SYSTEM-ARCHITECTURE.md`; all 7 conflict-resolution call sites and all 3 directory-walk call sites now use the shared helpers instead of ad hoc copies. Each caller's existing skip/ignore/cancellation behavior was preserved exactly (no functional change to what gets scanned or how conflicts are named).
- Removed the dead legacy `organizer:preview`/`organizer:execute`/`organizer:scan`/`organizer:startWatching`/`organizer:stopWatching` and `renamer:preview`/`renamer:execute`/`renamer:undo`/`renamer:listFiles` IPC handlers from `ipc/organizer.ts` / `ipc/renamer.ts`, plus their now-unused preload bindings (`window.api.organizer`, `window.api.renamer`). These were an unreferenced parallel implementation of Organizer/Renamer (confirmed zero call sites in the renderer) left over from the Phase-0 `fileflow` API migration; the legacy renamer path in particular bypassed `HistoryService` entirely, so renames done through it were not undoable.
- **Correctness fix surfaced by the above**: `organizer:applyOrganize` (the handler the UI actually calls) never logged completed moves to `HistoryService`, so Organizer operations were not undoable and never appeared in the History view — a direct gap against the CLAUDE.md rule that every destructive operation must be undoable. Fixed by routing `move` results through `HistoryService.logBatch('organize', ..., true)`, matching the pattern `RenameExecutor` and `ConverterQueue` already use. `copy` results are intentionally not logged as reversible (the original file is untouched by a copy, and naively reverting via rename-back would collide with it).
- Consolidated 5x-duplicated `formatBytes`/`formatDuration` implementations in the renderer (`components/mp4analyzer/ResultsTable.tsx`, `FileDetailDrawer.tsx`, `components/pages/LargeFileAnalyzerPage.tsx`) onto the existing canonical `formatBytes` in `renderer/src/lib/utils.ts`, and added a canonical `formatDuration` there (parameterized fallback text to preserve each page's existing copy). `SearcherPage.tsx`'s `formatBytes` was left as-is — it uses a deliberately different compact display style for its dense file-browser view, not accidental drift. Also merged `SearcherPage.tsx`'s verbatim-duplicated `getFileIcon`/`getLargeFileIcon` into one function parameterized by icon size.
- **Not changed** (scope explicitly limited to code-level dedup, no feature/page removal): the product-level overlaps the audit also found — two independent search engines (`SearcherPage`/`ipc/searcher.ts` live-scan vs. `AdvancedSearchPage`/`ipc/indexer.ts` FTS index), `ImageToolkitPage`'s standalone client-side converter bypassing the Converter architecture, `mp4analyzer.ts`'s separate FFmpeg-invocation path (including template-literal-built repair commands, weaker than the allow-listed-args pattern `ffmpeg-wrapper.ts` uses), and the nascent `WorkflowEngine` vs. Organizer's `RuleEvaluator`/`WatcherService` — remain as-is. These are flagged here as open follow-ups, not resolved.
- Also reconfirmed, not newly discovered: the amount of already-implemented post-MVP surface area (duplicate finder, search+indexer, large-file analyzer/dashboard, automation, AI service, MP4 analyzer, image toolkit, tags — roughly half of all IPC namespaces and renderer pages) versus the standing MVP scope in `tasks/03-MVP.md`. No action taken here per the "don't silently diverge" rule — noted for founder awareness only, consistent with the 2026-08-05 entry's decision to treat the v2.0+ vision as a *roadmap*, not current MVP scope.

## 2026-09-22 — Organizer: "Organize by Date" Quick Rule

- **What changed and why**: added a new Organizer Quick Rule, requested directly by the founder, that moves everything in a selected folder — files *and* subfolders — into `YYYY-MM-DD/` subfolders named after each item's own last-modified date. This was not an existing MVP checklist item (`tasks/03-MVP.md` only listed Images/Videos/Docs/Archives), so it's logged here as an explicit, requested scope addition rather than a silent expansion.
- **Design decisions**:
  - New domain file `src/main/domain/organizer/date-grouper.ts` (`dateBucketName`, `isDateBucketName`) rather than extending `RuleEvaluator`/`SmartCondition`: existing quick/smart rules answer "does this file match" against one fixed destination, but date-grouping needs a *different* destination per item computed from that item's own mtime — a preview-generation strategy, not a matchable condition.
  - Bucket dates use local time (`Date.getFullYear/getMonth/getDate`), not UTC, so an item modified late in the evening lands in the day the user experienced it.
  - The new `organizer:previewOrganizeByDate` handler is the **first** Organizer preview path to process directories as well as files (`entry.isDirectory()`) — every prior handler (`listFolder`, `previewQuickRule`, `previewSmartRule`) only ever looked at `entry.isFile()`, so folders were previously invisible to the Organizer entirely. Subfolders move as whole units, bucketed by their own mtime (not recursed into).
  - Re-running the rule on an already-organized folder skips directories already named as a date bucket (`isDateBucketName`), so `2026-09-22/` doesn't get swept into itself.
  - No changes were needed to `organizer:applyOrganize`, `resolveUniquePath`, or `HistoryService` — all three already handle directories correctly (`fs.renameSync`, `fs.existsSync`-based conflict resolution, and batch undo logging), so preview/apply/undo for this feature come for free from existing infrastructure.
- **Docs touched**: `docs/API-CONTRACT.md` (new `previewOrganizeByDate` action), `docs/DATA-MODEL.md` (`RuleSet.quickRuleId` union), `tasks/03-MVP.md` (new checklist line), this file.
- **Pre-existing gap noted, not fixed here**: the repo has no unit test runner wired up (only Playwright e2e via `npm run test:e2e`); `rule-evaluator.ts` and other domain files have no unit tests despite `CLAUDE.md`'s stated Testing Expectations. This feature's coverage was added as an e2e smoke scenario (`tests/e2e/smoke.spec.ts`) consistent with existing precedent, not as a new unit test framework introduced as a side effect of an unrelated feature.
- **No new open decisions raised.**

## Template for Future Entries

```
## YYYY-MM-DD — [Short summary]
- What changed and why (research finding, architectural decision, scope change).
- Which docs/tasks files were touched.
- Any new open decisions raised.
```
