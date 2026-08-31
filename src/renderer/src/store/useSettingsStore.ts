import { create } from 'zustand';

export interface AppSettings {
  ffmpegPath: string | null;
  defaultDestructiveBehavior: 'prompt' | 'always-copy';
  reducedMotion: boolean;
  telemetryOptIn: boolean;
  crashReportingOptIn: boolean;
  historyRetentionDays: number;
}

interface SettingsStore {
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
}

const defaultSettings: AppSettings = {
  ffmpegPath: null,
  defaultDestructiveBehavior: 'prompt',
  reducedMotion: false,
  telemetryOptIn: false,
  crashReportingOptIn: false,
  historyRetentionDays: 90
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await window.fileflow.settings.get();
      if (res.ok && res.data) {
        set({ settings: { ...defaultSettings, ...res.data } });
      } else if (!res.ok) {
        set({ error: res.error?.message || 'Failed to fetch settings' });
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch settings' });
    } finally {
      set({ isLoading: false });
    }
  },

  updateSetting: async (key, value) => {
    const previousSettings = get().settings;
    
    // Optimistic UI update
    set({
      settings: {
        ...previousSettings,
        [key]: value
      }
    });

    try {
      const res = await window.fileflow.settings.update({ [key]: value });
      if (!res.ok) {
        // Revert on failure
        set({ settings: previousSettings, error: res.error?.message || 'Failed to update setting' });
      }
    } catch (err) {
      // Revert on failure
      set({ settings: previousSettings, error: (err as Error).message || 'Failed to update setting' });
    }
  }
}));
