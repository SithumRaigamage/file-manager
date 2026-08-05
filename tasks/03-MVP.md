# 03-MVP.md — MVP Scope Checklist

Cross-reference: `docs/FEATURE-SPECIFICATION.md` for full acceptance criteria per item below.

## Organizer (MVP)

- [ ] Quick Rules: Images / Videos / Docs / Archives, zero-config.
- [ ] Preview-before-apply for all organize actions.
- [ ] Conflict prompt (rename/skip/overwrite) on destination collision.
- [ ] Auto Mode (folder watcher) for at least one active rule set at MVP.

## Renamer (MVP)

- [ ] Sequential numbering (configurable start/padding).
- [ ] Prefix/suffix insertion.
- [ ] Find & replace (plain text).
- [ ] Date/time insertion from file metadata.
- [ ] Live preview (old → new) before commit.
- [ ] Conflict detection across batch + destination collisions.
- [ ] Smart undo for full batch, persisted across app restarts within the retention window.

## Converter (MVP)

- [ ] Batch queue for MP4/MKV/MOV (video) and MP3/WAV/AAC (audio).
- [ ] 3 quality presets (Web/Small, Balanced, Archival).
- [ ] Per-file progress + aggregate batch progress.
- [ ] Cancel individual job without killing queue.
- [ ] Graceful per-file error handling (corrupt/unsupported input).

## Cross-Cutting (MVP)

- [ ] Shared before/after preview component used identically across all three tools.
- [ ] Dark-mode-first UI shell with light mode toggle.
- [ ] Keyboard operability for core flows in all three tools.
- [ ] Undo/History view listing recent batches across all operation types.

**Explicitly deferred past MVP** (see `docs/PRODUCT-STRATEGY.md`, `00-MASTER-ROADMAP.md`): Smart Rules regex/nested conditions, saved multi-step Workflows, AI-assisted classification, cloud sync.
