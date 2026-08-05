import { create } from 'zustand'

export interface OrganizePreviewItem {
  originalPath: string
  proposedDestination: string
  action: 'move' | 'copy'
}

interface OrganizerState {
  currentFolder: string | null
  files: any[]
  previewItems: OrganizePreviewItem[]
  isLoading: boolean
  isWatching: boolean
  watcherId: string | null
  error: string | null

  loadFolder: (path: string) => Promise<void>
  previewQuickRule: (ruleId: string) => Promise<void>
  applyOrganize: () => Promise<void>
  toggleWatch: (ruleSet: any) => Promise<void>
}

export const useOrganizerStore = create<OrganizerState>((set, get) => ({
  currentFolder: null,
  files: [],
  previewItems: [],
  isLoading: false,
  isWatching: false,
  watcherId: null,
  error: null,

  loadFolder: async (path) => {
    set({ isLoading: true, error: null, currentFolder: path, previewItems: [] })
    try {
      const res = await window.fileflow.organizer.listFolder(path)
      if (res.ok) {
        set({ files: res.data })
      } else {
        set({ error: res.error.message })
      }
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ isLoading: false })
    }
  },

  previewQuickRule: async (ruleId) => {
    const { currentFolder } = get()
    if (!currentFolder) return

    set({ isLoading: true, error: null })
    try {
      const res = await window.fileflow.organizer.previewQuickRule(currentFolder, ruleId)
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

  applyOrganize: async () => {
    const { previewItems } = get()
    if (previewItems.length === 0) return

    set({ isLoading: true, error: null })
    try {
      const res = await window.fileflow.organizer.applyOrganize(previewItems)
      if (res.ok) {
        set({ previewItems: [], files: [] }) // clear state
      } else {
        set({ error: res.error.message })
      }
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ isLoading: false })
    }
  },

  toggleWatch: async (ruleSet) => {
    const { currentFolder, isWatching, watcherId } = get()
    if (!currentFolder) return

    set({ isLoading: true, error: null })
    try {
      if (isWatching && watcherId) {
        const res = await window.fileflow.organizer.unwatchFolder(watcherId)
        if (res.ok) {
          set({ isWatching: false, watcherId: null })
        } else {
          set({ error: res.error.message })
        }
      } else {
        const res = await window.fileflow.organizer.watchFolder(currentFolder, ruleSet)
        if (res.ok) {
          set({ isWatching: true, watcherId: res.data.watcherId })
        } else {
          set({ error: res.error.message })
        }
      }
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ isLoading: false })
    }
  }
}))
