export interface ExtensionRule {
  id: string
  extensions: string[]
  folderName: string
  enabled: boolean
  icon: string
  color: string
}

export const DEFAULT_RULES: ExtensionRule[] = [
  {
    id: 'videos',
    extensions: [
      'mp4',
      'mkv',
      'avi',
      'mov',
      'wmv',
      'flv',
      'webm',
      'mpg',
      'mpeg',
      'm4v',
      'vid',
      'ts',
      '3gp'
    ],
    folderName: 'Videos',
    enabled: true,
    icon: '🎬',
    color: 'purple'
  },
  {
    id: 'music',
    extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus', 'aiff'],
    folderName: 'Music',
    enabled: true,
    icon: '🎵',
    color: 'blue'
  },
  {
    id: 'images',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'ico', 'heic', 'raw'],
    folderName: 'Images',
    enabled: true,
    icon: '🖼️',
    color: 'green'
  },
  {
    id: 'documents',
    extensions: ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt', 'rtf', 'odt', 'csv'],
    folderName: 'Documents',
    enabled: true,
    icon: '📄',
    color: 'orange'
  },
  {
    id: 'archives',
    extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'],
    folderName: 'Archives',
    enabled: true,
    icon: '📦',
    color: 'yellow'
  },
  {
    id: 'code',
    extensions: [
      'js',
      'ts',
      'jsx',
      'tsx',
      'py',
      'java',
      'cpp',
      'c',
      'cs',
      'html',
      'css',
      'scss',
      'json',
      'xml',
      'yaml',
      'yml',
      'sh',
      'rb',
      'go',
      'rs',
      'php',
      'swift',
      'kt'
    ],
    folderName: 'Code',
    enabled: false,
    icon: '💻',
    color: 'cyan'
  }
]

export const VIDEO_FORMATS = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'vid']
export const AUDIO_FORMATS = ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a']
export const IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif']

export const CONVERT_FORMAT_GROUPS = {
  video: {
    label: 'Video',
    icon: '🎬',
    formats: VIDEO_FORMATS
  },
  audio: {
    label: 'Audio',
    icon: '🎵',
    formats: AUDIO_FORMATS
  }
}
