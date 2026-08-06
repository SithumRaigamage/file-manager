import { ipcMain } from 'electron';
import { searchEngine } from '../features/search/search-engine';

export function registerAnalyticsHandlers(): void {
  ipcMain.handle('fileflow:analytics:getLargestFiles', async (_event, limit: number) => {
    try {
      const results = searchEngine.getLargestFiles(limit || 50);
      return { ok: true, data: results };
    } catch (error) {
      return { ok: false, error: { code: 'ANALYTICS_FAILED', message: (error as Error).message } };
    }
  });

  ipcMain.handle('fileflow:analytics:getStorageAnalytics', async () => {
    try {
      const results = searchEngine.getStorageAnalytics();
      return { ok: true, data: results };
    } catch (error) {
      return { ok: false, error: { code: 'ANALYTICS_FAILED', message: (error as Error).message } };
    }
  });
}
