# 07-Launch.md — Deployment, Distribution, Monitoring

## Packaging & Signing

- [ ] Resolve bundled vs. system FFmpeg decision before final packaging (see `01-Discovery.md`).
- [ ] Set up Apple Developer Program signing + notarization for macOS build.
- [ ] Set up Windows code-signing certificate for .exe/.msi build.
- [ ] Generate OSS notices file (FFmpeg LGPL/GPL compliance per `docs/RISKS.md`).

## Distribution

- [ ] Finalize distribution channel decision (direct download vs. app stores) per `docs/RISKS.md` open item.
- [ ] Set up release pipeline (GitHub Releases or chosen channel) wired to CI build artifacts.
- [ ] Write installation/first-run documentation (user-facing, not `docs/` internal docs).

## Monitoring & Crash Reporting

- [ ] Wire opt-in Electron crash reporter (default off, clearly disclosed per `docs/SYSTEM-ARCHITECTURE.md`).
- [ ] Implement opt-in anonymous usage analytics scaffold (default off) — do not enable by default per privacy positioning in `docs/PRODUCT-STRATEGY.md`.

## Marketing / Analytics (light touch — full GTM plan out of scope here)

- [ ] Prepare launch content targeting "Hazel alternative for Windows" and "HandBrake + renamer" search intent (see `docs/PRODUCT-STRATEGY.md` Go-to-Market notes).
- [ ] Identify beta-tester channels (r/DataHoarder, freelance photo/video communities).

## Pre-Launch Checklist

- [ ] All `03-MVP.md` Must Have items complete and tested (`06-Testing.md`).
- [ ] Zero known data-loss bugs in undo/history flows (blocking — ties to `docs/PROJECT-VISION.md` success metric).
- [ ] `docs/CHANGELOG.md` updated with final pre-launch documentation state.
