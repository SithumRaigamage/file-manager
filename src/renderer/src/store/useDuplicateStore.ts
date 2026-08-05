import { create } from 'zustand';

interface DuplicateScanProgress {
  phase: 'idle' | 'scanning' | 'hashing' | 'completed';
  scannedCount: number;
  hashedCount: number;
  totalToHash: number;
}

interface DuplicateGroup {
  id: string;
  hash: string;
  size: number;
  files: Array<{ path: string; lastModified: number; size: number }>;
  status: 'pending' | 'resolved';
}

interface DuplicateStore {
  progress: DuplicateScanProgress;
  groups: DuplicateGroup[];
  isScanning: boolean;
  error: string | null;
  startScan: (dirPath: string) => Promise<void>;
  cancelScan: () => Promise<void>;
  fetchGroups: () => Promise<void>;
  resolveGroup: (groupId: string, keepPath: string, deletePaths: string[]) => Promise<void>;
}

export const useDuplicateStore = create<DuplicateStore>((set, get) => {
  // Listen for progress updates
  window.fileflow.duplicates.onProgress((data) => {
    set({ progress: data });
    if (data.phase === 'completed') {
      set({ isScanning: false });
      get().fetchGroups();
    }
  });

  return {
    progress: { phase: 'idle', scannedCount: 0, hashedCount: 0, totalToHash: 0 },
    groups: [],
    isScanning: false,
    error: null,

    startScan: async (dirPath: string) => {
      set({ isScanning: true, error: null, progress: { phase: 'scanning', scannedCount: 0, hashedCount: 0, totalToHash: 0 } });
      const res = await window.fileflow.duplicates.scan(dirPath);
      if (!res.ok) {
        set({ isScanning: false, error: res.error.message });
      }
    },

    cancelScan: async () => {
      await window.fileflow.duplicates.cancel();
      set({ isScanning: false, progress: { phase: 'idle', scannedCount: 0, hashedCount: 0, totalToHash: 0 } });
    },

    fetchGroups: async () => {
      const res = await window.fileflow.duplicates.getGroups();
      if (res.ok) {
        set({ groups: res.data });
      }
    },

    resolveGroup: async (groupId: string, keepPath: string, deletePaths: string[]) => {
      const res = await window.fileflow.duplicates.resolve(groupId, keepPath, deletePaths);
      if (res.ok) {
        set((state) => ({
          groups: state.groups.filter(g => g.id !== groupId)
        }));
      }
    }
  };
});
