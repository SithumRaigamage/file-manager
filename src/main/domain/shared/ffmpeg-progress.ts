/**
 * Seconds from the LAST `time=HH:MM:SS(.ms)` in a chunk of FFmpeg stderr
 * (FFmpeg rewrites its stats line in place, so the last one is current).
 */
export function parseFfmpegTimeSeconds(stderrChunk: string): number | null {
  const matches = [...stderrChunk.matchAll(/time=\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/g)]
  const last = matches.at(-1)
  if (!last) return null
  return Number(last[1]) * 3600 + Number(last[2]) * 60 + Number(last[3])
}

/** 0–99 while running (100 is reserved for "finished"), or null if unknown. */
export function ffmpegProgressPercent(stderrChunk: string, durationSeconds: number): number | null {
  if (!(durationSeconds > 0)) return null
  const seconds = parseFfmpegTimeSeconds(stderrChunk)
  if (seconds === null) return null
  return Math.min(99, Math.max(0, Math.round((seconds / durationSeconds) * 100)))
}
