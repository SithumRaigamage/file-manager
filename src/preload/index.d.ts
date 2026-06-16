import { ElectronAPI } from '@electron-toolkit/preload'

export interface OrganizerPreviewItem {
  sourcePath: string
  destinationPath: string
  fileName: string
  extension: string
  category: string
  size: number
}

export interface RenamePreviewItem {
  sourcePath: string
  oldName: string
  newName: string
  newPath: string
  conflict: boolean
}

export interface ExtensionRule {
  extensions: string[]
  folderName: string
  enabled: boolean
}

export interface OrganizerJob {
  sourceDir: string
  rules: ExtensionRule[]
  createSubfolders: boolean
  mode: 'move' | 'copy'
}

export interface RenamePattern {
  type: 'sequential' | 'prefix' | 'suffix' | 'replace' | 'date'
  prefix?: string
  suffix?: string
  separator?: string
  startIndex?: number
  find?: string
  replaceWith?: string
  dateFormat?: string
  extension?: 'keep' | 'lowercase' | 'uppercase'
}

export interface ConvertJob {
  inputPath: string
  outputFormat: string
  outputDir: string
  outputName?: string
  videoQuality?: 'high' | 'medium' | 'low'
  audioQuality?: 'high' | 'medium' | 'low'
}

export interface AppAPI {
  openDirectory: () => Promise<string | null>
  openFiles: () => Promise<string[]>
  openPath: (path: string) => Promise<void>
  organizer: {
    preview: (job: OrganizerJob) => Promise<OrganizerPreviewItem[]>
    execute: (
      job: OrganizerJob
    ) => Promise<{ success: boolean; processed: number; skipped: number; errors: string[] }>
    scan: (dirPath: string) => Promise<{ totalFiles: number; byExtension: Record<string, number> }>
    onProgress: (
      cb: (data: { processed: number; total: number; fileName: string }) => void
    ) => () => void
  }
  renamer: {
    preview: (filePaths: string[], pattern: RenamePattern) => Promise<RenamePreviewItem[]>
    execute: (
      items: RenamePreviewItem[]
    ) => Promise<{ success: boolean; renamed: number; errors: string[] }>
    undo: (items: RenamePreviewItem[]) => Promise<{ success: boolean; errors: string[] }>
    listFiles: (
      dirPath: string
    ) => Promise<Array<{ name: string; path: string; ext: string; size: number; mtime: string }>>
  }
  converter: {
    checkFFmpeg: () => Promise<{ available: boolean; path?: string; error?: string }>
    convert: (job: ConvertJob) => Promise<{ success: boolean; outputPath?: string; error?: string }>
    onProgress: (cb: (data: { progress: number; inputPath: string }) => void) => () => void
  }
  mp4analyzer: {
    analyzeFile: (filePath: string) => Promise<import('../renderer/src/types/mp4analyzer').Mp4FileResult>
    analyzeFolder: (folderPath: string) => Promise<import('../renderer/src/types/mp4analyzer').Mp4FileResult[]>
    cancel: () => Promise<boolean>
    exportCsv: (results: import('../renderer/src/types/mp4analyzer').Mp4FileResult[]) => Promise<boolean>
    exportJson: (results: import('../renderer/src/types/mp4analyzer').Mp4FileResult[]) => Promise<boolean>
    runRepair: (filePath: string, command: string) => Promise<{ success: boolean; repairedPath: string; error?: string }>
    onProgress: (cb: (data: import('../renderer/src/types/mp4analyzer').Mp4ScanProgress) => void) => () => void
    onRepairProgress: (cb: (data: { filePath: string; progress: number }) => void) => () => void
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppAPI
  }
}
