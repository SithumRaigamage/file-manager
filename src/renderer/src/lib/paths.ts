/**
 * Path helpers for display in the renderer. Paths come from the main process in
 * the host OS's format, so both `/` and `\` must be treated as separators.
 */
const SEPARATOR = /[\\/]+/

/** Last path segment: "C:\\a\\b.txt" and "/a/b.txt" both → "b.txt". */
export function basename(fullPath: string): string {
  const parts = fullPath.split(SEPARATOR).filter(Boolean)
  return parts[parts.length - 1] ?? fullPath
}

/** Everything before the last segment, in the path's original separators. */
export function dirname(fullPath: string): string {
  const match = /^(.*)[\\/][^\\/]*$/.exec(fullPath)
  return match ? match[1] : ''
}

/** Number of segments — used to order folders shallow → deep. */
export function pathDepth(fullPath: string): number {
  return fullPath.split(SEPARATOR).filter(Boolean).length
}

/** File name without its final extension: "clip.final.mp4" → "clip.final". */
export function stem(fullPath: string): string {
  const name = basename(fullPath)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}
