/**
 * Converts free text into a safe FTS5 MATCH expression: each whitespace-separated
 * word becomes a quoted prefix term (`"foo-bar"*`), all ANDed together. Quoting
 * makes FTS5 treat `-`, `:`, `*`, `(`, `AND`/`OR`/`NOT` etc. as literal text, so
 * user input can never produce an FTS5 syntax error. Returns null for blank input.
 */
export function toFtsPrefixQuery(text: string): string | null {
  const terms = text
    .split(/\s+/)
    .map((word) => word.replace(/"/g, ''))
    .filter((word) => word.length > 0)
  if (terms.length === 0) return null
  return terms.map((word) => `"${word}"*`).join(' ')
}
