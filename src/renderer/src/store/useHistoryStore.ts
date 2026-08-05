import { create } from 'zustand'

export interface BatchRecord {
  id: string
  type: 'organize' | 'rename' | 'convert'
  timestamp: string
  items: Array<{ before: string; after: string; status: 'success' | 'skipped' | 'failed' }>
  reversible: boolean
}

interface HistoryState {
  batches: BatchRecord[]
  isLoading: boolean
  error: string | null
  fetchBatches: (type?: 'organize' | 'rename' | 'convert') => Promise<void>
  revertBatch: (batchId: string) => Promise<void>
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  batches: [],
  isLoading: false,
  error: null,
  fetchBatches: async (type) => {
    set({ isLoading: true, error: null })
    try {
      const res = await window.fileflow.history.listBatches(type ? { type } : undefined)
      if (res.ok) {
        set({ batches: res.data })
      } else {
        set({ error: res.error.message })
      }
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ isLoading: false })
    }
  },
  revertBatch: async (batchId) => {
    set({ isLoading: true, error: null })
    try {
      const res = await window.fileflow.history.revertBatch(batchId)
      if (res.ok) {
        // Refresh batches after revert
        await get().fetchBatches()
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
