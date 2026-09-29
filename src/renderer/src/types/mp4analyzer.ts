export type CorruptionLevel = 'healthy' | 'minor' | 'moderate' | 'severe' | 'unrecoverable'

export interface Mp4Metadata {
  duration: number
  resolution: string
  bitrate: number
  codec: string
  fps: number
  audioCodec: string
}

export interface Mp4PlaybackVerification {
  totalFrames: number
  decodableFrames: number
  corruptedFrames: number
  healthScore: number
}

/** Allow-listed repair strategies; arguments are built in the main process. */
export type RepairId = 'remux' | 'faststart' | 'reencode' | 'reencode-tolerant'

export interface Mp4Recommendation {
  action: string
  confidence: 'high' | 'medium' | 'low'
  /** Which repair to run — the only thing the renderer sends back. */
  repairId?: RepairId
  /** Display/copy text for the equivalent command line. Never executed. */
  command?: string
}

export interface Mp4FileResult {
  filePath: string
  fileName: string
  fileSize: number
  basicValidation: 'valid' | 'invalid'
  containerValidation: 'healthy' | 'warning' | 'corrupted'
  ffmpegValidation: {
    errorCount: number
    warningCount: number
    severity: CorruptionLevel
  }
  metadata: Mp4Metadata | null
  playbackVerification: Mp4PlaybackVerification | null
  corruptionLevel: CorruptionLevel
  recommendation: Mp4Recommendation
  errorMsg?: string
  atomStructure?: string[]
  errorLogs?: string[]
  repairStatus?: 'idle' | 'repairing' | 'success' | 'error'
  repairedPath?: string
  // Set when reopening a saved scan and the file no longer exists on disk
  missingOnDisk?: boolean
}

export interface Mp4AnalyzerSummary {
  totalFiles: number
  healthyFiles: number
  corruptedFiles: number
  repairableFiles: number
  unrecoverableFiles: number
}

export interface Mp4ScanProgress {
  scanned: number
  total: number
  currentFile: string
  result?: Mp4FileResult
}

// Change compared with the previous completed scan of the same target
export interface Mp4ScanDiff {
  newlyCorrupted: number // was healthy, now not healthy
  fixed: number // was not healthy, now healthy
  newFiles: number
  removedFiles: number // only counted when this scan completed
}

// One row of scan history (never includes per-file results)
export interface Mp4ScanSummary {
  id: string
  targetPath: string
  targetType: 'file' | 'folder'
  startedAt: string
  finishedAt: string
  status: 'completed' | 'cancelled'
  filesFound: number
  filesScanned: number
  totalSize: number
  healthy: number
  corrupted: number
  repairable: number
  unrecoverable: number
  diff: Mp4ScanDiff | null // null = first scan of this target
}

export interface Mp4ScanRecord extends Mp4ScanSummary {
  results: Mp4FileResult[]
}
