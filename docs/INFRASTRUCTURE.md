# INFRASTRUCTURE.md

> Adaptation note: FileFlow has no servers/cloud runtime for its core function. "Infrastructure" here covers local dev environment, FFmpeg dependency management, and the CI/CD pipeline that builds and signs cross-platform installers.

## Containerization / Local Dev

- `npm install` + `npm run dev` for hot-reloading local development (existing scripts, per project summary).
- No Docker required for running the app itself; Docker may be used **only** in CI to produce a consistent Linux build/test environment for the CI pipeline, not for end-user deployment (FileFlow ships as a native installer, not a container).

## FFmpeg Dependency Management

- **Decision needed (flagged in TECH-STACK.md open questions)**: bundle a platform-specific FFmpeg binary inside the app package vs. require/detect a system install.
  - Bundling increases installer size but removes first-run friction and version-mismatch risk — likely the right MVP default given the target non-technical-adjacent users (see RISKS.md).
  - `AppSettings.ffmpegPath` (see DATA-MODEL.md) allows advanced users to point to a system FFmpeg instead.
- App must detect FFmpeg availability at first run and surface a clear, actionable message if missing (error code `FFMPEG_NOT_FOUND`, see API-CONTRACT.md).

## CI/CD Pipeline

1. **Lint & type-check**: ESLint + TypeScript compiler check on every PR.
2. **Unit tests**: rules engine, rename engine, conversion-preset validation (pure logic, no Electron runtime needed — fast).
3. **Integration tests**: IPC contract tests using Electron's test harness (e.g., Playwright for Electron or Spectron-successor tooling).
4. **Build**: `electron-builder` produces macOS (.dmg) and Windows (.exe/.msi) artifacts on tagged releases.
5. **Code signing & notarization**: macOS notarization and Windows code-signing certificates required before public distribution — must be configured in CI secrets, not run locally ad hoc.
6. **Release**: signed installers attached to GitHub Releases (or equivalent distribution channel — open decision, see RISKS.md).

## Volume Mounts (Local Dev)

Standard local dev — no special volume mounts required beyond normal Node.js `node_modules` caching in CI for faster repeat builds.

## Cloud Resources

None required for MVP core functionality (local-first by design, per PROJECT-VISION and PRODUCT-STRATEGY positioning). If optional cloud sync of rule sets/presets across devices is added post-MVP, this section must be revisited with an explicit data-handling/privacy addendum before implementation.
