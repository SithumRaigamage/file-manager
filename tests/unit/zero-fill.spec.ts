import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {
  isAllZero,
  sampleOffsets,
  isIncompleteDownload,
  scanZeroFill,
  buildIncompleteDownloadResult,
  ZERO_FILL_SAMPLE_BYTES
} from '../../src/main/domain/mp4analyzer/zero-fill'

// Pure Node tests — no Electron launch needed.
test.describe('mp4analyzer zero-fill detection', () => {
  let dir: string

  test.beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-fill-'))
  })

  test.afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  function writeFile(name: string, data: Buffer): string {
    const p = path.join(dir, name)
    fs.writeFileSync(p, data)
    return p
  }

  function randomBytes(n: number): Buffer {
    const b = Buffer.alloc(n)
    for (let i = 0; i < n; i++) b[i] = (i * 2654435761) >>> 24 || 1
    return b
  }

  test('isAllZero', () => {
    expect(isAllZero(new Uint8Array(16))).toBe(true)
    expect(isAllZero(Uint8Array.from([0, 0, 1]))).toBe(false)
  })

  test('sampleOffsets covers first and last block', () => {
    const size = 10 * 1024 * 1024
    const offs = sampleOffsets(size)
    expect(offs[0]).toBe(0)
    expect(offs[offs.length - 1]).toBe(size - ZERO_FILL_SAMPLE_BYTES)
    expect(sampleOffsets(1000)).toEqual([0])
  })

  test('isIncompleteDownload threshold', () => {
    expect(isIncompleteDownload({ sampled: 32, empty: 0, headerEmpty: false })).toBe(false)
    expect(isIncompleteDownload({ sampled: 32, empty: 2, headerEmpty: false })).toBe(false)
    expect(isIncompleteDownload({ sampled: 32, empty: 24, headerEmpty: true })).toBe(true)
    expect(isIncompleteDownload({ sampled: 0, empty: 0, headerEmpty: false })).toBe(false)
  })

  test('fully written file is not flagged', () => {
    const p = writeFile('full.mp4', randomBytes(4 * 1024 * 1024))
    const report = scanZeroFill(p, fs.statSync(p).size)
    expect(report.empty).toBe(0)
    expect(isIncompleteDownload(report)).toBe(false)
  })

  test('preallocated file with empty header and holes is flagged', () => {
    const size = 4 * 1024 * 1024
    const data = Buffer.alloc(size) // all zeros
    randomBytes(size / 4).copy(data, size / 2) // one written piece in the middle
    const p = writeFile('partial.mp4', data)
    const report = scanZeroFill(p, size)
    expect(report.headerEmpty).toBe(true)
    expect(isIncompleteDownload(report)).toBe(true)

    const result = buildIncompleteDownloadResult(p, 'partial.mp4', size, report)
    expect(result.corruptionLevel).toBe('unrecoverable')
    expect(result.recommendation.command).toBeUndefined()
    expect(result.errorMsg).toContain('Incomplete download')
  })
})
