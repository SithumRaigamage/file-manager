/** Envelope every `fileflow` IPC handler resolves with (see docs/API-CONTRACT.md). */
export type IpcResponse<T> =
  { ok: true; data: T } | { ok: false; error: { code: string; message: string } }
