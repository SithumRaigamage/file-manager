import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {
  validateContainer,
  parseRootBoxes,
  flattenBoxes
} from '../../src/main/domain/mp4analyzer/atom-parser'
import {
  buildPlaybackVerification,
  determineCorruption,
  getRecommendation
} from '../../src/main/domain/mp4analyzer/diagnosis'
import { analyzeMp4File, StreamAnalyzer } from '../../src/main/domain/mp4analyzer/file-analyzer'

// Pure Node tests — no Electron launch needed.

/** Builds an ISO-BMFF box: 4-byte size + 4-char type + payload. */
function box(type: string, payload: Buffer = Buffer.alloc(0)): Buffer {
  const header = Buffer.alloc(8)
  header.writeUInt32BE(8 + payload.length, 0)
  header.write(type, 4, 'ascii')
  return Buffer.concat([header, payload])
}

/** Non-zero filler so the zero-fill detector doesn't flag the fixture. */
function mediaBytes(n: number): Buffer {
  const b = Buffer.alloc(n)
  for (let i = 0; i < n; i++) b[i] = (i % 251) + 1
  return b
}

const fakeStreams = (healthy: boolean): StreamAnalyzer => ({
  probe: async () => ({
    duration: 10,
    resolution: '1920x1080',
    bitrate: 1000,
    codec: 'h264',
    fps: 30,
    audioCodec: 'aac'
  }),
  checkIntegrity: async (_p, _d, onProgress) => {
    onProgress(100)
    return healthy
      ? { errorCount: 0, warningCount: 0, decodableFrames: 300, totalFrames: 300, errorLogs: [] }
      : {
          errorCount: 150,
          warningCount: 0,
          decodableFrames: 150,
          totalFrames: 300,
          errorLogs: ['Error: x']
        }
  }
})

test.describe('mp4analyzer domain', () => {
  let dir: string
  const write = (name: string, data: Buffer): string => {
    const p = path.join(dir, name)
    fs.writeFileSync(p, data)
    return p
  }

  test.beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mp4-diagnosis-'))
  })
  test.afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))

  test('validateContainer', () => {
    expect(validateContainer(['ftyp', 'moov', 'mdat'])).toBe('healthy')
    expect(validateContainer(['ftyp', 'mdat', 'moov'])).toBe('warning')
    expect(validateContainer(['ftyp', 'mdat'])).toBe('corrupted')
    expect(validateContainer(['ftyp', 'moov'], 'read error')).toBe('corrupted')
  })

  test('parseRootBoxes walks nested moov/trak boxes', () => {
    const p = write(
      'nested.mp4',
      Buffer.concat([box('ftyp'), box('moov', box('trak', box('mdia')))])
    )
    expect(flattenBoxes(parseRootBoxes(p).boxes)).toEqual([
      'ftyp',
      'moov',
      'moov/trak',
      'moov/trak/mdia'
    ])
  })

  test('health score and corruption level', () => {
    expect(buildPlaybackVerification(null).healthScore).toBe(0)
    const v = buildPlaybackVerification({
      errorCount: 1,
      warningCount: 0,
      decodableFrames: 999,
      totalFrames: 1000,
      errorLogs: []
    })
    expect(v.healthScore).toBe(99.9)
    expect(v.corruptedFrames).toBe(1)
    expect(determineCorruption('corrupted', 100)).toBe('unrecoverable')
    expect(determineCorruption('healthy', 98)).toBe('healthy')
    expect(determineCorruption('healthy', 95)).toBe('minor')
    expect(determineCorruption('healthy', 80)).toBe('moderate')
    expect(determineCorruption('healthy', 50)).toBe('severe')
  })

  test('missing moov gets no repair command', () => {
    const rec = getRecommendation('unrecoverable', 'corrupted', '/x/a.mp4', ['ftyp', 'mdat'])
    expect(rec.command).toBeUndefined()
    expect(rec.action).toContain('untrunc')
    const damaged = getRecommendation('unrecoverable', 'corrupted', '/x/a.mp4', ['ftyp', 'moov'])
    expect(damaged.command).toContain('-c copy')
  })

  test('analyzeMp4File: healthy file with FFmpeg', async () => {
    const p = write(
      'ok.mp4',
      Buffer.concat([box('ftyp'), box('moov'), box('mdat', mediaBytes(256 * 1024))])
    )
    let progress = 0
    const r = await analyzeMp4File(p, fakeStreams(true), (x) => (progress = x))
    expect(r.corruptionLevel).toBe('healthy')
    expect(r.playbackVerification?.healthScore).toBe(100)
    expect(r.atomStructure).toEqual(['ftyp', 'moov', 'mdat'])
    expect(progress).toBe(100)
  })

  test('analyzeMp4File: decode errors lower the level', async () => {
    const p = write(
      'bad.mp4',
      Buffer.concat([box('ftyp'), box('moov'), box('mdat', mediaBytes(256 * 1024))])
    )
    const r = await analyzeMp4File(p, fakeStreams(false))
    expect(r.corruptionLevel).toBe('severe')
    expect(r.ffmpegValidation.errorCount).toBe(150)
    expect(r.recommendation.command).toBeDefined()
  })

  test('analyzeMp4File: missing moov is unrecoverable without calling FFmpeg', async () => {
    const p = write('nomoov.mp4', Buffer.concat([box('ftyp'), box('mdat', mediaBytes(256 * 1024))]))
    const r = await analyzeMp4File(p, {
      probe: async () => {
        throw new Error('should not probe')
      },
      checkIntegrity: async () => {
        throw new Error('should not decode')
      }
    })
    expect(r.corruptionLevel).toBe('unrecoverable')
    expect(r.recommendation.command).toBeUndefined()
  })

  test('analyzeMp4File: no FFmpeg falls back to structural checks', async () => {
    const p = write(
      'nofx.mp4',
      Buffer.concat([box('ftyp'), box('mdat', mediaBytes(256 * 1024)), box('moov')])
    )
    const r = await analyzeMp4File(p, null)
    expect(r.containerValidation).toBe('warning')
    expect(r.corruptionLevel).toBe('minor')
    expect(r.errorMsg).toContain('FFmpeg/FFprobe missing')
  })

  test('analyzeMp4File: zero-filled download and wrong extension', async () => {
    const zeros = write('empty.mp4', Buffer.alloc(4 * 1024 * 1024))
    expect((await analyzeMp4File(zeros, null)).errorMsg).toContain('Incomplete download')
    const txt = write('notes.txt', Buffer.from('hi'))
    expect((await analyzeMp4File(txt, null)).basicValidation).toBe('invalid')
  })
})
