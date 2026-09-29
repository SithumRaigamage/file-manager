import * as fs from 'fs'
import * as path from 'path'
import type {
  CorruptionLevel,
  Mp4PlaybackVerification,
  Mp4Recommendation,
  RepairId
} from '../../../renderer/src/types/mp4analyzer'
import type { ContainerValidation } from './atom-parser'
import { repairOutputPath, formatRepairCommand } from './repair'

export interface BasicFileCheck {
  valid: boolean
  size: number
  errorMsg?: string
}

export interface IntegrityCheckResult {
  errorCount: number
  warningCount: number
  decodableFrames: number
  totalFrames: number
  errorLogs: string[]
}

export function checkBasicFile(filePath: string): BasicFileCheck {
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, size: 0, errorMsg: 'File does not exist' }
    }
    const stats = fs.statSync(filePath)
    if (!stats.isFile()) {
      return { valid: false, size: 0, errorMsg: 'Not a regular file' }
    }
    if (stats.size === 0) {
      return { valid: false, size: 0, errorMsg: 'File size is 0 bytes' }
    }
    const ext = path.extname(filePath).toLowerCase()
    if (ext !== '.mp4') {
      return { valid: false, size: stats.size, errorMsg: 'File extension is not .mp4' }
    }
    // Check read permission
    fs.accessSync(filePath, fs.constants.R_OK)
    return { valid: true, size: stats.size }
  } catch (err) {
    return {
      valid: false,
      size: 0,
      errorMsg: `Read permissions unavailable: ${(err as Error).message}`
    }
  }
}

/** Frame-level playback score (0–100, one decimal) from an FFmpeg decode pass. */
export function buildPlaybackVerification(
  integrity: IntegrityCheckResult | null
): Mp4PlaybackVerification {
  if (!integrity) {
    // No decodable duration — nothing could be played back
    return { totalFrames: 0, decodableFrames: 0, corruptedFrames: 0, healthScore: 0 }
  }
  const healthScore =
    integrity.totalFrames > 0
      ? Math.round((integrity.decodableFrames / integrity.totalFrames) * 1000) / 10
      : 100
  return {
    totalFrames: integrity.totalFrames,
    decodableFrames: integrity.decodableFrames,
    corruptedFrames: integrity.totalFrames - integrity.decodableFrames,
    healthScore
  }
}

export function determineCorruption(
  containerVal: ContainerValidation,
  healthScore: number
): CorruptionLevel {
  if (containerVal === 'corrupted') return 'unrecoverable'
  if (healthScore < 70) return 'severe'
  if (healthScore < 90) return 'moderate'
  if (healthScore < 98) return 'minor'
  return 'healthy'
}

export function getRecommendation(
  corruptionLevel: CorruptionLevel,
  containerVal: ContainerValidation,
  filePath: string,
  atoms: string[] = []
): Mp4Recommendation {
  if (corruptionLevel === 'healthy') {
    return { action: 'No repair needed. File is fully functional.', confidence: 'high' }
  }

  const repairedPath = repairOutputPath(filePath)
  const withRepair = (repairId: RepairId): Pick<Mp4Recommendation, 'repairId' | 'command'> => ({
    repairId,
    command: formatRepairCommand(repairId, filePath, repairedPath)
  })

  if (containerVal === 'corrupted' && !atoms.includes('moov')) {
    // Without moov FFmpeg cannot demux the file at all ("Invalid data found when
    // processing input"), so offering a stream-copy command would always fail.
    return {
      action:
        'MOOV atom is missing (usually an interrupted recording or incomplete download). FFmpeg cannot read this file. Recovery requires a tool such as untrunc with a healthy reference video recorded by the same camera/app and settings.',
      confidence: 'low'
    }
  }

  if (containerVal === 'corrupted') {
    return {
      action:
        'Rebuild container. Some essential atoms are damaged. Try using FFmpeg to copy streams, which sometimes re-generates the container headers.',
      confidence: 'low',
      ...withRepair('remux')
    }
  }

  if (containerVal === 'warning') {
    return {
      action:
        'Fast-start optimize. Move the MOOV atom to the beginning of the file for web optimization.',
      confidence: 'high',
      ...withRepair('faststart')
    }
  }

  if (corruptionLevel === 'minor' || corruptionLevel === 'moderate') {
    return {
      action:
        'Re-encode video stream. Minor stream corruption detected. Re-encoding will clean up broken reference frames.',
      confidence: 'high',
      ...withRepair('reencode')
    }
  }

  // Severe
  return {
    action:
      'Full stream rebuild. Severe frame corruption detected. Try forcing keyframe recovery or re-encoding with stream copying.',
    confidence: 'low',
    ...withRepair('reencode-tolerant')
  }
}
