import { test, expect } from '@playwright/test'
import {
  parseRange,
  mediaPathFromUrl,
  mediaMimeType
} from '../../src/main/domain/shared/media-request'
import { openBlockReason, isSafeExternalUrl } from '../../src/main/domain/shared/open-policy'
import {
  buildRepairArgs,
  isRepairId,
  formatRepairCommand
} from '../../src/main/domain/mp4analyzer/repair'
import { getConversionPreset, listConversionPresets } from '../../src/main/domain/converter/presets'

// Pure Node tests for the audit's security fixes (S1–S5) — no Electron.
test.describe('security policy', () => {
  test('parseRange handles all single-range forms', () => {
    expect(parseRange(null, 1000)).toBeNull()
    expect(parseRange('bytes=0-99', 1000)).toEqual({ start: 0, end: 99 })
    expect(parseRange('bytes=900-', 1000)).toEqual({ start: 900, end: 999 })
    expect(parseRange('bytes=-100', 1000)).toEqual({ start: 900, end: 999 })
    expect(parseRange('bytes=0-5000', 1000)).toEqual({ start: 0, end: 999 })
    expect(parseRange('bytes=1000-', 1000)).toBe('unsatisfiable')
    expect(parseRange('bytes=50-10', 1000)).toBe('unsatisfiable')
    expect(parseRange('bytes=0-1,5-9', 1000)).toBeNull() // multi-range → whole file
    expect(parseRange('items=0-1', 1000)).toBeNull()
  })

  test('mediaPathFromUrl only accepts encoded absolute paths on the fixed host', () => {
    const p = '/Users/me/My Videos/#1 clip?.mp4'
    expect(mediaPathFromUrl(`media://local/${encodeURIComponent(p)}`)).toBe(p)
    expect(mediaPathFromUrl('media://evil/%2Fetc%2Fpasswd')).toBeNull()
    expect(mediaPathFromUrl(`media://local/${encodeURIComponent('relative/a.mp4')}`)).toBeNull()
    expect(mediaPathFromUrl('https://local/%2Fa.mp4')).toBeNull()
    expect(mediaMimeType('/a/b.MP4')).toBe('video/mp4')
    expect(mediaMimeType('/a/id_rsa')).toBeUndefined()
  })

  test('openBlockReason refuses launchable and executable targets', () => {
    const t = (p: string, isDirectory = false, isExecutable = false): string | null =>
      openBlockReason({ path: p, isDirectory, isExecutable })
    expect(t('/Applications/Evil.app', true)).not.toBeNull()
    expect(t('/tmp/run.command')).not.toBeNull()
    expect(t('C:\\x\\setup.EXE')).not.toBeNull()
    expect(t('/tmp/noext-script', false, true)).not.toBeNull()
    expect(t('/tmp/photo.jpg')).toBeNull()
    expect(t('/Users/me/Documents', true)).toBeNull()
  })

  test('isSafeExternalUrl allows only web links', () => {
    expect(isSafeExternalUrl('https://example.org')).toBe(true)
    expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false)
    expect(isSafeExternalUrl('smb://host/share')).toBe(false)
    expect(isSafeExternalUrl('not a url')).toBe(false)
  })

  test('repair args come only from the allow-list and never overwrite', () => {
    expect(isRepairId('remux')).toBe(true)
    expect(isRepairId('-y -i /etc/passwd')).toBe(false)
    expect(isRepairId('__proto__')).toBe(false)
    const args = buildRepairArgs('reencode-tolerant', '/v/in.mp4', '/v/in_repaired.mp4')
    expect(args[0]).toBe('-n')
    expect(args.indexOf('-err_detect')).toBeLessThan(args.indexOf('-i'))
    expect(args.at(-1)).toBe('/v/in_repaired.mp4')
    expect(formatRepairCommand('remux', '/v/a.mp4', '/v/b.mp4')).toBe(
      'ffmpeg -i "/v/a.mp4" -c copy -map 0 "/v/b.mp4"'
    )
  })

  test('conversion presets resolve by id only and never expose args', () => {
    expect(getConversionPreset('web-balanced')?.targetContainer).toBe('mp4')
    expect(getConversionPreset('unknown')).toBeUndefined()
    expect(getConversionPreset({ id: 'web-balanced' })).toBeUndefined()
    for (const p of listConversionPresets()) expect('ffmpegArgs' in p).toBe(false)
  })
})
