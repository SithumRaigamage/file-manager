import { ipcMain } from 'electron';
import { DuplicateScanner, DuplicateScanProgress } from '../features/duplicates/duplicate-scanner';
import { db } from '../db';
import { duplicateGroups } from '../db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';

let currentScanner: DuplicateScanner | null = null;

export function registerDuplicatesHandlers(): void {
  ipcMain.handle('fileflow:duplicates:scan', async (event, dirPath: string) => {
    if (currentScanner) {
      currentScanner.cancel();
    }
    
    currentScanner = new DuplicateScanner();
    
    try {
      await currentScanner.scan(dirPath, (progress: DuplicateScanProgress) => {
        event.sender.send('fileflow:duplicates:progress', progress);
      });
      return { ok: true };
    } catch (error) {
      console.error('Scan failed:', error);
      return { ok: false, error: { code: 'SCAN_FAILED', message: (error as Error).message } };
    } finally {
      currentScanner = null;
    }
  });

  ipcMain.handle('fileflow:duplicates:cancel', async () => {
    if (currentScanner) {
      currentScanner.cancel();
      currentScanner = null;
      return { ok: true };
    }
    return { ok: false, error: { code: 'NO_SCAN', message: 'No scan in progress' } };
  });

  ipcMain.handle('fileflow:duplicates:getGroups', async () => {
    try {
      const groups = db.select().from(duplicateGroups).where(eq(duplicateGroups.status, 'pending')).all();
      return { ok: true, data: groups };
    } catch (error) {
      return { ok: false, error: { code: 'GET_GROUPS_FAILED', message: (error as Error).message } };
    }
  });

  ipcMain.handle('fileflow:duplicates:resolve', async (_event, groupId: string, _keepPath: string, deletePaths: string[]) => {
    try {
      for (const p of deletePaths) {
        if (fs.existsSync(p)) {
          // Send to trash using Electron shell or fs.unlink for permanent
          // We will use permanent for now to guarantee removal, 
          // or fs.rmSync to be safe
          fs.rmSync(p, { force: true });
        }
      }
      
      db.update(duplicateGroups)
        .set({ status: 'resolved' })
        .where(eq(duplicateGroups.id, groupId))
        .run();
        
      return { ok: true };
    } catch (error) {
      return { ok: false, error: { code: 'RESOLVE_FAILED', message: (error as Error).message } };
    }
  });
}
