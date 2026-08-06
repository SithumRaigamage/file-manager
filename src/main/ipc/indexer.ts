import { ipcMain } from 'electron';
import { searchEngine } from '../features/search/search-engine';

export function registerIndexerHandlers(): void {
  ipcMain.handle('fileflow:indexer:start', async (event, dirPath: string) => {
    try {
      await searchEngine.startIndexing(dirPath, (progress) => {
        event.sender.send('fileflow:indexer:progress', progress);
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: { code: 'INDEX_FAILED', message: (error as Error).message } };
    }
  });

  ipcMain.handle('fileflow:indexer:cancel', async () => {
    try {
      searchEngine.cancelIndexing();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: { code: 'CANCEL_FAILED', message: (error as Error).message } };
    }
  });

  ipcMain.handle('fileflow:indexer:search', async (_event, query) => {
    try {
      const results = searchEngine.search(query);
      return { ok: true, data: results };
    } catch (error) {
      return { ok: false, error: { code: 'SEARCH_FAILED', message: (error as Error).message } };
    }
  });
}
