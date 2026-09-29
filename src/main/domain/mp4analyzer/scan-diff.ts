import type { Mp4FileResult, Mp4ScanDiff } from '../../../renderer/src/types/mp4analyzer'

export interface Mp4ScanCounts {
  totalSize: number
  healthy: number
  corrupted: number
  repairable: number
  unrecoverable: number
}

/** Health counts for a scan; mirrors calculateSummary in the renderer's mp4AnalyzerStore. */
export function summarizeScan(results: Mp4FileResult[]): Mp4ScanCounts {
  const counts: Mp4ScanCounts = {
    totalSize: 0,
    healthy: 0,
    corrupted: 0,
    repairable: 0,
    unrecoverable: 0
  }
  for (const r of results) {
    counts.totalSize += r.fileSize
    if (r.corruptionLevel === 'healthy') {
      counts.healthy++
    } else if (r.corruptionLevel === 'unrecoverable') {
      counts.unrecoverable++
      counts.corrupted++
    } else {
      counts.repairable++
      counts.corrupted++
    }
  }
  return counts
}

/**
 * Compares a scan with the previous completed scan of the same target, by file path.
 * A cancelled scan only covers part of the target, so files it didn't reach are not
 * counted as removed.
 */
export function diffScans(
  previous: Mp4FileResult[],
  current: Mp4FileResult[],
  currentComplete: boolean
): Mp4ScanDiff {
  const prevByPath = new Map(previous.map((r) => [r.filePath, r]))
  const diff: Mp4ScanDiff = { newlyCorrupted: 0, fixed: 0, newFiles: 0, removedFiles: 0 }

  for (const r of current) {
    const prev = prevByPath.get(r.filePath)
    if (!prev) {
      diff.newFiles++
      continue
    }
    const wasHealthy = prev.corruptionLevel === 'healthy'
    const isHealthy = r.corruptionLevel === 'healthy'
    if (wasHealthy && !isHealthy) diff.newlyCorrupted++
    if (!wasHealthy && isHealthy) diff.fixed++
  }

  if (currentComplete) {
    const currentPaths = new Set(current.map((r) => r.filePath))
    for (const path of prevByPath.keys()) {
      if (!currentPaths.has(path)) diff.removedFiles++
    }
  }

  return diff
}
