import fs from 'fs';
import path from 'path';
import { RenamePreviewItem } from './rename-evaluator';
import { HistoryService, BatchItem } from '../history/history-service';

export interface RenameExecuteResult {
  batchId: string;
  renamed: number;
  skipped: Array<{ path: string; reason: string }>;
}

export class RenameExecutor {
  /**
   * Executes a batch of rename operations synchronously and logs them to the history service.
   * If a conflict occurs on disk that wasn't caught in preview, it skips the file.
   */
  static executeBatch(items: RenamePreviewItem[]): RenameExecuteResult {
    const skipped: Array<{ path: string; reason: string }> = [];
    const historyItems: BatchItem[] = [];
    let renamed = 0;

    for (const item of items) {
      if (!fs.existsSync(item.originalPath)) {
        skipped.push({ path: item.originalPath, reason: 'File no longer exists on disk' });
        historyItems.push({ before: item.originalPath, after: item.originalPath, status: 'failed' });
        continue;
      }

      const dirName = path.dirname(item.originalPath);
      let targetPath = path.join(dirName, item.newName);

      if (item.originalPath === targetPath) {
        skipped.push({ path: item.originalPath, reason: 'Name is unchanged' });
        historyItems.push({ before: item.originalPath, after: item.originalPath, status: 'skipped' });
        continue;
      }

      // Check on-disk collision (in case another process created a file between preview and execute)
      if (fs.existsSync(targetPath)) {
        const ext = path.extname(item.newName);
        const base = path.basename(item.newName, ext);
        let counter = 1;
        while (fs.existsSync(targetPath)) {
          targetPath = path.join(dirName, `${base} (${counter})${ext}`);
          counter++;
        }
      }

      try {
        fs.renameSync(item.originalPath, targetPath);
        renamed++;
        historyItems.push({ before: item.originalPath, after: targetPath, status: 'success' });
      } catch (err) {
        skipped.push({ path: item.originalPath, reason: (err as Error).message });
        historyItems.push({ before: item.originalPath, after: item.originalPath, status: 'failed' });
      }
    }

    const batchId = HistoryService.logBatch('rename', historyItems, true);

    return {
      batchId,
      renamed,
      skipped,
    };
  }
}
