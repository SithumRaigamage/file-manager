import { create } from 'zustand'

export interface FileEntry {
  name: string
  path: string
  ext: string
  size: number
  mtime: string
  selected: boolean
}

export interface RenamePreviewItem {
  sourcePath: string
  oldName: string
  newName: string
  newPath: string
  conflict: boolean
}

export interface RenamePattern {
  type: 'sequential' | 'prefix' | 'suffix' | 'replace' | 'date'
  prefix: string
  suffix: string
  separator: string
  startIndex: number
  find: string
  replaceWith: string
  dateFormat: string
  extension: 'keep' | 'lowercase' | 'uppercase'
}

interface RenamerState {
  sourceDir: string | null
  files: FileEntry[]
  selectedPaths: Set<string>
  pattern: RenamePattern
  preview: RenamePreviewItem[]
  lastExecuted: RenamePreviewItem[]
  isLoading: boolean
  isExecuting: boolean
  result: { success: boolean; renamed: number; errors: string[] } | null

  setSourceDir: (dir: string | null) => void
  setFiles: (files: FileEntry[]) => void
  toggleFile: (path: string) => void
  selectAll: () => void
  deselectAll: () => void
  setPattern: (p: Partial<RenamePattern>) => void
  setPreview: (items: RenamePreviewItem[]) => void
  setLastExecuted: (items: RenamePreviewItem[]) => void
  setIsLoading: (v: boolean) => void
  setIsExecuting: (v: boolean) => void
  setResult: (r: { success: boolean; renamed: number; errors: string[] } | null) => void
  reset: () => void
}

const defaultPattern: RenamePattern = {
  type: 'sequential',
  prefix: 'file',
  suffix: '',
  separator: '_',
  startIndex: 1,
  find: '',
  replaceWith: '',
  dateFormat: 'YYYY-MM-DD',
  extension: 'keep'
}

export const useRenamerStore = create<RenamerState>((set) => ({
  sourceDir: null,
  files: [],
  selectedPaths: new Set(),
  pattern: defaultPattern,
  preview: [],
  lastExecuted: [],
  isLoading: false,
  isExecuting: false,
  result: null,

  setSourceDir: (dir) => set({ sourceDir: dir, files: [], selectedPaths: new Set(), preview: [] }),
  setFiles: (files) => set({ files }),
  toggleFile: (path) =>
    set((s) => {
      const next = new Set(s.selectedPaths)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return { selectedPaths: next }
    }),
  selectAll: () => set((s) => ({ selectedPaths: new Set(s.files.map((f) => f.path)) })),
  deselectAll: () => set({ selectedPaths: new Set() }),
  setPattern: (p) => set((s) => ({ pattern: { ...s.pattern, ...p }, preview: [] })),
  setPreview: (items) => set({ preview: items }),
  setLastExecuted: (items) => set({ lastExecuted: items }),
  setIsLoading: (v) => set({ isLoading: v }),
  setIsExecuting: (v) => set({ isExecuting: v }),
  setResult: (r) => set({ result: r }),
  reset: () =>
    set({
      sourceDir: null,
      files: [],
      selectedPaths: new Set(),
      pattern: defaultPattern,
      preview: [],
      lastExecuted: [],
      result: null
    })
}))
