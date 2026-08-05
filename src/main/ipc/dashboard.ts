import { ipcMain } from 'electron';
import { db } from '../db';
import { batchRecords } from '../db/schema';
import { desc } from 'drizzle-orm';

export function registerDashboardHandlers(): void {
  ipcMain.handle('fileflow:dashboard:getStats', async () => {
    try {
      const allRecords = db.select().from(batchRecords).orderBy(desc(batchRecords.timestamp)).all();
      
      let totalFilesProcessed = 0;
      let totalErrors = 0;
      const recentJobs = allRecords.slice(0, 5).map(record => {
        let items: any[] = [];
        try {
          items = record.items as any[];
        } catch {
          // ignore
        }
        
        return {
          id: record.id,
          type: record.type,
          timestamp: record.timestamp,
          itemCount: items.length
        };
      });

      for (const record of allRecords) {
        let items: any[] = [];
        try {
          items = record.items as any[];
        } catch {
          // ignore
        }
        
        for (const item of items) {
          totalFilesProcessed++;
          if (item.status === 'failed') {
            totalErrors++;
          }
        }
      }

      return {
        ok: true,
        data: {
          totalFilesProcessed,
          totalErrors,
          recentJobs
        }
      };
    } catch (error) {
      return { ok: false, error: { code: 'UNKNOWN_ERROR', message: (error as Error).message } };
    }
  });
}
