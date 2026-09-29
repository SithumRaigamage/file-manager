import * as path from 'path'
import type { RepairId } from '../../../renderer/src/types/mp4analyzer'

interface RepairPreset {
  /** Options that must precede `-i` (input options). */
  inputArgs: readonly string[]
  outputArgs: readonly string[]
}

/**
 * Allow-listed FFmpeg repair strategies. The renderer only ever sends a
 * `RepairId`; paths and arguments are assembled here in the main process.
 */
const REPAIR_PRESETS: Record<RepairId, RepairPreset> = {
  remux: { inputArgs: [], outputArgs: ['-c', 'copy', '-map', '0'] },
  faststart: { inputArgs: [], outputArgs: ['-c', 'copy', '-movflags', '+faststart'] },
  reencode: {
    inputArgs: [],
    outputArgs: ['-c:v', 'libx264', '-crf', '23', '-preset', 'medium', '-c:a', 'aac']
  },
  'reencode-tolerant': {
    inputArgs: ['-err_detect', 'ignore_err'],
    outputArgs: ['-c:v', 'libx264', '-crf', '28', '-preset', 'fast']
  }
}

export function isRepairId(value: unknown): value is RepairId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(REPAIR_PRESETS, value)
}

/** `<dir>/<name>_repaired.mp4` — callers make it unique before use. */
export function repairOutputPath(inputPath: string): string {
  const base = path.basename(inputPath, path.extname(inputPath))
  return path.join(path.dirname(inputPath), `${base}_repaired.mp4`)
}

/**
 * FFmpeg argv for a repair. `-n` makes FFmpeg refuse to overwrite an existing
 * output, as a second guard behind the caller's unique output path.
 */
export function buildRepairArgs(id: RepairId, inputPath: string, outputPath: string): string[] {
  const preset = REPAIR_PRESETS[id]
  return ['-n', ...preset.inputArgs, '-i', inputPath, ...preset.outputArgs, outputPath]
}

/** Human-readable command for display/copy only — never parsed or executed. */
export function formatRepairCommand(id: RepairId, inputPath: string, outputPath: string): string {
  const preset = REPAIR_PRESETS[id]
  return [
    'ffmpeg',
    ...preset.inputArgs,
    '-i',
    `"${inputPath}"`,
    ...preset.outputArgs,
    `"${outputPath}"`
  ].join(' ')
}
