import { create } from 'zustand';

interface IndexerProgress {
  scanned: number;
  indexed: number;
}

interface IndexerStore {
  isIndexing: boolean;
  progress: IndexerProgress;
  error: string | null;
  results: any[];
  isSearching: boolean;
  startIndexing: (dirPath: string) => Promise<void>;
  cancelIndexing: () => Promise<void>;
  search: (query: any) => Promise<void>;
}

export const useIndexerStore = create<IndexerStore>((set) => {
  let unsubscribeProgress: (() => void) | null = null;

  return {
    isIndexing: false,
    progress: { scanned: 0, indexed: 0 },
    error: null,
    results: [],
    isSearching: false,

    startIndexing: async (dirPath: string) => {
      set({ isIndexing: true, progress: { scanned: 0, indexed: 0 }, error: null });

      if (unsubscribeProgress) {
        unsubscribeProgress();
      }

      unsubscribeProgress = window.fileflow.indexer.onProgress((data) => {
        set({ progress: data });
      });

      const res = await window.fileflow.indexer.start(dirPath);
      
      if (!res.ok) {
        set({ error: res.error.message });
      }
      
      set({ isIndexing: false });
      
      if (unsubscribeProgress) {
        unsubscribeProgress();
        unsubscribeProgress = null;
      }
    },

    cancelIndexing: async () => {
      await window.fileflow.indexer.cancel();
      set({ isIndexing: false });
    },

    search: async (query: any) => {
      set({ isSearching: true, error: null });
      const res = await window.fileflow.indexer.search(query);
      if (res.ok) {
        set({ results: res.data, isSearching: false });
      } else {
        set({ error: res.error.message, isSearching: false, results: [] });
      }
    }
  };
});
