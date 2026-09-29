/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain, dialog, IpcMainInvokeEvent } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { spawn, execFile, ChildProcess } from 'child_process'
import { promisify } from 'util'
import { Mp4FileResult, Mp4Metadata, RepairId } from '../../renderer/src/types/mp4analyzer'

const execFileAsync = promisify(execFile)

// Track active child processes for cancellation
const activeProcesses = new Set<ChildProcess>()
let cancelRequested = false
// Incremented by every new scan. A scan whose generation is no longer current
// has been superseded: it must stop and must not emit progress, otherwise two
// scans interleave on the shared progress channel and the bar jumps around.
let scanGeneration = 0

function killActiveProcesses(): void {
  for (const proc of activeProcesses) {
    try {
      proc.kill()
    } catch {
      // ignore
    }
  }
  activeProcesses.clear()
}

// History is best-effort: a failed save must never fail the scan itself
function recordScan(input: SaveMp4ScanInput): void {
  try {
    saveMp4Scan(input)
  } catch (error) {
    console.error('Failed to save MP4 scan history:', error)
  }
}

function beginScan(): number {
  killActiveProcesses()
  cancelRequested = false
  return ++scanGeneration
}

import { resolveFFmpegPath, resolveFFprobePath } from '../features/converter/ffmpeg-locator'
import { saveMp4Scan, listMp4Scans, getMp4Scan, SaveMp4ScanInput } from '../db/mp4-scan-repo'
import { moveToTrash, TrashResult } from '../features/shared/trash'
import type { IpcResponse } from './ipc-response'
import { confirmDestructive, summarizePaths } from '../features/shared/confirm-dialog'
import { analyzeMp4File, StreamAnalyzer } from '../domain/mp4analyzer/file-analyzer'
import { checkBasicFile } from '../domain/mp4analyzer/diagnosis'
import { findMp4Files } from '../domain/mp4analyzer/find-mp4-files'
import { isRepairId, buildRepairArgs, repairOutputPath } from '../domain/mp4analyzer/repair'
import { resolveUniquePath } from '../domain/shared/unique-path'
import { csvRow } from '../domain/shared/csv'
import { ffmpegProgressPercent } from '../domain/shared/ffmpeg-progress'
import type { IntegrityCheckResult } from '../domain/mp4analyzer/diagnosis'

async function runFFprobeAnalysis(
  filePath: string,
  ffprobePath: string
): Promise<Mp4Metadata | null> {
  try {
    const { stdout } = await execFileAsync(ffprobePath, [
      '-v',
      'error',
      '-show_entries',
      'format=duration,bit_rate:stream=codec_name,r_frame_rate,width,height,codec_type',
      '-of',
      'json',
      filePath
    ])

    const data = JSON.parse(stdout)
    const streams = data.streams || []
    const format = data.format || {}

    const videoStream = streams.find((s: any) => s.codec_type === 'video')
    const audioStream = streams.find((s: any) => s.codec_type === 'audio')

    let fps = 0
    if (videoStream && videoStream.r_frame_rate) {
      const parts = videoStream.r_frame_rate.split('/')
      if (parts.length === 2) {
        const num = parseFloat(parts[0])
        const den = parseFloat(parts[1])
        if (den !== 0) {
          fps = Math.round((num / den) * 100) / 100
        }
      }
    }

    return {
      duration: parseFloat(format.duration || '0'),
      resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : 'Unknown',
      bitrate: parseInt(format.bit_rate || '0', 10),
      codec: videoStream ? videoStream.codec_name : 'Unknown',
      fps,
      audioCodec: audioStream ? audioStream.codec_name : 'None'
    }
  } catch (err) {
    console.error('ffprobe analysis failed:', err)
    return null
  }
}

