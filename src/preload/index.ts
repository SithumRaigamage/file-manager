import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// --- Legacy API exposed to renderer (Kept to prevent UI breakage during migration) ---
const legacyApi = {
  // Dialog
  openDirectory: (): Promise<string | null> => ipcRenderer.invoke('dialog:openDirectory'),
  openFiles: (): Promise<string[]> => ipcRenderer.invoke('dialog:openFiles'),
  openPath: (path: string): Promise<void> => ipcRenderer.invoke('shell:openPath', path),
  showItemInFolder: (path: string): void => ipcRenderer.send('shell:showItemInFolder', path),

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
    deleteFile: (filePath: string) => ipcRenderer.invoke('mp4analyzer:deleteFile', filePath),
    deleteMultipleFiles: (filePaths: string[], scannedFolder: string | null) => ipcRenderer.invoke('mp4analyzer:deleteMultipleFiles', filePaths, scannedFolder),
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

// --- NEW fileflow API (Architecture Phase 0 Contract) ---

export type IpcResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export interface OrganizePreviewItem {
  originalPath: string;
  proposedDestination: string;
  action: 'move' | 'copy';
}

export interface OrganizeResult {
  organized: number;
  skipped: Array<{ path: string; reason: string }>;
}

export interface SmartRuleDefinition {
  conditions: any[];
  conditionLogic: 'AND' | 'OR';
  action: { type: 'move' | 'copy'; destination: string };
}

export interface RuleSet {
  id: string;
  name: string;
  type: 'quick' | 'smart';
  quickRuleId?: 'images' | 'videos' | 'docs' | 'archives';
  conditions?: any[];
  conditionLogic?: 'AND' | 'OR';
  action: { type: 'move' | 'copy'; destination: string };
  watchedFolder?: string;
  createdAt: string;
}

export interface RenamePreviewItem {
  originalPath: string;
  newName: string;
  conflict?: string;
}

export interface RenameResult {
  batchId: string;
  renamed: number;
  skipped: Array<{ path: string; reason: string }>;
}

export interface RenamePattern {
  id: string;
  name: string;
  steps: any[];
  createdAt: string;
}

export interface ConversionPreset {
  id: string;
  name: string;
  targetContainer: 'mp4' | 'mkv' | 'mp3' | 'wav' | 'aac';
  ffmpegArgs: string[];
}

export interface ConversionProgressEvent {
  jobId: string;
  file: string;
  progress: number;
}

export interface BatchRecord {
  id: string;
  type: 'organize' | 'rename' | 'convert';
  timestamp: string;
  items: Array<{ before: string; after: string; status: 'success' | 'skipped' | 'failed' }>;
  reversible: boolean;
}

export interface HistoryFilter {
  type?: 'organize' | 'rename' | 'convert';
}

const fileflowApi = {
  organizer: {
    listFolder: (path: string): Promise<IpcResponse<any[]>> => ipcRenderer.invoke('organizer:listFolder', path),
    previewQuickRule: (path: string, ruleId: string): Promise<IpcResponse<OrganizePreviewItem[]>> => ipcRenderer.invoke('organizer:previewQuickRule', path, ruleId),
    previewSmartRule: (path: string, rule: SmartRuleDefinition): Promise<IpcResponse<OrganizePreviewItem[]>> => ipcRenderer.invoke('organizer:previewSmartRule', path, rule),
    applyOrganize: (items: OrganizePreviewItem[]): Promise<IpcResponse<OrganizeResult>> => ipcRenderer.invoke('organizer:applyOrganize', items),
    watchFolder: (path: string, ruleSet: RuleSet): Promise<IpcResponse<{ watcherId: string }>> => ipcRenderer.invoke('organizer:watchFolder', path, ruleSet),
    unwatchFolder: (watcherId: string): Promise<IpcResponse<void>> => ipcRenderer.invoke('organizer:unwatchFolder', watcherId),
  },
  renamer: {
    previewRename: (paths: string[], pattern: RenamePattern): Promise<IpcResponse<RenamePreviewItem[]>> => ipcRenderer.invoke('renamer:previewRename', paths, pattern),
    applyRename: (items: RenamePreviewItem[]): Promise<IpcResponse<RenameResult>> => ipcRenderer.invoke('renamer:applyRename', items),
    undoRename: (batchId: string): Promise<IpcResponse<void>> => ipcRenderer.invoke('renamer:undoRename', batchId),
  },
  converter: {
    enqueueConversion: (paths: string[], preset: ConversionPreset): Promise<IpcResponse<{ jobId: string }>> => ipcRenderer.invoke('converter:enqueueConversion', paths, preset),
    cancelConversion: (jobId: string): Promise<IpcResponse<void>> => ipcRenderer.invoke('converter:cancelConversion', jobId),
    onProgress: (callback: (event: ConversionProgressEvent) => void) => {
      const handler = (_event: IpcRendererEvent, data: ConversionProgressEvent) => callback(data);
      ipcRenderer.on('converter:progress', handler);
      return () => ipcRenderer.removeListener('converter:progress', handler);
    }
  },
  history: {
    listBatches: (filter?: HistoryFilter): Promise<IpcResponse<BatchRecord[]>> => ipcRenderer.invoke('history:listBatches', filter),
    revertBatch: (batchId: string): Promise<IpcResponse<void>> => ipcRenderer.invoke('history:revertBatch', batchId),
  },
  settings: {
    get: (): Promise<IpcResponse<any>> => ipcRenderer.invoke('fileflow:settings:get'),
    update: (updates: any): Promise<IpcResponse<void>> => ipcRenderer.invoke('fileflow:settings:update', updates),
  },
  duplicates: {
    scan: (dirPath: string): Promise<IpcResponse<void>> => ipcRenderer.invoke('fileflow:duplicates:scan', dirPath),
    cancel: (): Promise<IpcResponse<void>> => ipcRenderer.invoke('fileflow:duplicates:cancel'),
    getGroups: (): Promise<IpcResponse<any[]>> => ipcRenderer.invoke('fileflow:duplicates:getGroups'),
    resolve: (groupId: string, keepPath: string, deletePaths: string[]): Promise<IpcResponse<void>> => ipcRenderer.invoke('fileflow:duplicates:resolve', groupId, keepPath, deletePaths),
    onProgress: (callback: (data: any) => void) => {
      const handler = (_event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('fileflow:duplicates:progress', handler);
      return () => ipcRenderer.removeListener('fileflow:duplicates:progress', handler);
    }
  },
  dashboard: {
    getStats: (): Promise<IpcResponse<any>> => ipcRenderer.invoke('fileflow:dashboard:getStats'),
  },
  indexer: {
    start: (dirPath: string): Promise<IpcResponse<void>> => ipcRenderer.invoke('fileflow:indexer:start', dirPath),
    cancel: (): Promise<IpcResponse<void>> => ipcRenderer.invoke('fileflow:indexer:cancel'),
    search: (query: any): Promise<IpcResponse<any[]>> => ipcRenderer.invoke('fileflow:indexer:search', query),
    onProgress: (callback: (data: any) => void) => {
      const handler = (_event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('fileflow:indexer:progress', handler);
      return () => ipcRenderer.removeListener('fileflow:indexer:progress', handler);
    }
  },
  analytics: {
    getLargestFiles: (limit: number): Promise<IpcResponse<any[]>> => ipcRenderer.invoke('fileflow:analytics:getLargestFiles', limit),
    getStorageAnalytics: (): Promise<IpcResponse<any>> => ipcRenderer.invoke('fileflow:analytics:getStorageAnalytics'),
  },
  automation: {
    listWorkflows: (): Promise<IpcResponse<any[]>> => ipcRenderer.invoke('fileflow:automation:listWorkflows'),
    createWorkflow: (workflowData: any): Promise<IpcResponse<{ id: string }>> => ipcRenderer.invoke('fileflow:automation:createWorkflow', workflowData),
    triggerWorkflow: (workflowId: string): Promise<IpcResponse<void>> => ipcRenderer.invoke('fileflow:automation:triggerWorkflow', workflowId),
  },
  tags: {
    getAll: (): Promise<IpcResponse<any[]>> => ipcRenderer.invoke('fileflow:tags:getAll'),
    create: (data: { name: string, color?: string }): Promise<IpcResponse<any>> => ipcRenderer.invoke('fileflow:tags:create', data),
    delete: (id: string): Promise<IpcResponse<void>> => ipcRenderer.invoke('fileflow:tags:delete', id),
    assignToFile: (filePath: string, tagId: string): Promise<IpcResponse<void>> => ipcRenderer.invoke('fileflow:tags:assignToFile', filePath, tagId),
    removeFromFile: (filePath: string, tagId: string): Promise<IpcResponse<void>> => ipcRenderer.invoke('fileflow:tags:removeFromFile', filePath, tagId),
    getTagsForFile: (filePath: string): Promise<IpcResponse<any[]>> => ipcRenderer.invoke('fileflow:tags:getTagsForFile', filePath),
  }
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', legacyApi)
    contextBridge.exposeInMainWorld('fileflow', fileflowApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = legacyApi
  // @ts-ignore (define in dts)
  window.fileflow = fileflowApi
}
