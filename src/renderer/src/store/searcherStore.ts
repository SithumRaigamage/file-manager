import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Types (mirrored from main process) ───────────────────────────────────────

export interface Drive {
  name: string
  path: string
  type: 'internal' | 'external' | 'network'
}

export interface SearchResult {
  name: string
  fullPath: string
  type: 'file' | 'folder'
  size: number
  extension: string
  modifiedAt: number
  depth: number
  parentPath: string
  childCount: number
}

export interface CollectResult {
  success: boolean
  moved: number
  newFolderPath: string
  errors: string[]
}

export type ViewMode = 'large-icons' | 'tiles' | 'list' | 'details' | 'tree'

// ─── State ────────────────────────────────────────────────────────────────────

interface SearcherState {
  // Drives
  drives: Drive[]
  selectedDrive: Drive | null

  // Source/Destination
  sourceFolder: string | null
  destinationFolder: string | null

  // Search
  query: string
  isSearching: boolean
  searchProgress: { scanned: number; found: number }
  results: SearchResult[]
  hasSearched: boolean
  savedKeywords: string[]

  // View
  viewMode: ViewMode

  // Collect
  isCollecting: boolean
  collectProgress: { moved: number; total: number }
  collectResult: CollectResult | null

  // Actions
  setDrives: (drives: Drive[]) => void
  setSelectedDrive: (drive: Drive | null) => void
  setSourceFolder: (path: string | null) => void
  setDestinationFolder: (path: string | null) => void
  setQuery: (query: string) => void
  setIsSearching: (v: boolean) => void
  setSearchProgress: (p: { scanned: number; found: number }) => void
  setResults: (results: SearchResult[]) => void
  setViewMode: (mode: ViewMode) => void
  setIsCollecting: (v: boolean) => void
  setCollectProgress: (p: { moved: number; total: number }) => void
  setCollectResult: (result: CollectResult | null) => void
  removeResult: (itemFullPath: string) => void
  saveKeyword: (kw: string) => void
  saveKeywords: (keywords: string[]) => void
  removeKeyword: (kw: string) => void
  reset: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSearcherStore = create<SearcherState>()(
  persist(
    (set) => ({
      drives: [],
      selectedDrive: null,
      sourceFolder: null,
      destinationFolder: null,
      query: '',
      isSearching: false,
      searchProgress: { scanned: 0, found: 0 },
      results: [],
      hasSearched: false,
      savedKeywords: [],
      viewMode: 'tiles',
      isCollecting: false,
      collectProgress: { moved: 0, total: 0 },
      collectResult: null,

      setDrives: (drives) => set({ drives }),
      setSelectedDrive: (drive) => set({ selectedDrive: drive, sourceFolder: null }),
      setSourceFolder: (path) => set({ sourceFolder: path }),
      setDestinationFolder: (path) => set({ destinationFolder: path }),
      setQuery: (query) => set({ query }),
      setIsSearching: (v) => set({ isSearching: v }),
      setSearchProgress: (p) => set({ searchProgress: p }),
      setResults: (results) => set({ results, hasSearched: true }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setIsCollecting: (v) => set({ isCollecting: v }),
      setCollectProgress: (p) => set({ collectProgress: p }),
      setCollectResult: (result) => set({ collectResult: result }),
      removeResult: (fullPath) =>
        set((state) => ({
          results: state.results.filter((r) => r.fullPath !== fullPath)
        })),
      saveKeyword: (kw) =>
        set((state) => {
          const trimmed = kw.trim()
          if (!trimmed || state.savedKeywords.includes(trimmed)) return state
          return { savedKeywords: [trimmed, ...state.savedKeywords] }
        }),
      saveKeywords: (kws) =>
        set((state) => {
          const existing = new Set(state.savedKeywords)
          const newKws = kws
            .map((k) => k.trim())
            .filter((k) => k && !existing.has(k))

          if (newKws.length === 0) return state
          return { savedKeywords: [...newKws, ...state.savedKeywords] }
        }),
      removeKeyword: (kw) =>
        set((state) => ({
          savedKeywords: state.savedKeywords.filter((k) => k !== kw)
        })),
      reset: () =>
        set({
          results: [],
          hasSearched: false,
          searchProgress: { scanned: 0, found: 0 },
          collectResult: null,
          collectProgress: { moved: 0, total: 0 }
        })
    }),
    {
      name: 'searcher-storage',
      partialize: (state) => ({
        savedKeywords: state.savedKeywords,
        viewMode: state.viewMode,
        destinationFolder: state.destinationFolder
      })
    }
  )
)
