import { test, expect } from '@playwright/test'
import { toFtsPrefixQuery } from '../../src/main/domain/search/fts-query'
import { csvField, csvRow } from '../../src/main/domain/shared/csv'
import { validateSettingsUpdate } from '../../src/main/domain/settings/settings-update'
import { basename, dirname, pathDepth, stem } from '../../src/renderer/src/lib/paths'

// Pure tests for the audit's medium bugs (B3, B8, B10, B11) — no Electron.
test.describe('bug fixes', () => {
  test('B3: FTS query quotes every term so user text cannot break the syntax', () => {
    expect(toFtsPrefixQuery('foo-bar')).toBe('"foo-bar"*')
    expect(toFtsPrefixQuery('  a:b   AND  "x" ')).toBe('"a:b"* "AND"* "x"*')
    expect(toFtsPrefixQuery('"')).toBeNull()
    expect(toFtsPrefixQuery('   ')).toBeNull()
  })

  test('B10: CSV fields are quoted and formulas neutralised', () => {
    expect(csvField('say "hi"')).toBe('"say ""hi"""')
    expect(csvField('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"')
    expect(csvField('-2+3')).toBe('"\'-2+3"')
    expect(csvField(42)).toBe('42')
    expect(csvField(NaN)).toBe('')
    expect(csvField(null)).toBe('')
    expect(csvRow(['a,b', 1])).toBe('"a,b",1')
  })

  test('B8: settings updates accept only known keys with valid values', () => {
    expect(validateSettingsUpdate({ reducedMotion: true })).toEqual({
      ok: true,
      updates: { reducedMotion: true }
    })
    expect(validateSettingsUpdate({ id: 'other' }).ok).toBe(false)
    expect(validateSettingsUpdate({ reducedMotion: 'yes' }).ok).toBe(false)
    expect(validateSettingsUpdate({ historyRetentionDays: 0 }).ok).toBe(false)
    expect(validateSettingsUpdate({ mp4HistoryLimit: 2.5 }).ok).toBe(false)
    expect(validateSettingsUpdate({ defaultDestructiveBehavior: 'delete' }).ok).toBe(false)
    expect(validateSettingsUpdate({ ffmpegPath: null }).ok).toBe(true)
    expect(validateSettingsUpdate(null).ok).toBe(false)
    expect(validateSettingsUpdate({}).ok).toBe(false)
  })

  test('B11: path helpers handle both separators', () => {
    expect(basename('C:\\Videos\\clip.mp4')).toBe('clip.mp4')
    expect(basename('/Users/me/clip.mp4')).toBe('clip.mp4')
    expect(basename('/Users/me/folder/')).toBe('folder')
    expect(dirname('C:\\Videos\\clip.mp4')).toBe('C:\\Videos')
    expect(dirname('/a/b')).toBe('/a')
    expect(pathDepth('C:\\a\\b')).toBe(3)
    expect(pathDepth('/a/b')).toBe(2)
    expect(stem('/v/clip.final.mp4')).toBe('clip.final')
    expect(stem('/v/.hidden')).toBe('.hidden')
  })
})
