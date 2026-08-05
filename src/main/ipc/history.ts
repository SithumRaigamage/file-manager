import { ipcMain } from 'electron';

export function registerHistoryHandlers(): void {
  ipcMain.handle('history:listBatches', async (_, filter?: { type?: 'organize' | 'rename' | 'convert' }) => {
    try {
      const { HistoryService } = await import('../domain/history/history-service');
      const batches = HistoryService.getRecentBatches(50, filter?.type);
      return { ok: true, data: batches };
    } catch (err) {
      return { ok: false, error: { code: 'LIST_ERROR', message: (err as Error).message } };
    }
  });

  ipcMain.handle('history:revertBatch', async (_, batchId: string) => {
    try {
      const { HistoryService } = await import('../domain/history/history-service');
      HistoryService.revertBatch(batchId);
      return { ok: true, data: undefined };
    } catch (err) {
      return { ok: false, error: { code: 'REVERT_ERROR', message: (err as Error).message } };
    }
  });
}