function runFFmpegIntegrityCheck(
  filePath: string,
  ffmpegPath: string,
  totalDuration: number,
  onProgress: (progress: number) => void
): Promise<IntegrityCheckResult> {
  return new Promise((resolve) => {
    // Limit integrity check to the first 30 seconds of video to speed up scans by 10-100x.
    // Truncations and container defects are already caught by the binary atom box parser.
    const durationToCheck = totalDuration > 30 ? 30 : totalDuration
    const limitArgs = totalDuration > 30 ? ['-t', '30'] : []

    const proc = spawn(ffmpegPath, [
      '-v',
      'warning',
      '-threads',
      '0',
      ...limitArgs,
      '-i',
      filePath,
      '-f',
      'null',
      '-'
    ])
    activeProcesses.add(proc)

    let errorCount = 0
    let warningCount = 0
    let decodableFrames = 0
    let totalFrames = 0
    const errorLogs: string[] = []
    let lastProgress = -1

    // FFmpeg outputs decoding warnings/errors and stats to stderr
    proc.stderr.on('data', (data: Buffer) => {
      const text = data.toString()

      // Look for error/warning indicators. FFmpeg rewrites its stats line in
      // place using '\r', so split on both or the first (stale) time= wins.
      const lines = text.split(/[\r\n]+/)
      for (const line of lines) {
        if (!line.trim()) continue

        // Check if progress stats line
        // ffmpeg format typically: frame=  123 fps=0.0 q=-0.0 size=N/A time=00:00:04.20
        const frameMatch = line.match(/frame=\s*(\d+)/)
        const timeMatch = line.match(/time=(\s*\d+:\d+:\d+\.\d+|\s*\d+:\d+:\d+)/)

        if (frameMatch) {
          totalFrames = parseInt(frameMatch[1], 10)
        }

        const isStatsLine = line.includes('frame=') || line.includes('size=')
        if (isStatsLine && timeMatch && durationToCheck > 0) {
          const timeStr = timeMatch[1].trim()
          const timeParts = timeStr.split(':').map(Number)
          if (timeParts.length === 3) {
            const secs = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2]
            const progress = Math.min(99, Math.round((secs / durationToCheck) * 100))
            if (progress > lastProgress) {
              lastProgress = progress
              onProgress(progress)
            }
          }
        }

        // Count errors and warnings
        if (
          line.includes('[error]') ||
          line.includes('Error') ||
          line.includes('corrupt') ||
          line.includes('invalid') ||
          line.includes('Failed')
        ) {
          errorCount++
          if (errorLogs.length < 50) {
            errorLogs.push(`Error: ${line.trim()}`)
          }
        } else if (
          line.includes('[warning]') ||
          line.includes('warning') ||
          line.includes('Warning') ||
          line.includes('missed') ||
          line.includes('skip')
        ) {
          warningCount++
          if (errorLogs.length < 50) {
            errorLogs.push(`Warning: ${line.trim()}`)
          }
        }
      }
    })

    proc.on('close', () => {
      activeProcesses.delete(proc)

      // Assume decodable frames is total frames minus a percentage of errors
      // In a real scan, ffmpeg decoded frames is totalFrames.
      // If ffmpeg completed with code 0, decodable is high.
      if (totalFrames === 0 && totalDuration > 0) {
        // Fallback estimate if frame stat parsing failed
        totalFrames = Math.round(totalDuration * 24) || 100
      }

      // If ffmpeg errors, some frames were undecodable
      const corruptedFrames = Math.min(totalFrames, errorCount)
      decodableFrames = Math.max(0, totalFrames - corruptedFrames)

      resolve({
        errorCount,
        warningCount,
        decodableFrames,
        totalFrames,
        errorLogs
      })
    })

    proc.on('error', () => {
      activeProcesses.delete(proc)
      resolve({
        errorCount: 1,
        warningCount: 0,
        decodableFrames: 0,
        totalFrames: 100,
        errorLogs: ['Error: Failed to spawn FFmpeg process']
      })
    })
  })
}

/** Binds the FFprobe/FFmpeg runners to the resolved binaries; null if FFmpeg isn't installed. */
async function createStreamAnalyzer(): Promise<StreamAnalyzer | null> {
  try {
    const ffprobePath = await resolveFFprobePath()
    const ffmpegPath = await resolveFFmpegPath()
    return {
      probe: (filePath) => runFFprobeAnalysis(filePath, ffprobePath),
      checkIntegrity: (filePath, duration, onProgress) =>
        runFFmpegIntegrityCheck(filePath, ffmpegPath, duration, onProgress)
    }
  } catch {
    return null
  }
}

