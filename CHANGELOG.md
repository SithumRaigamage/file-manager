# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-05

### Added
- **Smart File Organizer**: Automatically categorize files into predefined folders (Images, Videos, Documents, Archives).
- **Professional Bulk Renamer**: Mass rename files using sequential numbering, prefix/suffix modifications, date insertions, and robust Find & Replace. Features instant preview and conflict resolution.
- **High-Speed File Converter**: Batch convert videos and audio formats with smart presets (Web Balanced MP4, Archive H.265 MKV, and Audio MP3 Extraction) utilizing an optimized bundled FFmpeg engine.
- **History Dashboard**: A unified history center tracking all batch operations. Includes a one-click **Undo** mechanism to reverse any non-destructive file operations.
- **Virtualization Support**: File views (lists) now utilize rendering virtualization, allowing seamless navigation and performance when manipulating directories containing 10,000+ files.
- **Local-First Architecture**: Built entirely on Electron and Drizzle/SQLite for fully offline, fast, and completely private workflows.
- **Privacy Controls**: Crash reporting and telemetry opt-in capabilities designed with privacy by default.

### Changed
- Refactored entire application shell from legacy API interactions to a strict, statically-typed Phase-0 IPC contract architecture.
- Bundled FFmpeg into the application artifact to eliminate end-user dependencies.
