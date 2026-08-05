import { ipcMain } from 'electron';
import { db } from '../db';
import { appSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

export function registerSettingsIpc(): void {
  ipcMain.handle('fileflow:settings:get', async () => {
    try {
      const rows = db.select().from(appSettings).where(eq(appSettings.id, 'default')).all();
      if (rows.length > 0) {
        return { ok: true, data: rows[0] };
      }
      return { ok: true, data: {} };
    } catch (err) {
      return { ok: false, error: { message: (err as Error).message } };
    }
  });

  ipcMain.handle('fileflow:settings:update', async (_, updates: Partial<typeof appSettings.$inferInsert>) => {
    try {
      db.update(appSettings)
        .set(updates)
        .where(eq(appSettings.id, 'default'))
        .run();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: { message: (err as Error).message } };
    }
  });
}
