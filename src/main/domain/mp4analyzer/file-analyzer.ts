import * as path from 'path'
import type { Mp4FileResult, Mp4Metadata } from '../../../renderer/src/types/mp4analyzer'
import { parseRootBoxes, flattenBoxes, validateContainer } from './atom-parser'
import {
  checkBasicFile,
  buildPlaybackVerification,
  determineCorruption,
  getRecommendation,
  IntegrityCheckResult
} from './diagnosis'
import { scanZeroFill, isIncompleteDownload, buildIncompleteDownloadResult } from './zero-fill'

/**
 * Process-spawning steps, injected so the pipeline stays free of child_process /
 * Electron and can be unit tested with fakes. `null` means FFmpeg/FFprobe are not
 * installed, in which case only the structural checks run.
 */
export interface StreamAnalyzer {
  probe(filePath: string): Promise<Mp4Metadata | null>
  checkIntegrity(
    filePath: string,
    duration: number,
    onProgress: (percent: number) => void
  ): Promise<IntegrityCheckResult>
}

/** Returns an "incomplete download" result if the file is mostly unwritten zero-filled space. */
function checkIncompleteDownload(
  filePath: string,
  fileName: string,
  fileSize: number
): Mp4FileResult | null {
  try {
    const report = scanZeroFill(filePath, fileSize)
    return isIncompleteDownload(report)
      ? buildIncompleteDownloadResult(filePath, fileName, fileSize, report)
      : null
  } catch {
    // Unreadable sample — let the regular container checks report the problem.
    return null
  }
}

/**
 * Full diagnosis of one MP4: basic file check → incomplete-download detection →
 * atom structure → (if FFmpeg is available) metadata probe and decode pass.
 */
export async function analyzeMp4File(
  filePath: string,
  streams: StreamAnalyzer | null,
  onProgress: (percent: number) => void = () => {}
): Promise<Mp4FileResult> {
  const fileName = path.basename(filePath)
  const basic = checkBasicFile(filePath)

  if (!basic.valid) {
    return {
      filePath,
      fileName,
      fileSize: basic.size,
      basicValidation: 'invalid',
      containerValidation: 'corrupted',
      ffmpegValidation: { errorCount: 0, warningCount: 0, severity: 'unrecoverable' },
      metadata: null,
      playbackVerification: null,
      corruptionLevel: 'unrecoverable',
      recommendation: { action: basic.errorMsg || 'Basic check failed', confidence: 'low' },
      errorMsg: basic.errorMsg
    }
  }

  const incomplete = checkIncompleteDownload(filePath, fileName, basic.size)
  if (incomplete) return incomplete

  const containerCheck = parseRootBoxes(filePath)
  const atomStructure = flattenBoxes(containerCheck.boxes)
  const containerValidation = validateContainer(atomStructure, containerCheck.error)

  if (containerValidation === 'corrupted') {
    return {
      filePath,
      fileName,
      fileSize: basic.size,
      basicValidation: 'valid',
      containerValidation,
      ffmpegValidation: { errorCount: 0, warningCount: 0, severity: 'unrecoverable' },
      metadata: null,
      playbackVerification: null,
      corruptionLevel: 'unrecoverable',
      recommendation: getRecommendation(
        'unrecoverable',
        containerValidation,
        filePath,
        atomStructure
      ),
      errorMsg: 'Missing or corrupted essential atoms (moov / ftyp)',
      atomStructure
    }
  }

  if (!streams) {
    const corruptionLevel = containerValidation === 'warning' ? 'minor' : 'healthy'
    return {
      filePath,
      fileName,
      fileSize: basic.size,
      basicValidation: 'valid',
      containerValidation,
      ffmpegValidation: { errorCount: 0, warningCount: 0, severity: corruptionLevel },
      metadata: null,
      playbackVerification: null,
      corruptionLevel,
      recommendation: {
        action:
          'FFmpeg/FFprobe not available on host. Stream scans skipped. ' +
          (containerValidation === 'warning'
            ? 'Container warning detected.'
            : 'Container is structurally healthy.'),
        confidence: 'medium'
      },
      errorMsg: 'FFmpeg/FFprobe missing. Comprehensive frame analysis skipped.',
      atomStructure
    }
  }

  const metadata = await streams.probe(filePath)
  const integrity =
    metadata && metadata.duration > 0
      ? await streams.checkIntegrity(filePath, metadata.duration, onProgress)
      : null

  const playbackVerification = buildPlaybackVerification(integrity)
  const corruptionLevel = determineCorruption(containerValidation, playbackVerification.healthScore)

  return {
    filePath,
    fileName,
    fileSize: basic.size,
    basicValidation: 'valid',
    containerValidation,
    ffmpegValidation: {
      errorCount: integrity?.errorCount ?? 0,
      warningCount: integrity?.warningCount ?? 0,
      severity: corruptionLevel
    },
    metadata,
    playbackVerification,
    corruptionLevel,
    recommendation: getRecommendation(corruptionLevel, containerValidation, filePath),
    atomStructure,
    errorLogs: integrity?.errorLogs ?? []
  }
}
