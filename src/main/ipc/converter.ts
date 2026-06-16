import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { execFile, spawn } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

async function findFFmpeg(): Promise<string> {
  // Try common paths
  const candidates = [
    '/usr/local/bin/ffmpeg',
    '/opt/homebrew/bin/ffmpeg',
    '/usr/bin/ffmpeg',
    'ffmpeg' // PATH fallback
  ]
  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, ['-version'])
      return candidate
    } catch {
      // continue
    }
  }
  throw new Error('ffmpeg not found. Please install it via: brew install ffmpeg')
}

export interface ConvertJob {
  inputPath: string
  outputFormat: string
  outputDir: string
  outputName?: string
  videoQuality?: 'high' | 'medium' | 'low'
  audioQuality?: 'high' | 'medium' | 'low'
}

export interface ConvertResult {
  success: boolean
  outputPath?: string
  error?: string
}

const VIDEO_QUALITY_MAP = {
  high: ['23', 'slow'],
  medium: ['28', 'medium'],
  low: ['35', 'fast']
}

const AUDIO_QUALITY_MAP = {
  high: '320k',
  medium: '192k',
  low: '128k'
}

function buildFFmpegArgs(job: ConvertJob, outputPath: string): string[] {
  const args: string[] = ['-i', job.inputPath, '-y']
  const ext = job.outputFormat.toLowerCase()

  if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'vid'].includes(ext)) {
    const [crf, preset] = VIDEO_QUALITY_MAP[job.videoQuality ?? 'medium']
    if (ext === 'webm') {
      args.push('-c:v', 'libvpx-vp9', '-crf', crf, '-b:v', '0', '-c:a', 'libopus')
    } else if (ext === 'avi') {
      args.push('-c:v', 'mpeg4', '-q:v', '5', '-c:a', 'mp3')
    } else {
      args.push('-c:v', 'libx264', '-crf', crf, '-preset', preset, '-c:a', 'aac', '-b:a', '192k')
    }
  } else if (['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a'].includes(ext)) {
    const bitrate = AUDIO_QUALITY_MAP[job.audioQuality ?? 'medium']
    args.push('-vn')
    if (ext === 'mp3') {
      args.push('-c:a', 'libmp3lame', '-b:a', bitrate)
    } else if (ext === 'flac') {
      args.push('-c:a', 'flac')
    } else if (ext === 'ogg') {
      args.push('-c:a', 'libvorbis', '-b:a', bitrate)
    } else {
      args.push('-c:a', ext === 'aac' ? 'aac' : 'copy', '-b:a', bitrate)
    }
  }

  args.push(outputPath)
  return args
}

export function registerConverterHandlers(): void {
  ipcMain.handle('converter:checkFFmpeg', async () => {
    try {
      const ffmpegPath = await findFFmpeg()
      return { available: true, path: ffmpegPath }
    } catch (err) {
      return { available: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('converter:convert', async (event, job: ConvertJob): Promise<ConvertResult> => {
    try {
      const ffmpegPath = await findFFmpeg()
      const baseName = job.outputName ?? path.basename(job.inputPath, path.extname(job.inputPath))
      const outputPath = path.join(job.outputDir, `${baseName}.${job.outputFormat}`)

      if (!fs.existsSync(job.outputDir)) {
        fs.mkdirSync(job.outputDir, { recursive: true })
      }

      const isVid = job.outputFormat.toLowerCase() === 'vid'
      const ffmpegOutputPath = isVid ? path.join(job.outputDir, `${baseName}.mp4`) : outputPath

      const args = buildFFmpegArgs(job, ffmpegOutputPath)

      return new Promise((resolve) => {
        const proc = spawn(ffmpegPath, args)
        let duration = 0
        let stderr = ''

        proc.stderr.on('data', (data: Buffer) => {
          const text = data.toString()
          stderr += text

          // Parse duration
          const durationMatch = text.match(/Duration: (\d+):(\d+):(\d+)/)
          if (durationMatch) {
            const [, h, m, s] = durationMatch.map(Number)
            duration = h * 3600 + m * 60 + s
          }

          // Parse progress
          const timeMatch = text.match(/time=(\d+):(\d+):(\d+)/)
          if (timeMatch && duration > 0) {
            const [, h, m, s] = timeMatch.map(Number)
            const current = h * 3600 + m * 60 + s
            const progress = Math.min(100, Math.round((current / duration) * 100))
            event.sender.send('converter:progress', { progress, inputPath: job.inputPath })
          }
        })

        proc.on('close', (code) => {
          if (code === 0) {
            if (job.outputFormat.toLowerCase() === 'vid' && ffmpegOutputPath !== outputPath) {
              try {
                fs.renameSync(ffmpegOutputPath, outputPath)
              } catch (renameErr) {
                resolve({ success: false, error: `Rename failed: ${(renameErr as Error).message}` })
                return
              }
            }
            resolve({ success: true, outputPath })
          } else {
            const lastLine = stderr.split('\n').filter(Boolean).pop() ?? 'Unknown error'
            resolve({ success: false, error: lastLine })
          }
        })

        proc.on('error', (err) => {
          resolve({ success: false, error: err.message })
        })
      })
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
