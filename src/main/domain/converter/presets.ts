/**
 * Allow-listed conversion presets. The renderer selects one by `id`; the FFmpeg
 * arguments live only here in the main process, so no renderer input is ever
 * spliced into an FFmpeg command line (see docs/SYSTEM-ARCHITECTURE.md).
 */
export interface ConversionPreset {
  id: string
  name: string
  targetContainer: 'mp4' | 'mkv' | 'mp3' | 'wav' | 'aac'
  ffmpegArgs: readonly string[]
}

const PRESETS: readonly ConversionPreset[] = [
  {
    id: 'web-balanced',
    name: 'Web (Balanced MP4)',
    targetContainer: 'mp4',
    ffmpegArgs: [
      '-c:v',
      'libx264',
      '-crf',
      '23',
      '-preset',
      'medium',
      '-c:a',
      'aac',
      '-b:a',
      '192k'
    ]
  },
  {
    id: 'archive-h265',
    name: 'Archive (H.265 MKV)',
    targetContainer: 'mkv',
    ffmpegArgs: ['-c:v', 'libx265', '-crf', '28', '-preset', 'slow', '-c:a', 'copy']
  },
  {
    id: 'audio-mp3',
    name: 'Audio Only (MP3)',
    targetContainer: 'mp3',
    ffmpegArgs: ['-vn', '-c:a', 'libmp3lame', '-b:a', '192k']
  }
]

export function getConversionPreset(id: unknown): ConversionPreset | undefined {
  return typeof id === 'string' ? PRESETS.find((p) => p.id === id) : undefined
}

/** Display metadata for the UI — never the arguments. */
export function listConversionPresets(): Array<Omit<ConversionPreset, 'ffmpegArgs'>> {
  return PRESETS.map(({ id, name, targetContainer }) => ({ id, name, targetContainer }))
}
