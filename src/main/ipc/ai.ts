import { ipcMain } from 'electron';
import { aiService } from '../features/ai/ai-service';
import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { searchIndex, tags, fileTags } from '../db/schema';
import { like, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export function registerAIHandlers(): void {
  ipcMain.handle('fileflow:ai:checkStatus', async () => {
    try {
      const result = await aiService.checkAvailability();
      return { ok: true, data: result };
    } catch (error) {
      return { ok: false, error: { code: 'AI_ERROR', message: (error as Error).message } };
    }
  });

  ipcMain.handle('fileflow:ai:suggestCategories', async (_event, folderPath: string, categories: string[]) => {
    try {
      const items = fs.readdirSync(folderPath, { withFileTypes: true });
      const files = items.filter(i => i.isFile() && !i.name.startsWith('.'));
      
      const suggestions: Array<{ file: string, path: string, suggestedCategory: string }> = [];
      // To avoid overwhelming Ollama or getting timeouts, we process sequentially for now
      // In a real production app we'd queue these or use a background worker.
      for (const file of files) {
        const fullPath = path.join(folderPath, file.name);
        const stats = fs.statSync(fullPath);
        
        const category = await aiService.suggestCategory({
          filename: file.name,
          path: fullPath,
          size: stats.size
        }, categories);

        if (category) {
          suggestions.push({
            file: file.name,
            path: fullPath,
            suggestedCategory: category
          });
        }
      }

      return { ok: true, data: suggestions };
    } catch (error) {
      return { ok: false, error: { code: 'AI_ERROR', message: (error as Error).message } };
    }
  });

  ipcMain.handle('fileflow:ai:executeCommand', async (_event, query: string) => {
    try {
      const intent = await aiService.parseCommandIntent(query);
      
      if (!intent || intent.action !== 'search_and_tag') {
        return { ok: true, data: { message: "Sorry, I couldn't understand that command. I can only search and tag files right now." } };
      }

      let affectedFiles = 0;
      let matchedFiles: any[] = [];

      if (intent.fileExtension) {
        // Search index for files ending with extension
        matchedFiles = db.select().from(searchIndex).where(like(searchIndex.filename, `%${intent.fileExtension}`)).all();
      } else {
        matchedFiles = db.select().from(searchIndex).all();
      }

      if (matchedFiles.length > 0 && intent.tag) {
        // Find or create tag
        let tag = db.select().from(tags).where(eq(tags.name, intent.tag)).get();
        if (!tag) {
          tag = { id: randomUUID(), name: intent.tag, color: '#6366f1', createdAt: new Date().toISOString() };
          db.insert(tags).values(tag).run();
        }

        // Apply tag
        db.transaction(() => {
          for (const file of matchedFiles) {
            // Check if already tagged
            const existing = db.select().from(fileTags).where(eq(fileTags.fileId, file.path)).get();
            if (!existing || existing.tagId !== tag.id) {
              db.insert(fileTags).values({
                id: randomUUID(),
                fileId: file.path,
                tagId: tag.id,
                createdAt: new Date().toISOString()
              }).run();
              affectedFiles++;
            }
          }
        });
      }

      return { 
        ok: true, 
        data: { 
          message: `✅ Tagged ${affectedFiles} file(s) with '${intent.tag}'.`,
          details: intent 
        } 
      };
    } catch (error) {
      return { ok: false, error: { code: 'AI_ERROR', message: (error as Error).message } };
    }
  });
}
