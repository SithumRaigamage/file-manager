# PRODUCT-STRATEGY.md

## Unique Selling Proposition

**"The Hazel + Bulk Rename Utility + HandBrake of a single, modern, cross-platform app."**
FileFlow is the only tool that organizes, renames, and converts files in one workflow, on both Windows and macOS, with a UI quality none of the incumbents currently offer.

## Positioning

- **Vs. Hazel / File Juggler / File Arbor**: FileFlow matches rule-based organizing but adds renaming and conversion in the same app — no need to hand off to a second tool once files are sorted.
- **Vs. Bulk Rename Utility / Advanced Renamer**: FileFlow offers the same power-user rename capability (sequential numbering, prefix/suffix, find & replace, date tokens) with a modern, structured UI (closer to ABFR's clarity than Bulk Rename Utility's firehose of options), plus conflict detection and smart undo as baseline, not upsell.
- **Vs. HandBrake / FFmpeg**: FileFlow wraps FFmpeg with the same batch/preset philosophy as HandBrake but integrates it into the same app that already organized and renamed the files — no exporting to a separate converter.
- **Vs. FilesDesk (AI-first)**: FileFlow stays rule-based and local-first for MVP (privacy, determinism, no cloud dependency) — matching what reviewers say users explicitly value about Hazel-style tools over AI-cloud tools — with AI-assisted classification as an explicit _post-MVP_ differentiator, not a launch requirement.

## Monetization (to validate with founder — flagging as an open decision)

Given the competitive set skews toward one-time-purchase pricing ($19.95–$92.95) rather than subscription, a **one-time license with a functional free tier** (Quick Rules organizing + basic rename, capped batch size) is likely to match user expectations better than a SaaS subscription. This should be revisited in Phase 4 (Product Innovation) once usage data exists — not decided today.

## Go-to-Market (early notes, not a full GTM plan)

- Target the "Hazel alternative for Windows" and "HandBrake + renamer" search intent directly — these are proven, recurring search queries per the competitive research.
- Communities: r/DataHoarder, photography/videography freelancer forums, productivity YouTube (the same channels that cover Hazel/PowerToys/HandBrake).

## Growth & Differentiation Ideas (Phase 4 — to prioritize later, not commit to for MVP)

- **WOW feature candidate**: live, side-by-side before/after preview across all three tools (organize/rename/convert) using one consistent preview component — none of the competitors show a unified preview across operation types.
- **AI opportunity (post-MVP)**: optional content-aware classification/renaming (à la FilesDesk) as an add-on layer on top of the deterministic rule engine — never the default, always inspectable/overridable.
- **Automation opportunity**: chain organize → rename → convert into a single saved "workflow" (a job pipeline), which none of the single-purpose competitors can offer since they don't own more than one step.
- **Accessibility**: keyboard-first batch operations, since this is a power-user, high-repetition tool.

## Roadmap Snapshot

See `tasks/00-MASTER-ROADMAP.md` for the execution-level roadmap. Strategically:

1. MVP: Organizer (Quick Rules) + Renamer (core patterns) + Converter (FFmpeg batch, common formats).
2. V1.1: Smart Rules (regex, nested conditions) for organizer, closing the gap with File Arbor/Hazel power users.
3. V2.0+: Full platform expansion per `docs/PLATFORM-FEATURES-V2.md` — see phase table below.

## Platform Roadmap (v2.0 → v3.0)

The founder's expanded vision reframes FileFlow's ceiling from "best 3-in-1 utility" to "file productivity platform" competing with commercial suites. This is sequenced deliberately — dashboard/search/duplicates first (high value, lower risk), AI and cloud features later (higher differentiation, higher risk/cost), enterprise last (requires a proven single-user product first).

| Phase    | Goal                                                                            | Positioning Rationale                                                                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v2.0** | Dashboard, duplicate finder, advanced search, multi-tab explorer, file previews | Converts FileFlow from "3 tools" into a real home base for file work — directly extends the unified-workflow USP without depending on unproven AI.                                                                |
| **v2.1** | Workflow automation, folder watcher (advanced), scheduler, visual rule builder  | This is where FileFlow starts to look like "Hazel/File Arbor + Zapier" — the automation depth incumbents don't have.                                                                                              |
| **v2.2** | AI organizer, AI smart rename, command palette, tagging                         | AI features are added _after_ the deterministic rules engine is trusted (see RISKS.md) — matches the market finding that users value FilesDesk-style AI as a complement, not a replacement, for rule-based tools. |
| **v2.3** | PDF toolkit, image toolkit, archive manager, metadata editor                    | Expands FileFlow's surface into adjacent "file productivity" categories, competing more with Swiss-army-knife utilities than with Hazel/HandBrake specifically.                                                   |
| **v2.4** | Cloud sync, plugin marketplace, workspace management                            | Introduces the first real infrastructure dependency (cloud) and ecosystem play (plugins) — requires the explicit opt-in/privacy handling flagged in RISKS.md and INTEGRATIONS.md.                                 |
| **v3.0** | Enterprise: multi-user, shared workflows, audit logs, RBAC, remote agents       | Only pursued once single-user product-market fit is established — enterprise features (policy management, RBAC) are a different buyer and support burden than the prosumer/freelancer beachhead.                  |

**Standing principle**: each phase must re-justify itself against "why would users choose this instead" (VentureForge Phase 4) before work begins — this roadmap is a menu validated by the founder's vision document, not a fixed commitment to build all 40 features regardless of what MVP/V1.1 usage data shows.