export function registerMp4AnalyzerHandlers(): void {
  ipcMain.handle(
    'mp4analyzer:analyzeFile',
    async (event, filePath: string): Promise<Mp4FileResult> => {
      const startedAt = new Date().toISOString()
      const generation = beginScan()
      const streams = await createStreamAnalyzer()
      const result = await analyzeMp4File(filePath, streams, (p) => {
        // Stream single-file scanning progress
        if (generation !== scanGeneration) return
        event.sender.send('mp4analyzer:progress', {
          scanned: p,
          total: 100,
          currentFile: path.basename(filePath)
        })
      })
      // Superseded scans are not recorded in history
      if (generation === scanGeneration) {
        recordScan({
          targetPath: filePath,
          targetType: 'file',
          startedAt,
          status: cancelRequested ? 'cancelled' : 'completed',
          filesFound: 1,
          results: [result]
        })
      }
      return result
    }
  )

  ipcMain.handle(
    'mp4analyzer:analyzeFolder',
    async (event, folderPath: string): Promise<Mp4FileResult[]> => {
      const startedAt = new Date().toISOString()
      const generation = beginScan()
      const isCurrent = (): boolean => generation === scanGeneration
      const results: Mp4FileResult[] = []

      // An unreadable root throws FolderNotReadableError, whose message tells the
      // user how to grant access; unreadable subfolders are skipped and reported.
      const { files, unreadable } = await findMp4Files(folderPath)
      if (unreadable.length > 0) {
        event.sender.send('mp4analyzer:skippedFolders', unreadable)
      }

      const total = files.length
      if (total === 0) return []

      const streams = await createStreamAnalyzer()

      for (let i = 0; i < total; i++) {
        if (cancelRequested || !isCurrent()) {
          break
        }

        const filePath = files[i]
        const fileName = path.basename(filePath)

        // Notify progress start
        event.sender.send('mp4analyzer:progress', {
          scanned: i,
          total,
          currentFile: fileName
        })

        results.push(
          await analyzeMp4File(filePath, streams, (p) => {
            // Send sub-progress for current file scan
            if (!isCurrent()) return
            event.sender.send('mp4analyzer:progress', {
              scanned: i + p / 100,
              total,
              currentFile: fileName
            })
          })
        )
      }

      // A superseded scan must not overwrite the newer scan's progress
      if (!isCurrent()) return results

      // Final progress state
      event.sender.send('mp4analyzer:progress', {
        scanned: total,
        total,
        currentFile: 'Scan complete'
      })

      recordScan({
        targetPath: folderPath,
        targetType: 'folder',
        startedAt,
        status: cancelRequested ? 'cancelled' : 'completed',
        filesFound: total,
        results
      })

      return results
    }
  )

  ipcMain.handle('mp4analyzer:listScans', () => {
    try {
      return { ok: true, data: listMp4Scans() }
    } catch (error) {
      return {
        ok: false,
        error: { code: 'HISTORY_LIST_FAILED', message: (error as Error).message }
      }
    }
  })

  ipcMain.handle('mp4analyzer:getScan', (_event, id: string) => {
    try {
      const scan = getMp4Scan(id)
      if (!scan) {
        return {
          ok: false,
          error: { code: 'SCAN_NOT_FOUND', message: 'This scan is no longer in history' }
        }
      }
      // Flag files moved or deleted since the scan; computed now, never stored
      const results = scan.results.map((r) => ({ ...r, missingOnDisk: !fs.existsSync(r.filePath) }))
      return { ok: true, data: { ...scan, results } }
    } catch (error) {
      return { ok: false, error: { code: 'HISTORY_GET_FAILED', message: (error as Error).message } }
    }
  })

  ipcMain.handle('mp4analyzer:cancel', () => {
    cancelRequested = true
    killActiveProcesses()
    return true
  })

  // The renderer sends which repair to run (an allow-listed id), never a command.
  // Input is validated here and the output path is chosen here, never overwriting.
  ipcMain.handle(
    'mp4analyzer:runRepair',
    async (
      event,
      filePath: string,
      repairId: RepairId
    ): Promise<{ success: boolean; repairedPath: string; error?: string }> => {
      if (!isRepairId(repairId)) {
        return { success: false, repairedPath: '', error: 'Unknown repair type' }
      }
      const basic = typeof filePath === 'string' ? checkBasicFile(filePath) : null
      if (!basic?.valid) {
        return { success: false, repairedPath: '', error: basic?.errorMsg ?? 'Invalid file' }
      }

      try {
        const ffmpegPath = await resolveFFmpegPath()
        const repairedPath = resolveUniquePath(repairOutputPath(filePath))
        const args = buildRepairArgs(repairId, filePath, repairedPath)
        // Duration lets progress be reported as a real percentage
        const durationSeconds = await resolveFFprobePath()
          .then((probe) => runFFprobeAnalysis(filePath, probe))
          .then((meta) => meta?.duration ?? 0)
          .catch(() => 0)

        return await new Promise((resolve) => {
          const proc = spawn(ffmpegPath, args)
          activeProcesses.add(proc)

          let stderr = ''
          let lastProgress = -1
          proc.stderr.on('data', (data: Buffer) => {
            const text = data.toString()
            stderr += text
            const progress = ffmpegProgressPercent(text, durationSeconds)
            if (progress !== null && progress > lastProgress) {
              lastProgress = progress
              event.sender.send('mp4analyzer:repairProgress', { filePath, progress })
            }
          })

          proc.on('close', (code) => {
            activeProcesses.delete(proc)
            if (code === 0) {
              resolve({ success: true, repairedPath })
            } else {
              const lastLine = stderr.split('\n').filter(Boolean).pop() || 'Repair execution failed'
              resolve({ success: false, repairedPath, error: lastLine })
            }
          })

          proc.on('error', (err) => {
            activeProcesses.delete(proc)
            resolve({ success: false, repairedPath, error: err.message })
          })
        })
      } catch (err) {
        return { success: false, repairedPath: '', error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(
    'mp4analyzer:exportCsv',
    async (_event, results: Mp4FileResult[]): Promise<boolean> => {
      const saveResult = await dialog.showSaveDialog({
        title: 'Export CSV Report',
        defaultPath: 'mp4_integrity_report.csv',
        filters: [{ name: 'CSV File', extensions: ['csv'] }]
      })

      if (saveResult.canceled || !saveResult.filePath) return false

      const header = csvRow([
        'File Name',
        'Path',
        'Size (Bytes)',
        'Duration (s)',
        'Resolution',
        'Codec',
        'Status',
        'Health %',
        'Errors',
        'Recommendation'
      ])
      const rows = results.map((r) =>
        csvRow([
          r.fileName,
          r.filePath,
          r.fileSize,
          r.metadata?.duration ?? 0,
          r.metadata?.resolution ?? 'N/A',
          r.metadata?.codec ?? 'N/A',
          r.corruptionLevel,
          r.corruptionLevel === 'unrecoverable' ? 0 : (r.playbackVerification?.healthScore ?? 100),
          r.ffmpegValidation.errorCount,
          r.recommendation.action
        ])
      )
      const csv = [header, ...rows].join('\n')

      try {
        fs.writeFileSync(saveResult.filePath, csv, 'utf-8')
        return true
      } catch (err) {
        console.error(err)
        return false
      }
    }
  )

  ipcMain.handle(
    'mp4analyzer:exportJson',
    async (_event, results: Mp4FileResult[]): Promise<boolean> => {
      const saveResult = await dialog.showSaveDialog({
        title: 'Export JSON Report',
        defaultPath: 'mp4_integrity_report.json',
        filters: [{ name: 'JSON File', extensions: ['json'] }]
      })

      if (saveResult.canceled || !saveResult.filePath) return false

      try {
        fs.writeFileSync(saveResult.filePath, JSON.stringify(results, null, 2), 'utf-8')
        return true
      } catch (err) {
        console.error(err)
        return false
      }
    }
  )

  // Corrupted videos are moved to the OS Trash (recoverable), never unlinked,
  // and only ever as individual files — never their containing folders.
  const trashVideos = async (
    event: IpcMainInvokeEvent,
    filePaths: string[]
  ): Promise<IpcResponse<TrashResult>> => {
    try {
      const existing = [...new Set(filePaths)].filter((p) => fs.existsSync(p))
      if (existing.length === 0) {
        return { ok: false, error: { code: 'NOT_FOUND', message: 'No files found to remove' } }
      }

      const names = existing.map((p) => path.basename(p))
      const confirmed = await confirmDestructive(event.sender, {
        title: 'Move Corrupted Videos to Trash',
        message:
          existing.length === 1
            ? `Move "${names[0]}" to the Trash?`
            : `Move ${existing.length} corrupted videos to the Trash?`,
        detail: `${summarizePaths(names)}\n\nOnly these files are affected. You can restore them from the Trash.`,
        confirmLabel: 'Move to Trash'
      })
      if (!confirmed) return { ok: true, data: { trashed: [], failed: [] } }

      return { ok: true, data: await moveToTrash(existing) }
    } catch (err) {
      return { ok: false, error: { code: 'TRASH_FAILED', message: (err as Error).message } }
    }
  }

  ipcMain.handle('mp4analyzer:deleteFile', (event, filePath: string) =>
    trashVideos(event, [filePath])
  )

  ipcMain.handle('mp4analyzer:deleteMultipleFiles', (event, filePaths: string[]) =>
    trashVideos(event, Array.isArray(filePaths) ? filePaths : [])
  )
}
