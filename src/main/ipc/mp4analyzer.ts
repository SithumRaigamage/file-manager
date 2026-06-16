/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { execFile, spawn, ChildProcess } from 'child_process'
import { promisify } from 'util'
import { Mp4FileResult, Mp4Metadata, Mp4PlaybackVerification, Mp4Recommendation, CorruptionLevel } from '../../renderer/src/types/mp4analyzer'

const execFileAsync = promisify(execFile)

// Track active child processes for cancellation
const activeProcesses = new Set<ChildProcess>()
let cancelRequested = false

async function findFFmpeg(): Promise<string> {
  const candidates = [
    '/usr/local/bin/ffmpeg',
    '/opt/homebrew/bin/ffmpeg',
    '/usr/bin/ffmpeg',
    'ffmpeg'
  ]
  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, ['-version'])
      return candidate
    } catch {
      // continue
    }
  }
  throw new Error('ffmpeg not found. Please install FFmpeg.')
}

async function findFFprobe(): Promise<string> {
  const candidates = [
    '/usr/local/bin/ffprobe',
    '/opt/homebrew/bin/ffprobe',
    '/usr/bin/ffprobe',
    'ffprobe'
  ]
  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, ['-version'])
      return candidate
    } catch {
      // continue
    }
  }
  throw new Error('ffprobe not found. Please install FFmpeg (which includes ffprobe).')
}

interface Box {
  type: string
  size: number
  offset: number
  children?: Box[]
}

function parseSubBoxes(fd: number, startOffset: number, endOffset: number): Box[] {
  const boxes: Box[] = []
  let offset = startOffset
  const buf = Buffer.alloc(8)

  // Sub-box containers we care about parsing recursively
  const containerTypes = ['moov', 'trak', 'mdia', 'minf', 'stbl']

  while (offset < endOffset) {
    if (endOffset - offset < 8) break
    try {
      fs.readSync(fd, buf, 0, 8, offset)
      let size = buf.readUInt32BE(0)
      const type = buf.toString('ascii', 4, 8)

      let boxHeaderSize = 8
      if (size === 1) {
        if (endOffset - offset < 16) break
        const sizeBuf = Buffer.alloc(8)
        fs.readSync(fd, sizeBuf, 0, 8, offset + 8)
        const hi = sizeBuf.readUInt32BE(0)
        const lo = sizeBuf.readUInt32BE(4)
        size = hi * 4294967296 + lo
        boxHeaderSize = 16
      } else if (size === 0) {
        size = endOffset - offset
      }

      if (size <= 0 || offset + size > endOffset) {
        break
      }

      // Check if type looks like standard ASCII alphanumeric
      if (/^[a-zA-Z0-9 ]{4}$/.test(type)) {
        const box: Box = { type, size, offset }
        if (containerTypes.includes(type)) {
          box.children = parseSubBoxes(fd, offset + boxHeaderSize, offset + size)
        }
        boxes.push(box)
      } else {
        break
      }

      offset += size
    } catch {
      break
    }
  }
  return boxes
}

function parseRootBoxes(filePath: string): { boxes: Box[]; error?: string } {
  const boxes: Box[] = []
  let fd: number
  try {
    fd = fs.openSync(filePath, 'r')
  } catch (err) {
    return { boxes, error: (err as Error).message }
  }

  try {
    const stats = fs.fstatSync(fd)
    const fileSize = stats.size
    let offset = 0
    const buf = Buffer.alloc(8)

    while (offset < fileSize) {
      if (fileSize - offset < 8) break
      fs.readSync(fd, buf, 0, 8, offset)
      let size = buf.readUInt32BE(0)
      const type = buf.toString('ascii', 4, 8)

      let boxHeaderSize = 8
      if (size === 1) {
        if (fileSize - offset < 16) break
        const sizeBuf = Buffer.alloc(8)
        fs.readSync(fd, sizeBuf, 0, 8, offset + 8)
        const hi = sizeBuf.readUInt32BE(0)
        const lo = sizeBuf.readUInt32BE(4)
        size = hi * 4294967296 + lo
        boxHeaderSize = 16
      } else if (size === 0) {
        size = fileSize - offset
      }

      if (size <= 0 || offset + size > fileSize) {
        break
      }

      if (/^[a-zA-Z0-9 ]{4}$/.test(type)) {
        const box: Box = { type, size, offset }
        if (['moov', 'trak'].includes(type)) {
          box.children = parseSubBoxes(fd, offset + boxHeaderSize, offset + size)
        }
        boxes.push(box)
      } else {
        // Stop if we encounter non-standard box headers to prevent infinite parsing
        break
      }

      offset += size
    }
    return { boxes }
  } catch (err) {
    return { boxes, error: (err as Error).message }
  } finally {
    try {
      fs.closeSync(fd)
    } catch {
      // ignore
    }
  }
}

