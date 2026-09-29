import { create } from 'zustand'

interface DuplicateScanProgress {
  phase: 'idle' | 'scanning' | 'hashing' | 'completed'
  scannedCount: number
  hashedCount: number
  totalToHash: number
}

interface DuplicateGroup {
  id: string
  hash: string
  size: number
  files: Array<{ path: string; lastModified: number; size: number }>
  status: 'pending' | 'resolved'
}

export type ResolveOutcome =
  | { status: 'resolved'; trashed: number }
  | { status: 'cancelled' }
  | { status: 'error'; message: string }

interface DuplicateStore {
  progress: DuplicateScanProgress
  groups: DuplicateGroup[]
  isScanning: boolean
  error: string | null
  selectedFolder: string | null
  selections: Record<string, string> // groupId -> path to KEEP
  setSelectedFolder: (dirPath: string | null) => void
  setSelection: (groupId: string, keepPath: string) => void
  startScan: (dirPath: string) => Promise<void>
  cancelScan: () => Promise<void>
  fetchGroups: () => Promise<void>
  /** Keeps `keepPath`, moves the group's other copies to the Trash (main process confirms first). */
  resolveGroup: (groupId: string, keepPath: string) => Promise<ResolveOutcome>
  reset: () => void
}

export const useDuplicateStore = create<DuplicateStore>((set, get) => {
  // Listen for progress updates
  window.fileflow.duplicates.onProgress((data) => {
    set({ progress: data })
    if (data.phase === 'completed') {
      set({ isScanning: false })
      get().fetchGroups()
    }
  })

  return {
    progress: { phase: 'idle', scannedCount: 0, hashedCount: 0, totalToHash: 0 },
    groups: [],
    isScanning: false,
    error: null,
    selectedFolder: null,
    selections: {},

    setSelectedFolder: (dirPath) => set({ selectedFolder: dirPath }),

    setSelection: (groupId, keepPath) =>
      set((state) => ({ selections: { ...state.selections, [groupId]: keepPath } })),

    startScan: async (dirPath: string) => {
      set({
        isScanning: true,
        error: null,
        progress: { phase: 'scanning', scannedCount: 0, hashedCount: 0, totalToHash: 0 }
      })
      const res = await window.fileflow.duplicates.scan(dirPath)
      if (!res.ok) {
        set({ isScanning: false, error: res.error.message })
      }
    },

    cancelScan: async () => {
      await window.fileflow.duplicates.cancel()
      set({
        isScanning: false,
        progress: { phase: 'idle', scannedCount: 0, hashedCount: 0, totalToHash: 0 }
      })
    },

    fetchGroups: async () => {
      const res = await window.fileflow.duplicates.getGroups()
      if (res.ok) {
        set({ groups: res.data })
      }
    },

    resolveGroup: async (groupId, keepPath) => {
      const group = get().groups.find((g) => g.id === groupId)
      if (!group) return { status: 'error', message: 'This duplicate group no longer exists' }
      const deletePaths = group.files.map((f) => f.path).filter((p) => p !== keepPath)

      const res = await window.fileflow.duplicates.resolve(groupId, keepPath, deletePaths)
      if (!res.ok) return { status: 'error', message: res.error.message }

      const { trashed, failed } = res.data
      if (failed.length > 0) {
        return {
          status: 'error',
          message: `${failed.length} file(s) could not be moved to the Trash: ${failed[0].reason}`
        }
      }
      if (trashed.length === 0) return { status: 'cancelled' }

      set((state) => {
        const selections = { ...state.selections }
        delete selections[groupId]
        return { groups: state.groups.filter((g) => g.id !== groupId), selections }
      })
      return { status: 'resolved', trashed: trashed.length }
    },

    reset: async () => {
      set({
        progress: { phase: 'idle', scannedCount: 0, hashedCount: 0, totalToHash: 0 },
        groups: [],
        isScanning: false,
        error: null,
        selectedFolder: null,
        selections: {}
      })
      await window.fileflow.duplicates.clear()
    }
  }
})
