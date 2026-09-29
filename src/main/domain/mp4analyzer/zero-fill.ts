import * as fs from 'fs'
import type { Mp4FileResult } from '../../../renderer/src/types/mp4analyzer'

/**
 * Detects "preallocated but never filled" files: torrent clients and segmented
 * download managers reserve the full file size up front and write pieces as they
 * arrive, so an interrupted download has the right size but large all-zero holes.
 * Encoded audio/video essentially never contains a 64 KB run of pure zeros, so
 * sampling evenly spaced blocks is a cheap, reliable signal.
 */

export const ZERO_FILL_SAMPLE_COUNT = 32
export const ZERO_FILL_SAMPLE_BYTES = 64 * 1024
/** Fraction of sampled blocks that must be empty before we call it incomplete. */
export const INCOMPLETE_EMPTY_RATIO = 0.1

export interface ZeroFillReport {
  sampled: number
  empty: number
  /** True when the first block (where ftyp/moov headers live) is all zeros. */
  headerEmpty: boolean
}

export function isAllZero(buf: Uint8Array): boolean {
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0) return false
  }
  return true
}

/** Offsets of evenly spaced sample blocks, always including the first and last block. */
export function sampleOffsets(
  fileSize: number,
  count = ZERO_FILL_SAMPLE_COUNT,
  blockBytes = ZERO_FILL_SAMPLE_BYTES
): number[] {
  const lastStart = Math.max(0, fileSize - blockBytes)
  if (lastStart === 0 || count <= 1) return [0]
  const offsets = new Set<number>()
  for (let i = 0; i < count; i++) {
    offsets.add(Math.floor((lastStart * i) / (count - 1)))
  }
  return [...offsets]
}

export function isIncompleteDownload(report: ZeroFillReport): boolean {
  if (report.sampled === 0) return false
  return report.empty / report.sampled >= INCOMPLETE_EMPTY_RATIO
}

export function scanZeroFill(filePath: string, fileSize: number): ZeroFillReport {
  const offsets = sampleOffsets(fileSize)
  const buf = Buffer.alloc(ZERO_FILL_SAMPLE_BYTES)
  const fd = fs.openSync(filePath, 'r')
  try {
    let empty = 0
    let headerEmpty = false
    for (const offset of offsets) {
      const read = fs.readSync(fd, buf, 0, buf.length, offset)
      if (isAllZero(buf.subarray(0, read))) {
        empty++
        if (offset === 0) headerEmpty = true
      }
    }
    return { sampled: offsets.length, empty, headerEmpty }
  } finally {
    fs.closeSync(fd)
  }
}

export function buildIncompleteDownloadResult(
  filePath: string,
  fileName: string,
  fileSize: number,
  report: ZeroFillReport
): Mp4FileResult {
  const pct = Math.round((report.empty / report.sampled) * 100)
  return {
    filePath,
    fileName,
    fileSize,
    basicValidation: 'valid',
    containerValidation: 'corrupted',
    ffmpegValidation: { errorCount: 0, warningCount: 0, severity: 'unrecoverable' },
    metadata: null,
    playbackVerification: null,
    corruptionLevel: 'unrecoverable',
    recommendation: {
      action: `Incomplete download: about ${pct}% of the file was never written (it contains only empty bytes${
        report.headerEmpty ? ', including the header' : ''
      }). The file has its full size because the downloader reserved the space up front. This cannot be repaired — re-check the torrent/download in its client or download it again.`,
      confidence: 'high'
    },
    errorMsg: `Incomplete download: ~${pct}% of the file contains no data`
  }
}
