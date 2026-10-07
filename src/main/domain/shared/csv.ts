/**
 * One RFC 4180 CSV field. Text is always quoted with embedded quotes doubled,
 * and values a spreadsheet would run as a formula (leading = + - @ or control
 * chars, per OWASP "CSV injection") are prefixed with ' so they stay text.
 */
export function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export function csvRow(values: Array<string | number | null | undefined>): string {
  return values.map(csvField).join(',')
}
