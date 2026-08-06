# INTEGRATIONS.md

## Service Tiers

### Mission Critical

- **FFmpeg** (bundled or system binary) — powers the entire Converter tool. Without it, one of the three core pillars is nonfunctional. See INFRASTRUCTURE.md for bundling decision and API-CONTRACT.md for `FFMPEG_NOT_FOUND` handling.
- **OS file-system APIs** (via Node.js `fs` + `chokidar`) — powers Organizer's watch/move/copy and Renamer's rename operations. Not a third-party integration, but treated as mission-critical infrastructure the app depends on.

### Secondary

- **OS-native notifications** (Electron `Notification` API) — used for background job completion alerts; app remains fully functional without them (degrades to in-app-only status).
- **Code signing / notarization services** (Apple notarization, Windows code-signing CA) — required for trusted distribution, not runtime dependencies.

### Manual / Future (not MVP)

- Optional cloud sync provider for rule sets/presets across devices (V2+, see RISKS.md privacy note — must be explicitly opt-in if built).
- Optional AI classification service (local model via Ollama, or third-party API) for content-aware organizing (V2+, see PRODUCT-STRATEGY.md AI opportunity) — must remain optional and clearly disclosed given FileFlow's local-first/privacy positioning against FilesDesk-style competitors.

## Authentication Flow

Not applicable at MVP — no external service requires credentials for core functionality. If a future license-key or update-check service is introduced, keys would be stored in OS-level secure storage (e.g., Electron `safeStorage` / OS keychain), never in plaintext local files.

## Fallback Strategies

- **FFmpeg unavailable/misconfigured**: Converter tool disables itself with a clear inline message and a link to fix the FFmpeg path in Settings; Organizer and Renamer remain fully usable.
- **File-watcher failure** (e.g., OS watch-handle limits exceeded — a known real-world constraint on some systems): surface a clear error (`WATCHER_LIMIT_EXCEEDED`) and fall back to manual "Organize Now" (one-shot scan) instead of Auto Mode, rather than failing silently.
- **Notification permission denied**: app functions normally; job status simply remains in-app only.
