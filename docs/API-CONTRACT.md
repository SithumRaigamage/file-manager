# API-CONTRACT.md

> Adaptation note: FileFlow has no network API. Per SYSTEM-ARCHITECTURE.md, this document defines the **IPC contract** between the renderer (React) and main (Node.js) processes — the functional equivalent of a REST contract in this architecture. Same goals apply: standardized envelopes, strict serialization, and explicit error handling.

## Base Configuration

- All renderer→main calls go through a single `window.fileflow.*` namespace exposed via `contextBridge` in the preload script — no other main-process access is exposed.
- Every call is invoked as `fileflow.<domain>.<action>(payload)` and returns a Promise resolving to a standard envelope:

```ts
type IpcResponse<T> =
  { ok: true; data: T } | { ok: false; error: { code: string; message: string } }
```

- Long-running jobs (convert, large rename/organize batches) additionally emit progress events via `fileflow.<domain>.onProgress((event) => ...)`, separate from the resolving Promise.

## Serialization Rules

- Internal Node.js objects (fs.Stats, child_process handles) are **never** passed across the IPC boundary — only plain serializable data (paths, sizes, ISO date strings, status enums).
- File paths are always absolute, normalized per-OS before crossing the boundary.
- Null/undefined fields are normalized to `null` explicitly in all response payloads (no `undefined` across IPC).

## Domains & Actions (MVP)

### `fileflow.organizer`

- `listFolder(path: string) → FileEntry[]`
- `previewQuickRule(path: string, ruleId: QuickRuleId) → OrganizePreviewItem[]`
- `previewSmartRule(path: string, rule: SmartRuleDefinition) → OrganizePreviewItem[]`
- `applyOrganize(items: OrganizePreviewItem[]) → OrganizeResult`
- `watchFolder(path: string, ruleSet: RuleSet) → { watcherId: string }`
- `unwatchFolder(watcherId: string) → void`

### `fileflow.renamer`

- `previewRename(paths: string[], pattern: RenamePattern) → RenamePreviewItem[]` (includes conflict flags)
- `applyRename(items: RenamePreviewItem[]) → RenameResult`
- `undoRename(batchId: string) → void`

### `fileflow.converter`

- `enqueueConversion(paths: string[], preset: ConversionPreset) → { jobId: string }`
- `cancelConversion(jobId: string) → void`
- `onProgress(callback: (event: ConversionProgressEvent) => void) → unsubscribe fn`

### `fileflow.history`

- `listBatches(filter?: HistoryFilter) → BatchRecord[]`
- `revertBatch(batchId: string) → void`

## Endpoints Detail — Example: `applyRename`

**Request payload**

```ts
{
  items: Array<{ originalPath: string; newName: string }>
}
```

**Response**

```ts
{
  ok: true,
  data: {
    batchId: string;
    renamed: number;
    skipped: Array<{ path: string; reason: string }>;
  }
}
```

## Performance

- `listFolder` and preview calls must paginate/stream for folders exceeding [threshold, e.g. 5,000 entries] rather than returning the full list synchronously — prevents renderer jank on large directories (ties to SYSTEM-ARCHITECTURE.md scalability notes).
- Conversion and large batch operations are always async with progress events; no IPC call is allowed to block for more than ~200ms without emitting incremental progress.

## Error Codes (initial set — expand as needed)

- `FILE_NOT_FOUND`, `PERMISSION_DENIED`, `NAME_CONFLICT`, `FFMPEG_NOT_FOUND`, `CONVERSION_FAILED`, `INVALID_RULE_DEFINITION`, `WATCHER_LIMIT_EXCEEDED`.
