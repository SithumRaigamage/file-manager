import { create } from 'zustand'
import { DEFAULT_RULES, ExtensionRule } from '../lib/constants'

export interface OrganizerPreviewItem {
  sourcePath: string
  destinationPath: string
  fileName: string
  extension: string
  category: string
  size: number
}

export interface OrganizerResult {
  success: boolean
  processed: number
  skipped: number
  errors: string[]
}

interface OrganizerState {
  sourceDir: string | null
  rules: ExtensionRule[]
  mode: 'move' | 'copy'
  preview: OrganizerPreviewItem[]
  result: OrganizerResult | null
  isScanning: boolean
  isExecuting: boolean
  progress: { processed: number; total: number; fileName: string } | null
  scanStats: { totalFiles: number; byExtension: Record<string, number> } | null

  setSourceDir: (dir: string | null) => void
  setRules: (rules: ExtensionRule[]) => void
  toggleRule: (id: string) => void
  setMode: (mode: 'move' | 'copy') => void
  setScanStats: (stats: { totalFiles: number; byExtension: Record<string, number> } | null) => void
  setPreview: (items: OrganizerPreviewItem[]) => void
  setIsScanning: (v: boolean) => void
  setIsExecuting: (v: boolean) => void
  setProgress: (p: { processed: number; total: number; fileName: string } | null) => void
  setResult: (r: OrganizerResult | null) => void
  reset: () => void
}

const initialState = {
  sourceDir: null,
  rules: DEFAULT_RULES,
  mode: 'move' as const,
  preview: [],
  result: null,
  isScanning: false,
  isExecuting: false,
  progress: null,
  scanStats: null
}

export const useOrganizerStore = create<OrganizerState>((set) => ({
  ...initialState,
  setSourceDir: (dir) => set({ sourceDir: dir, preview: [], result: null, scanStats: null }),
  setRules: (rules) => set({ rules }),
  toggleRule: (id) =>
    set((s) => ({
      rules: s.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    })),
  setMode: (mode) => set({ mode }),
  setScanStats: (stats) => set({ scanStats: stats }),
  setPreview: (items) => set({ preview: items }),
  setIsScanning: (v) => set({ isScanning: v }),
  setIsExecuting: (v) => set({ isExecuting: v }),
  setProgress: (p) => set({ progress: p }),
  setResult: (r) => set({ result: r }),
  reset: () => set(initialState)
}))
