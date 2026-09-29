export interface SettingsUpdate {
  ffmpegPath?: string | null
  defaultDestructiveBehavior?: 'prompt' | 'always-copy'
  reducedMotion?: boolean
  telemetryOptIn?: boolean
  crashReportingOptIn?: boolean
  historyRetentionDays?: number
  mp4HistoryLimit?: number
  theme?: 'light' | 'dark' | 'system'
}

type Validator = (value: unknown) => boolean

const isBoolean: Validator = (v) => typeof v === 'boolean'
const intBetween =
  (min: number, max: number): Validator =>
  (v) =>
    Number.isInteger(v) && (v as number) >= min && (v as number) <= max

/** Writable settings and their rules. `id` and unknown columns are never writable. */
const RULES: Record<keyof SettingsUpdate, Validator> = {
  ffmpegPath: (v) => v === null || (typeof v === 'string' && v.length <= 4096),
  defaultDestructiveBehavior: (v) => v === 'prompt' || v === 'always-copy',
  reducedMotion: isBoolean,
  telemetryOptIn: isBoolean,
  crashReportingOptIn: isBoolean,
  historyRetentionDays: intBetween(1, 3650),
  mp4HistoryLimit: intBetween(0, 1000),
  theme: (v) => v === 'light' || v === 'dark' || v === 'system'
}

export type SettingsUpdateResult =
  { ok: true; updates: SettingsUpdate } | { ok: false; reason: string }

/** Validates a renderer-supplied settings patch against the allow-list. */
export function validateSettingsUpdate(input: unknown): SettingsUpdateResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, reason: 'Settings update must be an object' }
  }
  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    const rule = RULES[key as keyof SettingsUpdate]
    if (!rule) return { ok: false, reason: `Unknown setting: ${key}` }
    if (!rule(value)) return { ok: false, reason: `Invalid value for ${key}` }
    updates[key] = value
  }
  if (Object.keys(updates).length === 0) return { ok: false, reason: 'Nothing to update' }
  return { ok: true, updates: updates as SettingsUpdate }
}