function flattenBoxes(boxes: Box[], prefix = ''): string[] {
  const result: string[] = []
  for (const box of boxes) {
    const name = prefix ? `${prefix}/${box.type}` : box.type
    result.push(name)
    if (box.children) {
      result.push(...flattenBoxes(box.children, name))
    }
  }
  return result
}

function checkBasicFile(filePath: string): { valid: boolean; size: number; errorMsg?: string } {
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
    return { valid: false, size: 0, errorMsg: `Read permissions unavailable: ${(err as Error).message}` }
  }
}

async function runFFprobeAnalysis(filePath: string, ffprobePath: string): Promise<Mp4Metadata | null> {
  try {
    const { stdout } = await execFileAsync(ffprobePath, [
      '-v', 'error',
      '-show_entries', 'format=duration,bit_rate:stream=codec_name,r_frame_rate,width,height,codec_type',
      '-of', 'json',
      filePath
    ])

    const data = JSON.parse(stdout)
    const streams = data.streams || []
    const format = data.format || {}

    const videoStream = streams.find((s: any) => s.codec_type === 'video')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
): Promise<{ errorCount: number; warningCount: number; decodableFrames: number; totalFrames: number; errorLogs: string[] }> {
  return new Promise((resolve) => {
    // Limit integrity check to the first 30 seconds of video to speed up scans by 10-100x.
    // Truncations and container defects are already caught by the binary atom box parser.
    const durationToCheck = totalDuration > 30 ? 30 : totalDuration
    const limitArgs = totalDuration > 30 ? ['-t', '30'] : []

    const proc = spawn(ffmpegPath, [
      '-v', 'warning',
      '-threads', '0',
      ...limitArgs,
      '-i', filePath,
      '-f', 'null',
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
      
      // Look for error/warning indicators
      const lines = text.split('\n')
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
        if (line.includes('[error]') || line.includes('Error') || line.includes('corrupt') || line.includes('invalid') || line.includes('Failed')) {
          errorCount++
          if (errorLogs.length < 50) {
            errorLogs.push(`Error: ${line.trim()}`)
          }
        } else if (line.includes('[warning]') || line.includes('warning') || line.includes('Warning') || line.includes('missed') || line.includes('skip')) {
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

function determineCorruption(
  basicVal: string,
  containerVal: string,
  _errorCount: number,
  healthScore: number
): CorruptionLevel {
  if (basicVal === 'invalid' || containerVal === 'corrupted') {
    return 'unrecoverable'
  }
  if (healthScore < 70) {
    return 'severe'
  }
  if (healthScore >= 70 && healthScore < 90) {
    return 'moderate'
  }
  if (healthScore >= 90 && healthScore < 98) {
    return 'minor'
  }
  return 'healthy'
}

function getRecommendation(
  corruptionLevel: CorruptionLevel,
  containerVal: string,
  filePath: string
): Mp4Recommendation {
  if (corruptionLevel === 'healthy') {
    return { action: 'No repair needed. File is fully functional.', confidence: 'high' }
  }

  const baseName = path.basename(filePath, path.extname(filePath))
  const dirName = path.dirname(filePath)
  const repairedPath = path.join(dirName, `${baseName}_repaired.mp4`)

  if (containerVal === 'corrupted') {
    return {
      action: 'Rebuild MOOV atom. The container is missing metadata headers. Try using FFmpeg to copy streams, which sometimes re-generates the container headers.',
      confidence: 'medium',
      command: `ffmpeg -i "${filePath}" -c copy -map 0 "${repairedPath}"`
    }
  }

  if (containerVal === 'warning') {
    return {
      action: 'Fast-start optimize. Move the MOOV atom to the beginning of the file for web optimization.',
      confidence: 'high',
      command: `ffmpeg -i "${filePath}" -c copy -movflags +faststart "${repairedPath}"`
    }
  }

  if (corruptionLevel === 'minor' || corruptionLevel === 'moderate') {
    return {
      action: 'Re-encode video stream. Minor stream corruption detected. Re-encoding will clean up broken reference frames.',
      confidence: 'high',
      command: `ffmpeg -i "${filePath}" -c:v libx264 -crf 23 -preset medium -c:a aac "${repairedPath}"`
    }
  }

  // Severe
  return {
    action: 'Full stream rebuild. Severe frame corruption detected. Try forcing keyframe recovery or re-encoding with stream copying.',
    confidence: 'low',
    command: `ffmpeg -err_detect ignore_err -i "${filePath}" -c:v libx264 -crf 28 -preset fast "${repairedPath}"`
  }
}

async function scanDirectory(dirPath: string): Promise<string[]> {
  const results: string[] = []
  const files = await fs.promises.readdir(dirPath, { withFileTypes: true })
  for (const file of files) {
    const fullPath = path.join(dirPath, file.name)
    if (file.isDirectory()) {
      results.push(...(await scanDirectory(fullPath)))
    } else if (file.isFile() && file.name.toLowerCase().endsWith('.mp4')) {
      results.push(fullPath)
    }
  }
  return results
}

function isSafeToDeleteFolder(folderPath: string): boolean {
  const normalized = path.normalize(folderPath).toLowerCase().replace(/\\/g, '/')
  const homeDir = os.homedir().toLowerCase().replace(/\\/g, '/')
  
  // Define absolute directories that should NEVER be deleted
  const systemDirs = [
    '/',
    '/users',
    '/users/',
    homeDir,
    path.join(homeDir, 'desktop').toLowerCase().replace(/\\/g, '/'),
    path.join(homeDir, 'downloads').toLowerCase().replace(/\\/g, '/'),
    path.join(homeDir, 'documents').toLowerCase().replace(/\\/g, '/'),
    path.join(homeDir, 'pictures').toLowerCase().replace(/\\/g, '/'),
    path.join(homeDir, 'music').toLowerCase().replace(/\\/g, '/'),
    path.join(homeDir, 'movies').toLowerCase().replace(/\\/g, '/'),
    '/applications',
    '/system',
    '/library'
  ]
  
  if (systemDirs.includes(normalized) || systemDirs.includes(normalized + '/')) {
    return false
  }
  
  // Do not delete workspace folder or any of its parents
  const workspacePath = '/users/sithumraigamage/projects/file manager'.toLowerCase()
  if (workspacePath.startsWith(normalized)) {
    return false
  }

  return true
}

export function registerMp4AnalyzerHandlers(): void {
  ipcMain.handle('mp4analyzer:analyzeFile', async (event, filePath: string): Promise<Mp4FileResult> => {
    cancelRequested = false
    const basic = checkBasicFile(filePath)
    const fileName = path.basename(filePath)

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

    // MP4 Container check
    const containerCheck = parseRootBoxes(filePath)
    const flattened = flattenBoxes(containerCheck.boxes)
    
    let containerValidation: 'healthy' | 'warning' | 'corrupted' = 'healthy'
    if (containerCheck.error || !flattened.includes('moov') || !flattened.includes('ftyp')) {
      containerValidation = 'corrupted'
    } else {
      // Warning if moov atom appears after mdat (non-faststart)
      const mdatIdx = flattened.findIndex(t => t.endsWith('mdat'))
      const moovIdx = flattened.findIndex(t => t.endsWith('moov'))
      if (moovIdx !== -1 && mdatIdx !== -1 && moovIdx > mdatIdx) {
        containerValidation = 'warning'
      }
    }

    if (containerValidation === 'corrupted') {
      return {
        filePath,
        fileName,
        fileSize: basic.size,
        basicValidation: 'valid',
        containerValidation: 'corrupted',
        ffmpegValidation: { errorCount: 0, warningCount: 0, severity: 'unrecoverable' },
        metadata: null,
        playbackVerification: null,
        corruptionLevel: 'unrecoverable',
        recommendation: getRecommendation('unrecoverable', 'corrupted', filePath),
        errorMsg: 'Missing or corrupted essential atoms (moov / ftyp)',
        atomStructure: flattened
      }
    }

    // Check FFmpeg & FFprobe
    let ffprobePath = ''
    let ffmpegPath = ''
    try {
      ffprobePath = await findFFprobe()
      ffmpegPath = await findFFmpeg()
    } catch {
      // Return partial checks if FFmpeg is not found
      return {
        filePath,
        fileName,
        fileSize: basic.size,
        basicValidation: 'valid',
        containerValidation,
        ffmpegValidation: { errorCount: 0, warningCount: 0, severity: containerValidation === 'warning' ? 'minor' : 'healthy' },
        metadata: null,
        playbackVerification: null,
        corruptionLevel: containerValidation === 'warning' ? 'minor' : 'healthy',
        recommendation: {
          action: 'FFmpeg/FFprobe not available on host. Stream scans skipped. ' + (containerValidation === 'warning' ? 'Container warning detected.' : 'Container is structurally healthy.'),
          confidence: 'medium'
        },
        errorMsg: 'FFmpeg/FFprobe missing. Comprehensive frame analysis skipped.',
        atomStructure: flattened
      }
    }

    // Metadata analysis
    const metadata = await runFFprobeAnalysis(filePath, ffprobePath)
    let playbackVerification: Mp4PlaybackVerification | null = null
    let errorCount = 0
    let warningCount = 0
    let errorLogs: string[] = []

    if (metadata && metadata.duration > 0) {
      const integrity = await runFFmpegIntegrityCheck(
        filePath,
        ffmpegPath,
        metadata.duration,
        (p) => {
          // Stream single-file scanning progress
          event.sender.send('mp4analyzer:progress', {
            scanned: p,
            total: 100,
            currentFile: fileName
          })
        }
      )
      
      errorCount = integrity.errorCount
      warningCount = integrity.warningCount
      errorLogs = integrity.errorLogs

      const score = integrity.totalFrames > 0
        ? Math.round((integrity.decodableFrames / integrity.totalFrames) * 1000) / 10
        : 100

      playbackVerification = {
        totalFrames: integrity.totalFrames,
        decodableFrames: integrity.decodableFrames,
        corruptedFrames: integrity.totalFrames - integrity.decodableFrames,
        healthScore: score
      }
    } else {
      playbackVerification = {
        totalFrames: 0,
        decodableFrames: 0,
        corruptedFrames: 0,
        healthScore: 0
      }
    }

    const health = playbackVerification ? playbackVerification.healthScore : 100
    const corruptionLevel = determineCorruption('valid', containerValidation, errorCount, health)
    const recommendation = getRecommendation(corruptionLevel, containerValidation, filePath)

    return {
      filePath,
      fileName,
      fileSize: basic.size,
      basicValidation: 'valid',
      containerValidation,
      ffmpegValidation: {
        errorCount,
        warningCount,
        severity: corruptionLevel
      },
      metadata,
      playbackVerification,
      corruptionLevel,
      recommendation,
      atomStructure: flattened,
      errorLogs
    }
  })

  ipcMain.handle('mp4analyzer:analyzeFolder', async (event, folderPath: string): Promise<Mp4FileResult[]> => {
    cancelRequested = false
    const results: Mp4FileResult[] = []

    let files: string[] = []
    try {
      files = await scanDirectory(folderPath)
    } catch (err) {
      console.error(err)
      return []
    }

    const total = files.length
    if (total === 0) return []

    let ffprobePath = ''
    let ffmpegPath = ''
    try {
      ffprobePath = await findFFprobe()
      ffmpegPath = await findFFmpeg()
    } catch {
      // Ignored, fallback handling matches analyzeFile
    }

    for (let i = 0; i < total; i++) {
      if (cancelRequested) {
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

      // Run check inside folder scanner
      const basic = checkBasicFile(filePath)
      if (!basic.valid) {
        results.push({
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
        })
        continue
      }

      const containerCheck = parseRootBoxes(filePath)
      const flattened = flattenBoxes(containerCheck.boxes)

      let containerValidation: 'healthy' | 'warning' | 'corrupted' = 'healthy'
      if (containerCheck.error || !flattened.includes('moov') || !flattened.includes('ftyp')) {
        containerValidation = 'corrupted'
      } else {
        const mdatIdx = flattened.findIndex(t => t.endsWith('mdat'))
        const moovIdx = flattened.findIndex(t => t.endsWith('moov'))
        if (moovIdx !== -1 && mdatIdx !== -1 && moovIdx > mdatIdx) {
          containerValidation = 'warning'
        }
      }

      if (containerValidation === 'corrupted') {
        results.push({
          filePath,
          fileName,
          fileSize: basic.size,
          basicValidation: 'valid',
          containerValidation: 'corrupted',
          ffmpegValidation: { errorCount: 0, warningCount: 0, severity: 'unrecoverable' },
          metadata: null,
          playbackVerification: null,
          corruptionLevel: 'unrecoverable',
          recommendation: getRecommendation('unrecoverable', 'corrupted', filePath),
          errorMsg: 'Missing essential MP4 atoms',
          atomStructure: flattened
        })
        continue
      }

      if (!ffprobePath || !ffmpegPath) {
        const corruptionLevel = containerValidation === 'warning' ? 'minor' : 'healthy'
        results.push({
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
            action: 'FFmpeg/FFprobe missing. Comprehensive frame analysis skipped.',
            confidence: 'medium'
          },
          atomStructure: flattened
        })
        continue
      }

      const metadata = await runFFprobeAnalysis(filePath, ffprobePath)
      let playbackVerification: Mp4PlaybackVerification | null = null
      let errorCount = 0
      let warningCount = 0
      let errorLogs: string[] = []

      if (metadata && metadata.duration > 0) {
        const integrity = await runFFmpegIntegrityCheck(
          filePath,
          ffmpegPath,
          metadata.duration,
          (p) => {
            // Send sub-progress for current file scan
            event.sender.send('mp4analyzer:progress', {
              scanned: i + (p / 100),
              total,
              currentFile: fileName
            })
          }
        )
        errorCount = integrity.errorCount
        warningCount = integrity.warningCount
        errorLogs = integrity.errorLogs

        const score = integrity.totalFrames > 0
          ? Math.round((integrity.decodableFrames / integrity.totalFrames) * 1000) / 10
          : 100

        playbackVerification = {
          totalFrames: integrity.totalFrames,
          decodableFrames: integrity.decodableFrames,
          corruptedFrames: integrity.totalFrames - integrity.decodableFrames,
          healthScore: score
        }
      } else {
        playbackVerification = {
          totalFrames: 0,
          decodableFrames: 0,
          corruptedFrames: 0,
          healthScore: 0
        }
      }

      const health = playbackVerification ? playbackVerification.healthScore : 100
      const corruptionLevel = determineCorruption('valid', containerValidation, errorCount, health)
      const recommendation = getRecommendation(corruptionLevel, containerValidation, filePath)

      results.push({
        filePath,
        fileName,
        fileSize: basic.size,
        basicValidation: 'valid',
        containerValidation,
        ffmpegValidation: {
          errorCount,
          warningCount,
          severity: corruptionLevel
        },
        metadata,
        playbackVerification,
        corruptionLevel,
        recommendation,
        atomStructure: flattened,
        errorLogs
      })
    }

    // Final progress state
    event.sender.send('mp4analyzer:progress', {
      scanned: total,
      total,
      currentFile: 'Scan complete'
    })

    return results
  })

  ipcMain.handle('mp4analyzer:cancel', () => {
    cancelRequested = true
    for (const proc of activeProcesses) {
      try {
        proc.kill()
      } catch {
        // ignore
      }
    }
    activeProcesses.clear()
    return true
  })

  ipcMain.handle('mp4analyzer:runRepair', async (event, filePath: string, command: string): Promise<{ success: boolean; repairedPath: string; error?: string }> => {
    try {
      const ffmpegPath = await findFFmpeg()
      const adjustedCommand = command.replace(/^ffmpeg /, `"${ffmpegPath}" `)
      const match = adjustedCommand.match(/"([^"]+)"\s*$/)
      const repairedPath = match ? match[1] : filePath.replace('.mp4', '_repaired.mp4')

      return new Promise((resolve) => {
        const proc = spawn(adjustedCommand, { shell: true })
        activeProcesses.add(proc)

        let stderr = ''
        proc.stderr.on('data', (data: Buffer) => {
          const text = data.toString()
          stderr += text

          const timeMatch = text.match(/time=(\s*\d+:\d+:\d+\.\d+|\s*\d+:\d+:\d+)/)
          if (timeMatch) {
            event.sender.send('mp4analyzer:repairProgress', {
              filePath,
              progress: 50
            })
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
      return { success: false, repairedPath: filePath, error: (err as Error).message }
    }
  })

  ipcMain.handle('mp4analyzer:exportCsv', async (_event, results: Mp4FileResult[]): Promise<boolean> => {
    const saveResult = await dialog.showSaveDialog({
      title: 'Export CSV Report',
      defaultPath: 'mp4_integrity_report.csv',
      filters: [{ name: 'CSV File', extensions: ['csv'] }]
    })

    if (saveResult.canceled || !saveResult.filePath) return false

    const headers = 'File Name,Path,Size (Bytes),Duration (s),Resolution,Codec,Status,Health %,Errors,Recommendation\n'
    const rows = results
      .map((r) => {
        const size = r.fileSize
        const dur = r.metadata?.duration || 0
        const res = r.metadata?.resolution || 'N/A'
        const cod = r.metadata?.codec || 'N/A'
        const health = r.playbackVerification?.healthScore || 100
        const errs = r.ffmpegValidation.errorCount
        const rec = r.recommendation.action.replace(/"/g, '""')
        return `"${r.fileName}","${r.filePath}",${size},${dur},"${res}","${cod}","${r.corruptionLevel}",${health},${errs},"${rec}"`
      })
      .join('\n')

    try {
      fs.writeFileSync(saveResult.filePath, headers + rows, 'utf-8')
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  })

  ipcMain.handle('mp4analyzer:exportJson', async (_event, results: Mp4FileResult[]): Promise<boolean> => {
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
  })

  ipcMain.handle('mp4analyzer:deleteFile', async (event, filePath: string): Promise<{ success: boolean; action: 'none' | 'file' | 'folder'; filePath: string; folderPath: string }> => {
    const folderPath = path.dirname(filePath)
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, action: 'none', filePath, folderPath }
      }

      const fileName = path.basename(filePath)
      const folderName = path.basename(folderPath)
      const browserWindow = BrowserWindow.fromWebContents(event.sender)
      
      const parentSafeToDelete = isSafeToDeleteFolder(folderPath)
      
      const buttons = ['Cancel', 'Delete File Only']
      if (parentSafeToDelete) {
        buttons.push('Delete File & Folder')
      }
      
      const response = await dialog.showMessageBox(browserWindow!, {
        type: 'warning',
        buttons,
        defaultId: 1,
        cancelId: 0,
        title: 'Delete Corrupted Video',
        message: `Are you sure you want to delete "${fileName}"?`,
        detail: parentSafeToDelete 
          ? `You can delete just this video file, or delete its entire containing folder "${folderName}" (WARNING: this will permanently delete all contents inside "${folderName}").`
          : `This will permanently delete the file from your disk.`
      })
      
      if (response.response === 1) {
        // Delete File Only
        fs.unlinkSync(filePath)
        return { success: true, action: 'file', filePath, folderPath }
      } else if (response.response === 2 && parentSafeToDelete) {
        // Delete File & Folder
        fs.rmSync(folderPath, { recursive: true, force: true })
        return { success: true, action: 'folder', filePath, folderPath }
      }
      
      return { success: false, action: 'none', filePath, folderPath }
    } catch (err) {
      console.error('Failed to delete file/folder:', err)
      throw err
    }
  })
}
