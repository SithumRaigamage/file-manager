import { create } from 'zustand'
import {
  Mp4FileResult,
  Mp4AnalyzerSummary,
  Mp4ScanProgress,
  Mp4ScanRecord,
  Mp4ScanSummary
} from '../types/mp4analyzer'

export type Mp4AnalyzerTab = 'table' | 'charts' | 'report' | 'history'

type IpcResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } }

const initialSummary: Mp4AnalyzerSummary = {
  totalFiles: 0,
  healthyFiles: 0,
  corruptedFiles: 0,
  repairableFiles: 0,
  unrecoverableFiles: 0
}

const initialProgress: Mp4ScanProgress = {
  scanned: 0,
  total: 0,
  currentFile: ''
}

interface Mp4AnalyzerState {
  results: Mp4FileResult[]
  summary: Mp4AnalyzerSummary
  scanState: 'idle' | 'scanning' | 'paused' | 'done' | 'cancelled'
  progress: Mp4ScanProgress
  scannedFolder: string | null
  activeTab: Mp4AnalyzerTab
  selectedFile: Mp4FileResult | null
  history: Mp4ScanSummary[]
  historyError: string | null
  // The saved scan currently loaded into the results views, if any
  viewingScan: Mp4ScanSummary | null

  setResults: (results: Mp4FileResult[]) => void
  addResult: (result: Mp4FileResult) => void
  updateResult: (filePath: string, data: Partial<Mp4FileResult>) => void
  setScanState: (state: 'idle' | 'scanning' | 'paused' | 'done' | 'cancelled') => void
  setProgress: (progress: Mp4ScanProgress) => void
  setScannedFolder: (folder: string | null) => void
  setActiveTab: (tab: Mp4AnalyzerTab) => void
  setSelectedFile: (file: Mp4FileResult | null) => void
  removeResult: (filePath: string) => void
  /**
   * Moves the given videos to the OS Trash (after a native confirmation) and
   * drops the trashed ones from the results. Returns an error message, or null.
   */
  trashFiles: (filePaths: string[]) => Promise<string | null>
  resetStore: () => void
  fetchHistory: () => Promise<void>
  openScan: (id: string) => Promise<void>
  closeViewingScan: () => void
}

function calculateSummary(results: Mp4FileResult[]): Mp4AnalyzerSummary {
  const summary = { ...initialSummary }
  summary.totalFiles = results.length

  for (const r of results) {
    if (r.corruptionLevel === 'healthy') {
      summary.healthyFiles++
    } else if (r.corruptionLevel === 'unrecoverable') {
      summary.unrecoverableFiles++
      summary.corruptedFiles++
    } else {
      // minor, moderate, severe are repairable
      summary.repairableFiles++
      summary.corruptedFiles++
    }
  }
  return summary
}

export const useMp4AnalyzerStore = create<Mp4AnalyzerState>((set, get) => ({
  results: [],
  summary: initialSummary,
  scanState: 'idle',
  progress: initialProgress,
  scannedFolder: null,
  activeTab: 'table',
  selectedFile: null,
  history: [],
  historyError: null,
  viewingScan: null,

  setResults: (results) =>
    set({
      results,
      summary: calculateSummary(results)
    }),

  addResult: (result) =>
    set((s) => {
      const existsIdx = s.results.findIndex((r) => r.filePath === result.filePath)
      let newResults: Mp4FileResult[]
      if (existsIdx !== -1) {
        newResults = [...s.results]
        newResults[existsIdx] = result
      } else {
        newResults = [...s.results, result]
      }
      return {
        results: newResults,
        summary: calculateSummary(newResults)
      }
    }),

  updateResult: (filePath, data) =>
    set((s) => {
      const newResults = s.results.map((r) => (r.filePath === filePath ? { ...r, ...data } : r))
      return {
        results: newResults,
        summary: calculateSummary(newResults),
        selectedFile:
          s.selectedFile?.filePath === filePath ? { ...s.selectedFile, ...data } : s.selectedFile
      }
    }),

  setScanState: (scanState) => set({ scanState }),
  setProgress: (progress) => set({ progress }),
  setScannedFolder: (scannedFolder) => set({ scannedFolder }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSelectedFile: (selectedFile) => set({ selectedFile }),
  removeResult: (filePath) =>
    set((s) => {
      const newResults = s.results.filter((r) => r.filePath !== filePath)
      return {
        results: newResults,
        summary: calculateSummary(newResults),
        selectedFile: s.selectedFile?.filePath === filePath ? null : s.selectedFile
      }
    }),

  trashFiles: async (filePaths) => {
    try {
      const res = (await window.api.mp4analyzer.deleteMultipleFiles(filePaths)) as IpcResult<{
        trashed: string[]
        failed: Array<{ path: string; reason: string }>
      }>
      if (!res.ok) return res.error.message

      const trashed = new Set(res.data.trashed)
      if (trashed.size > 0) {
        set((s) => {
          const newResults = s.results.filter((r) => !trashed.has(r.filePath))
          return {
            results: newResults,
            summary: calculateSummary(newResults),
            selectedFile:
              s.selectedFile && trashed.has(s.selectedFile.filePath) ? null : s.selectedFile
          }
        })
      }
      return res.data.failed.length > 0
        ? `Could not move ${res.data.failed.length} file(s) to the Trash: ${res.data.failed[0].reason}`
        : null
    } catch (err) {
      return (err as Error).message
    }
  },

  resetStore: () =>
    set({
      results: [],
      summary: initialSummary,
      scanState: 'idle',
      progress: initialProgress,
      selectedFile: null,
      scannedFolder: null,
      viewingScan: null
    }),

  fetchHistory: async () => {
    const res: IpcResult<Mp4ScanSummary[]> = await window.api.mp4analyzer.listScans()
    if (res.ok) {
      set({ history: res.data, historyError: null })
    } else {
      set({ historyError: res.error.message })
    }
  },

  openScan: async (id) => {
    const res: IpcResult<Mp4ScanRecord> = await window.api.mp4analyzer.getScan(id)
    if (!res.ok) {
      set({ historyError: res.error.message })
      get().fetchHistory() // it may have been pruned; refresh the list
      return
    }
    const { results, ...summary } = res.data
    get().resetStore()
    set({
      results,
      summary: calculateSummary(results),
      scanState: 'done',
      scannedFolder: summary.targetType === 'folder' ? summary.targetPath : null,
      viewingScan: summary,
      historyError: null,
      activeTab: 'table'
    })
  },

  closeViewingScan: () => {
    get().resetStore()
    set({ activeTab: 'history' })
  }
}))
