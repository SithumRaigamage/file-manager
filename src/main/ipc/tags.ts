import { ipcMain } from 'electron';
import { db } from '../db';
import { tags, fileTags } from '../db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export function registerTagsHandlers(): void {
  ipcMain.handle('fileflow:tags:getAll', async () => {
    try {
      const data = db.select().from(tags).all();
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: { code: 'DB_ERROR', message: (error as Error).message } };
    }
  });

  ipcMain.handle('fileflow:tags:create', async (_event, data: { name: string, color?: string }) => {
    try {
      const id = randomUUID();
      db.insert(tags).values({
        id,
        name: data.name,
        color: data.color || '#6366f1',
        createdAt: new Date().toISOString()
      }).run();
      return { ok: true, data: { id, name: data.name, color: data.color } };
    } catch (error) {
      return { ok: false, error: { code: 'DB_ERROR', message: (error as Error).message } };
    }
  });

  ipcMain.handle('fileflow:tags:delete', async (_event, tagId: string) => {
    try {
      db.transaction(() => {
        db.delete(fileTags).where(eq(fileTags.tagId, tagId)).run();
        db.delete(tags).where(eq(tags.id, tagId)).run();
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: { code: 'DB_ERROR', message: (error as Error).message } };
    }
  });

  ipcMain.handle('fileflow:tags:assignToFile', async (_event, filePath: string, tagId: string) => {
    try {
      const id = randomUUID();
      db.insert(fileTags).values({
        id,
        fileId: filePath, // Using path as foreign key to search_index.path
        tagId,
        createdAt: new Date().toISOString()
      }).run();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: { code: 'DB_ERROR', message: (error as Error).message } };
    }
  });

  ipcMain.handle('fileflow:tags:removeFromFile', async (_event, filePath: string, tagId: string) => {
    try {
      db.delete(fileTags).where(and(eq(fileTags.fileId, filePath), eq(fileTags.tagId, tagId))).run();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: { code: 'DB_ERROR', message: (error as Error).message } };
    }
  });

  ipcMain.handle('fileflow:tags:getTagsForFile', async (_event, filePath: string) => {
    try {
      // Find tag IDs for file
      const mappings = db.select({ tagId: fileTags.tagId }).from(fileTags).where(eq(fileTags.fileId, filePath)).all();
      if (mappings.length === 0) return { ok: true, data: [] };
      
      const tagIds = mappings.map(m => m.tagId);
      const fileTagObjects = db.select().from(tags).where(inArray(tags.id, tagIds)).all();
      return { ok: true, data: fileTagObjects };
    } catch (error) {
      return { ok: false, error: { code: 'DB_ERROR', message: (error as Error).message } };
    }
  });
}
