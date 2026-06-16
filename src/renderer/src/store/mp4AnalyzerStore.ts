import { create } from 'zustand'
import { Mp4FileResult, Mp4AnalyzerSummary, Mp4ScanProgress } from '../types/mp4analyzer'

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
  activeTab: 'table' | 'charts' | 'report'
  selectedFile: Mp4FileResult | null

  setResults: (results: Mp4FileResult[]) => void
  addResult: (result: Mp4FileResult) => void
  updateResult: (filePath: string, data: Partial<Mp4FileResult>) => void
  setScanState: (state: 'idle' | 'scanning' | 'paused' | 'done' | 'cancelled') => void
  setProgress: (progress: Mp4ScanProgress) => void
  setActiveTab: (tab: 'table' | 'charts' | 'report') => void
  setSelectedFile: (file: Mp4FileResult | null) => void
  resetStore: () => void
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

export const useMp4AnalyzerStore = create<Mp4AnalyzerState>((set) => ({
  results: [],
  summary: initialSummary,
  scanState: 'idle',
  progress: initialProgress,
  activeTab: 'table',
  selectedFile: null,

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
        selectedFile: s.selectedFile?.filePath === filePath ? { ...s.selectedFile, ...data } : s.selectedFile
      }
    }),

  setScanState: (scanState) => set({ scanState }),
  setProgress: (progress) => set({ progress }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSelectedFile: (selectedFile) => set({ selectedFile }),

  resetStore: () =>
    set({
      results: [],
      summary: initialSummary,
      scanState: 'idle',
      progress: initialProgress,
      selectedFile: null
    })
}))
