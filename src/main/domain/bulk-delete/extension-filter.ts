/**
 * Parses free-form extension input like "=.folx, MP4 .mp4" into ['folx', 'mp4'].
 * Accepts commas and/or whitespace as separators and an optional leading '=' or '.'.
 */
export function parseExtensions(input: string): string[] {
  const exts = input
    .split(/[\s,;]+/)
    .map((token) => token.trim().replace(/^=+/, '').replace(/^\.+/, '').toLowerCase())
    .filter((token) => token.length > 0)
  return [...new Set(exts)]
}

/** Case-insensitive suffix match, so multi-part extensions like "tar.gz" work too. */
export function matchesExtension(fileName: string, exts: string[]): boolean {
  const lower = fileName.toLowerCase()
  return exts.some((ext) => lower.endsWith('.' + ext))
}

/** Hidden (dot-prefixed) and system entries the finder never descends into or returns. */
export function isHiddenOrSystem(name: string): boolean {
  return name.startsWith('.') || name === 'node_modules'
}
