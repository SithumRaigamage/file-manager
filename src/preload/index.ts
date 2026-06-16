import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Typed API exposed to renderer
const api = {
  // Dialog
  openDirectory: (): Promise<string | null> => ipcRenderer.invoke('dialog:openDirectory'),
  openFiles: (): Promise<string[]> => ipcRenderer.invoke('dialog:openFiles'),
  openPath: (path: string): Promise<void> => ipcRenderer.invoke('shell:openPath', path),

  // Organizer
  organizer: {
    preview: (job: unknown) => ipcRenderer.invoke('organizer:preview', job),
    execute: (job: unknown) => ipcRenderer.invoke('organizer:execute', job),
    scan: (dirPath: string) => ipcRenderer.invoke('organizer:scan', dirPath),
    onProgress: (cb: (data: unknown) => void) => {
      ipcRenderer.on('organizer:progress', (_, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('organizer:progress')
    }
  },

  // Renamer
  renamer: {
    preview: (filePaths: string[], pattern: unknown) =>
      ipcRenderer.invoke('renamer:preview', filePaths, pattern),
    execute: (items: unknown) => ipcRenderer.invoke('renamer:execute', items),
    undo: (items: unknown) => ipcRenderer.invoke('renamer:undo', items),
    listFiles: (dirPath: string) => ipcRenderer.invoke('renamer:listFiles', dirPath)
  },

  // Converter
  converter: {
    checkFFmpeg: () => ipcRenderer.invoke('converter:checkFFmpeg'),
    convert: (job: unknown) => ipcRenderer.invoke('converter:convert', job),
    onProgress: (cb: (data: unknown) => void) => {
      ipcRenderer.on('converter:progress', (_, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('converter:progress')
    }
  },

  // Searcher
  searcher: {
    getDrives: () => ipcRenderer.invoke('searcher:get-drives'),
    search: (params: unknown) => ipcRenderer.invoke('searcher:search', params),
    collect: (params: unknown) => ipcRenderer.invoke('searcher:collect', params),
    getFolderNames: (dirPath: string) => ipcRenderer.invoke('searcher:get-folder-names', dirPath),
    batchSearch: (params: { drivePath: string; queries: string[] }) =>
      ipcRenderer.invoke('searcher:batch-search', params),
    onSearchProgress: (cb: (data: unknown) => void) => {
      ipcRenderer.on('searcher:progress', (_, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('searcher:progress')
    },
    onCollectProgress: (cb: (data: unknown) => void) => {
      ipcRenderer.on('searcher:collect-progress', (_, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('searcher:collect-progress')
    }
  },

  // MP4 Analyzer
  mp4analyzer: {
    analyzeFile: (filePath: string) => ipcRenderer.invoke('mp4analyzer:analyzeFile', filePath),
    analyzeFolder: (folderPath: string) => ipcRenderer.invoke('mp4analyzer:analyzeFolder', folderPath),
    cancel: () => ipcRenderer.invoke('mp4analyzer:cancel'),
    exportCsv: (results: unknown) => ipcRenderer.invoke('mp4analyzer:exportCsv', results),
    exportJson: (results: unknown) => ipcRenderer.invoke('mp4analyzer:exportJson', results),
    runRepair: (filePath: string, command: string) => ipcRenderer.invoke('mp4analyzer:runRepair', filePath, command),
    onProgress: (cb: (data: unknown) => void) => {
      ipcRenderer.on('mp4analyzer:progress', (_, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('mp4analyzer:progress')
    },
    onRepairProgress: (cb: (data: unknown) => void) => {
      ipcRenderer.on('mp4analyzer:repairProgress', (_, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('mp4analyzer:repairProgress')
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
