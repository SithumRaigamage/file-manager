import { ipcMain } from 'electron';
import { aiService } from '../features/ai/ai-service';
import fs from 'fs';
import path from 'path';

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
}
