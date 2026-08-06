import { create } from 'zustand';

interface DashboardStats {
  totalFilesProcessed: number;
  totalErrors: number;
  recentJobs: Array<{
    id: string;
    type: string;
    timestamp: string;
    itemCount: number;
  }>;
}

interface DashboardStore {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  stats: null,
  isLoading: false,
  error: null,

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    const res = await window.fileflow.dashboard.getStats();
    if (res.ok) {
      set({ stats: res.data, isLoading: false });
    } else {
      set({ error: res.error.message, isLoading: false });
    }
  }
}));
