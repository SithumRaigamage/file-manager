import { test, expect } from '@playwright/test'
import {
  parseFfmpegTimeSeconds,
  ffmpegProgressPercent
} from '../../src/main/domain/shared/ffmpeg-progress'
import { validateSettingsUpdate } from '../../src/main/domain/settings/settings-update'

// Pure tests for the audit's UI/UX fixes (U3, U7) — no Electron.
test.describe('ux helpers', () => {
  test('U7: FFmpeg progress uses the latest time= stamp', () => {
    const chunk = 'frame=  10 time=00:00:05.00 bitrate=1\rframe=  20 time=00:01:30.50 bitrate=1'
    expect(parseFfmpegTimeSeconds(chunk)).toBe(90.5)
    expect(parseFfmpegTimeSeconds('no stats here')).toBeNull()
    expect(ffmpegProgressPercent(chunk, 181)).toBe(50)
    expect(ffmpegProgressPercent('time=00:10:00.00', 60)).toBe(99) // never claims done early
    expect(ffmpegProgressPercent(chunk, 0)).toBeNull()
  })

  test('U3: theme setting is validated', () => {
    expect(validateSettingsUpdate({ theme: 'dark' }).ok).toBe(true)
    expect(validateSettingsUpdate({ theme: 'system' }).ok).toBe(true)
    expect(validateSettingsUpdate({ theme: 'purple' }).ok).toBe(false)
  })
})
