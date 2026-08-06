# 00-MASTER-ROADMAP.md

## Phasing Overview (per Universal Project Blueprint build order)

| Phase | Focus                                                                                      | Task File                                                             |
| ----- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 0     | Foundation — repo, linting, CI/CD, Docker (CI only), env setup                             | `01-Discovery.md` (research/decisions) + part of `02-Architecture.md` |
| 1     | Data & Local Persistence — schemas, FFmpeg dependency, rule/pattern models                 | `02-Architecture.md`                                                  |
| 2     | Core Backend Services — main-process engines (rules, rename, conversion, watcher, history) | `05-Backend.md`                                                       |
| 3     | Frontend — Electron renderer, React app shell, three tool UIs                              | `04-Frontend.md`                                                      |
| 4     | Testing — unit, integration, packaged-installer smoke tests                                | `06-Testing.md`                                                       |
| 5     | Launch — signing, packaging, distribution, monitoring                                      | `07-Launch.md`                                                        |
| 6     | v2.0 — Dashboard, duplicate finder, advanced search, previews, tabs                        | `08-v2.0-Platform-Foundation.md`                                      |
| 7     | v2.1 — Workflow automation, visual rule builder, scheduler                                 | `09-v2.1-Automation.md`                                               |
| 8     | v2.2 — AI organizer, AI rename, assistant, tagging, command palette                        | `10-v2.2-AI-Organizer.md`                                             |
| 9     | v2.3 — Image/PDF toolkits, archive manager, metadata editor                                | `11-v2.3-Toolkits.md`                                                 |
| 10    | v2.4 — Cloud sync, plugin marketplace, workspaces                                          | `12-v2.4-Cloud-Plugins.md`                                            |
| 11    | v3.0 — Enterprise (multi-user, RBAC, audit logs, remote agents)                            | `13-v3.0-Enterprise.md`                                               |

Full feature-to-phase rationale lives in `docs/PLATFORM-FEATURES-V2.md`; strategic sequencing logic lives in `docs/PRODUCT-STRATEGY.md`.

## MVP Definition (Must / Should / Could / Won't)

**Must Have (MVP-blocking)**

- Organizer: Quick Rules (Images/Videos/Docs/Archives) + preview + apply + basic conflict prompt.
- Renamer: sequential numbering, prefix/suffix, find & replace, date insertion + preview + conflict detection + smart undo.
- Converter: batch FFmpeg conversion for MP4/MKV/MOV/MP3/WAV/AAC with 3 quality presets + queue + per-file progress.
- Cross-cutting: context-isolated IPC contract, undo/history log, dark-mode-first UI shell.

**Should Have (early post-MVP, V1.1)**

- Organizer Smart Rules (regex, nested AND/OR conditions).
- Renamer regex find & replace with sample-preview safety check.
- Configurable FFmpeg worker concurrency + disk-space pre-flight check.

**Could Have**

- Saved multi-step Workflows (organize → rename → convert pipelines).
- OS-native notification polish, command palette (Cmd/Ctrl+K).

**Won't Have (out of scope for MVP and V1.1 — scheduled into later phases, see table above, not abandoned)**

- Cloud sync of settings/rules across devices → v2.4.
- AI-assisted content-aware classification/renaming → v2.2.
- Mobile companion app — not currently on the v2.0–v3.0 roadmap; would require a separate scoping pass if pursued.

## Dependencies & Sequencing Notes

- Backend engines (rules/rename/conversion) must exist with unit tests **before** frontend wiring begins, per the Universal Blueprint's foundation-before-consumer-interface principle — this is why `05-Backend.md` precedes `04-Frontend.md` in dependency order even though frontend is numbered earlier in the blueprint's file convention.
- FFmpeg bundling decision (TECH-STACK.md, INFRASTRUCTURE.md open question) must be resolved in Phase 0/1 — it affects installer packaging tasks in `07-Launch.md`.
