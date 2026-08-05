# PROJECT-VISION.md

## Mission

FileFlow gives power users and creative professionals a single, fast, native-feeling desktop app to organize, rename, and convert files in bulk — replacing the 2-3 separate single-purpose utilities (a folder-watcher, a rename tool, a media converter) that this workflow currently requires.

## The Problem

People who manage large volumes of files — photographers, videographers, freelancers, students, small studios, IT admins — currently stitch together their workflow from disconnected tools:

- **Organizing**: Hazel (Mac-only) or File Juggler / File Arbor (Windows) to auto-sort folders by rule.
- **Renaming**: Bulk Rename Utility, Advanced Renamer, or A Better Finder Rename to batch-rename files.
- **Converting**: HandBrake or raw FFmpeg to transcode video/audio in bulk.

No mainstream tool does all three well, in one modern UI, on both Windows and macOS. The market is fragmented by design: Hazel is Mac-only and architecturally can't port (FSEvents/Spotlight/AppleScript dependencies); Windows renaming tools (Bulk Rename Utility, XMedia Recode) are functional but visually dated; HandBrake/FFmpeg GUIs are powerful but intimidating for non-technical users.

## Target Users

- **Freelance photo/video editors**: need to ingest, rename by shoot/date/client, and transcode client deliverables in one pass.
- **Power users / IT-adjacent professionals**: want Hazel-style automation on Windows, not just Mac.
- **Students & prosumers**: download/screenshot clutter piles up; want simple automatic sorting without learning a rules DSL.
- **Small content teams**: need consistent naming conventions across a shared drive without manual discipline.

## Pain Points Observed in the Market

- Cross-platform gap: Hazel is Mac-only; no direct equivalent ships natively for Windows with the same polish (File Arbor and File Juggler are the closest, but split the ecosystem).
- Tool-switching cost: organizing, renaming, and converting are treated as unrelated problems by existing software, forcing multi-app workflows for a single logical task ("get this folder of raw client files into deliverable shape").
- Renaming tools with real power (Bulk Rename Utility) trade off UI polish; polished tools (ABFR) are Mac-only and paid.
- Conversion tools split into "too simple" (drag-and-drop online converters) or "too technical" (raw FFmpeg CLI), with HandBrake as the only broadly-loved middle ground — but HandBrake doesn't rename or organize.

## Business Value

A unified, modern, cross-platform utility can capture users currently split across 3+ single-purpose tools, undercut Mac-only tools like Hazel by supporting Windows day one, and differentiate on UX quality (Electron + React 19 + Tailwind + shadcn/ui + Framer Motion) against a competitive set that is functionally solid but visually dated (Bulk Rename Utility, XMedia Recode, HandBrake).

## Vision (Where FileFlow Goes)

Short-term: best-in-class desktop utility combining organize + rename + convert with live preview and safe undo everywhere.
Long-term: FileFlow becomes the default "file intake" layer for creative and admin workflows — rule-based today, with a credible path to optional AI-assisted classification (contents-aware sorting, smart renaming from file content) as a differentiator against purely rule-based competitors like Hazel/File Juggler, without becoming cloud-dependent by default (privacy/local-first stays a core value, matching what users explicitly value about Hazel/File Juggler over AI-cloud tools like FilesDesk).

## Success Metrics (MVP)

- Time-to-first-organized-folder < 2 minutes from install (no rule-writing required for common cases).
- Zero data-loss incidents in beta (undo must be reliable — this is a trust-critical feature category, confirmed by how heavily competitors market "safe preview" and "conflict detection").
- Batch rename/convert operations on 1,000+ files complete without UI freeze (Electron main/renderer separation must hold under load).
- % of beta users who complete a rename + organize + convert session in one sitting without opening a second tool.

## Platform Evolution (v2.0+) — Strategic Note

The founder has provided an expanded vision (see `docs/PLATFORM-FEATURES-V2.md`) that takes FileFlow from a 3-tool utility to a full file productivity platform: dashboard, AI-assisted organizing/renaming, duplicate detection, advanced search, tagging, PDF/image toolkits, workflow automation, cloud sync, a plugin marketplace, and enterprise features.

**This is treated as the validated long-term roadmap, not a change to MVP scope.** Per Phase 4 of the VentureForge workflow ("always ask why users choose this instead" and challenge weak assumptions): the MVP thesis that wins the beachhead — organize + rename + convert, unified, cross-platform, trustworthy undo — still stands as the fastest path to a defensible first release. A 40-feature platform shipped in one pass risks the exact trap the competitive research warns against (dated, over-built utilities like Bulk Rename Utility that win on power but lose on clarity). The phased breakdown below sequences the platform vision _after_ MVP proves the core loop, not instead of it.

The v2.0+ vision does change two MVP-adjacent decisions immediately, though, because they are foundational and expensive to retrofit later:

1. **Local persistence** should be architected from day one as an indexed database (SQLite + Drizzle ORM), not throwaway JSON — see updated `docs/TECH-STACK.md`.
2. **Codebase structure** should adopt a modular feature architecture (`features/organizer`, `features/renamer`, etc.) with a domain layer separating business logic from Electron IPC from day one — see updated `docs/SYSTEM-ARCHITECTURE.md`.

This lets v2.0+ features slot in later without a rewrite, while MVP scope (`tasks/03-MVP.md`) stays unchanged.
