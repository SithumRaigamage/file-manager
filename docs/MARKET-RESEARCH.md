# MARKET-RESEARCH.md

## Category 1 — Automatic File Organizers

| Tool             | Platform        | Pricing                          | Strengths                                                                                                                                                   | Weaknesses                                                                                          | UX Quality        |
| ---------------- | --------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------- |
| **Hazel**        | macOS only      | ~$42 one-time                    | Deep OS integration (FSEvents, Spotlight, Finder tags, AppleScript); mature conditions+actions rule model; can read file content (e.g. PDFs) to match rules | Mac-only by architecture, not choice — relies on APIs that don't exist on Windows; dated UI         | Functional, dated |
| **File Juggler** | Windows         | ~$40 one-time, no real free tier | Closest Windows philosophical equivalent to Hazel; reads PDF/Word content for sorting                                                                       | Rules limited vs. Hazel's regex flexibility; UI lacks polish                                        | Dated             |
| **File Arbor**   | Windows + macOS | Free tier + Pro                  | Real-time "Auto Mode" folder watching; Quick Rules (one-click sort by type) + Smart Rules (regex/size/date); modern UI; cross-platform                      | Newer entrant, smaller ecosystem/integrations                                                       | Modern            |
| **FilesDesk**    | Windows + macOS | Free to try                      | AI-driven — reads file contents, no rules to maintain                                                                                                       | Requires cloud credits or local GPU/Ollama for AI; not deterministic; smaller integration ecosystem | Modern            |

**Takeaway:** The Windows side of this category is real but young (File Arbor, File Juggler) — nobody has cross-platform + modern UI + zero-rule quick sorting + power-user regex rules all at once. This is FileFlow's clearest opening.

## Category 2 — Bulk File Renamers

| Tool                              | Platform        | Pricing                            | Strengths                                                                                                                                           | Weaknesses                                                             |
| --------------------------------- | --------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Bulk Rename Utility**           | Windows         | Free (personal), $92.95 commercial | Handles 100,000+ files/operation; extremely feature-rich; real-time multi-step preview                                                              | UI throws 100+ options at once — steep learning curve                  |
| **Advanced Renamer**              | Windows + macOS | Free/donation                      | 13 renaming methods; batch move/copy based on file info                                                                                             | Power-user oriented, not beginner-friendly                             |
| **A Better Finder Rename (ABFR)** | macOS           | ~$19.95                            | Native Finder right-click integration; structured UI vs. Bulk Rename Utility's firehose; EXIF/IPTC metadata support; actively maintained since 1996 | Mac-only, paid                                                         |
| **PowerRename (PowerToys)**       | Windows         | Free                               | Built into Windows via PowerToys; simple find/replace                                                                                               | No advanced automation, no batch numbering complexity, light-duty only |
| **Ant Renamer / ReNamer**         | Windows         | Free                               | Regex + token patterns; interactive rule queue; conditional logic                                                                                   | Still utility-grade UI, not modern                                     |

**Takeaway:** Every renamer is either powerful-but-ugly (Bulk Rename Utility) or polished-but-platform-locked (ABFR/Mac). Nothing combines ABFR-grade UI structure with Bulk Rename Utility-grade power, cross-platform.

## Category 3 — Batch Media Converters

| Tool                 | Platform       | Pricing         | Strengths                                                                                                                 | Weaknesses                                                                  |
| -------------------- | -------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **HandBrake**        | Win/Mac/Linux  | Free, GPL       | Consensus "best overall" for batch video transcoding; queue system; deep codec/preset control; GUI over FFmpeg internally | Interface is functional, not modern; video only (no audio-only/image batch) |
| **FFmpeg (raw CLI)** | Cross-platform | Free            | Maximum control, scriptable, same engine HandBrake wraps                                                                  | No GUI at all — command-line only                                           |
| **XnConvert**        | Win/Mac/Linux  | Free (personal) | Best-in-class for batch **images** (500+ formats, 80+ chainable actions)                                                  | Images only, not video/audio                                                |
| **fre:ac**           | Cross-platform | Free            | Best-in-class for batch **audio**                                                                                         | Audio only                                                                  |
| **XMedia Recode**    | Windows        | Free            | Strong format support, fine-grained stream/subtitle control                                                               | Windows-only, dated UI                                                      |

**Takeaway:** HandBrake is the trusted default for video, but nobody combines organize + rename + convert. This confirms the core FileFlow thesis: the market is organized by _file operation type_, not by _user workflow_.

## Cross-Cutting Market Gaps

1. **No unified tool.** All three categories above are served by separate, single-purpose apps. A user doing "ingest client footage → rename by shoot/date → transcode to delivery format" today needs 2-3 apps.
2. **Windows lags Mac in organizer polish.** Hazel's absence from Windows is a known, frequently-searched pain point (multiple "Hazel alternative for Windows" articles exist specifically because of this gap).
3. **UI modernity is a differentiator, not a given.** Bulk Rename Utility, File Juggler, HandBrake are all functionally excellent but visually dated — this is repeatedly called out in reviews as a weakness, even for market leaders.
4. **Trust/safety features (preview, undo, conflict detection) are treated as premium differentiators**, not baseline expectations — an opportunity to make them a FileFlow baseline instead of an upsell.
5. **AI-based organizing (FilesDesk) trades determinism and privacy for convenience** — many users explicitly prefer rule-based, local, predictable tools. This suggests FileFlow's rule-based-first approach (with optional AI later) is the right sequencing, not AI-first.

## Trend Analysis

- Cross-platform desktop tools (Electron, Tauri) are increasingly preferred over platform-locked utilities as users work across Mac/Windows.
- "Quick Rules" (one-click, zero-config sorting) alongside "Smart Rules" (regex/power-user) is emerging as the preferred pattern (seen in File Arbor) — this maps directly to FileFlow's MVP scope (see PRODUCT-STRATEGY.md).
- AI-assisted organization is emerging (FilesDesk) but is explicitly positioned as a complement to rule-based tools, not a replacement — validates a phased roadmap (rules now, AI-assist later, see docs/PRODUCT-STRATEGY.md and tasks/08-V2.md).
