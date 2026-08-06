import { create } from 'zustand'

export interface RenamePreviewItem {
  originalPath: string
  newName: string
  conflict?: string
}

export interface RenamePattern {
  id: string
  name: string
  steps: any[]
  createdAt: string
}

interface RenamerState {
  currentFolder: string | null
  selectedFiles: string[]
  pattern: RenamePattern
  previewItems: RenamePreviewItem[]
  isLoading: boolean
  error: string | null

  setFolder: (path: string) => void
  setSelectedFiles: (paths: string[]) => void
  updatePattern: (pattern: RenamePattern) => void
  generatePreview: () => Promise<void>
  applyRename: () => Promise<void>
}

export const useRenamerStore = create<RenamerState>((set, get) => ({
  currentFolder: null,
  selectedFiles: [],
  pattern: { id: 'default', name: 'Default', steps: [], createdAt: new Date().toISOString() },
  previewItems: [],
  isLoading: false,
  error: null,

  setFolder: (path) => set({ currentFolder: path, selectedFiles: [], previewItems: [] }),
  setSelectedFiles: (paths) => set({ selectedFiles: paths }),
  
  updatePattern: (pattern) => {
    set({ pattern })
    get().generatePreview() // automatically regenerate preview when pattern changes
  },

  generatePreview: async () => {
    const { selectedFiles, pattern } = get()
    if (selectedFiles.length === 0 || pattern.steps.length === 0) {
      set({ previewItems: [] })
      return
    }

    set({ isLoading: true, error: null })
    try {
      const res = await window.fileflow.renamer.previewRename(selectedFiles, pattern)
      if (res.ok) {
        set({ previewItems: res.data })
      } else {
        set({ error: res.error.message })
      }
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ isLoading: false })
    }
  },

  applyRename: async () => {
    const { previewItems } = get()
    if (previewItems.length === 0) return

    set({ isLoading: true, error: null })
    try {
      const res = await window.fileflow.renamer.applyRename(previewItems)
      if (res.ok) {
        set({ previewItems: [], selectedFiles: [] })
      } else {
        set({ error: res.error.message })
      }
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ isLoading: false })
    }
  }
}))
