/**
 * Returns a gate that opens at most once per `intervalMs`. Used to cap
 * high-frequency progress IPC (one message per match would flood the renderer).
 */
export function createThrottle(intervalMs: number, now: () => number = Date.now): () => boolean {
  let last = -Infinity
  return () => {
    const t = now()
    if (t - last < intervalMs) return false
    last = t
    return true
  }
}
