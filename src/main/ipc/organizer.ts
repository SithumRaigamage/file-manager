import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { RuleEvaluator, RuleSetDomain } from '../domain/organizer/rule-evaluator'
import { ConflictDetector } from '../domain/organizer/conflict-detector'
import { resolveUniquePath } from '../domain/shared/unique-path'
import { HistoryService, BatchItem } from '../domain/history/history-service'

export function registerOrganizerHandlers(): void {
  // List folder contents with file metadata
  ipcMain.handle('organizer:listFolder', async (_, dirPath: string) => {
    try {
      const files: Array<{
        name: string;
        path: string;
        ext: string;
        size: number;
        mtime: string;
      }> = [];

      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile()) {
            const fullPath = path.join(dirPath, entry.name);
            try {
              const stats = fs.statSync(fullPath);
              files.push({
                name: entry.name,
                path: fullPath,
                ext: path.extname(entry.name).toLowerCase(),
                size: stats.size,
                mtime: stats.mtime.toISOString()
              });
            } catch {
              // Skip files we can't stat
            }
          }
        }
      } catch (err) {
        return { ok: false, error: { code: 'DIR_READ_ERROR', message: (err as Error).message } };
      }

      return { ok: true, data: files };
    } catch (err) {
      return { ok: false, error: { code: 'LIST_FOLDER_ERROR', message: (err as Error).message } };
    }
  });

  // Preview files that match a quick rule (images, videos, docs, archives)
  ipcMain.handle('organizer:previewQuickRule', async (_, dirPath: string, ruleId: string) => {
    try {
      const rule: RuleSetDomain = {
        id: ruleId,
        name: ruleId,
        type: 'quick',
        quickRuleId: ruleId as 'images' | 'videos' | 'docs' | 'archives',
        action: { type: 'move', destination: path.join(dirPath, ruleId) }
      };

      const preview: Array<{ originalPath: string; proposedDestination: string; action: 'move' | 'copy' }> = [];

      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile()) {
            const fullPath = path.join(dirPath, entry.name);
            if (RuleEvaluator.evaluate(fullPath, rule)) {
              const destDir = path.join(dirPath, ruleId);
              preview.push({
                originalPath: fullPath,
                proposedDestination: path.join(destDir, entry.name),
                action: 'move'
              });
            }
          }
        }
      } catch (err) {
        return { ok: false, error: { code: 'PREVIEW_ERROR', message: (err as Error).message } };
      }

      return { ok: true, data: preview };
    } catch (err) {
      return { ok: false, error: { code: 'PREVIEW_ERROR', message: (err as Error).message } };
    }
  });

  // Preview files that match a smart rule
  ipcMain.handle('organizer:previewSmartRule', async (_, dirPath: string, rule: RuleSetDomain) => {
    try {
      const preview: Array<{ originalPath: string; proposedDestination: string; action: 'move' | 'copy' }> = [];

      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile()) {
            const fullPath = path.join(dirPath, entry.name);
            if (RuleEvaluator.evaluate(fullPath, rule)) {
              const fileName = entry.name;
              const destDir = rule.action.destination;
              preview.push({
                originalPath: fullPath,
                proposedDestination: path.join(destDir, fileName),
                action: rule.action.type
              });
            }
          }
        }
      } catch (err) {
        return { ok: false, error: { code: 'PREVIEW_ERROR', message: (err as Error).message } };
      }

      return { ok: true, data: preview };
    } catch (err) {
      return { ok: false, error: { code: 'PREVIEW_ERROR', message: (err as Error).message } };
    }
  });

  // Apply organization from preview items
  ipcMain.handle('organizer:applyOrganize', async (_, items: Array<{ originalPath: string; proposedDestination: string; action: 'move' | 'copy' }>) => {
    try {
      let organized = 0;
      const skipped: Array<{ path: string; reason: string }> = [];
      const historyItems: BatchItem[] = [];

      for (const item of items) {
        try {
          // Ensure destination directory exists
          const destDir = path.dirname(item.proposedDestination);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }

          // Handle filename conflicts
          const destPath = resolveUniquePath(item.proposedDestination);

          // Execute the move or copy
          if (item.action === 'move') {
            fs.renameSync(item.originalPath, destPath);
          } else {
            fs.copyFileSync(item.originalPath, destPath);
          }
          organized++;
          // Only 'move' is recorded for undo: HistoryService reverts by renaming
          // 'after' back to 'before', which would be unsafe for a 'copy' since
          // the original file still exists at 'before'.
          if (item.action === 'move') {
            historyItems.push({ before: item.originalPath, after: destPath, status: 'success' });
          }
        } catch (err) {
          skipped.push({ path: item.originalPath, reason: (err as Error).message });
          if (item.action === 'move') {
            historyItems.push({ before: item.originalPath, after: item.originalPath, status: 'failed' });
          }
        }
      }

      // Organize (move) operations must be undoable and visible in the
      // History view, same as rename/convert batches.
      if (historyItems.length > 0) {
        HistoryService.logBatch('organize', historyItems, true);
      }

      return { ok: true, data: { organized, skipped } };
    } catch (err) {
      return { ok: false, error: { code: 'APPLY_ERROR', message: (err as Error).message } };
    }
  });

  // Watch folder with a rule set
  ipcMain.handle('organizer:watchFolder', async (_, dirPath: string, ruleSet: RuleSetDomain) => {
    try {
      const { WatcherService } = await import('../domain/watcher/watcher-service');

      // Check for circular conflicts before starting watch
      const { db } = await import('../db');
      const { ruleSets } = await import('../db/schema');

      const existingRules = db.select().from(ruleSets).all() as unknown as RuleSetDomain[];

      if (ConflictDetector.hasCircularConflict(ruleSet, existingRules)) {
        return { ok: false, error: { code: 'CONFLICT_DETECTED', message: 'This rule would create a circular folder watching loop' } };
      }

      WatcherService.watchFolder(ruleSet.id, dirPath);
      const watcherId = `${ruleSet.id}-${Date.now()}`;

      // Track the watcherId so we can correctly unwatch it later
      WatcherService.trackWatcherId(watcherId, dirPath);

      return { ok: true, data: { watcherId } };
    } catch (err) {
      return { ok: false, error: { code: 'WATCH_ERROR', message: (err as Error).message } };
    }
  });

  // Stop watching a folder
  ipcMain.handle('organizer:unwatchFolder', async (_, watcherId: string) => {
    try {
      const { WatcherService } = await import('../domain/watcher/watcher-service');

      const success = await WatcherService.unwatchById(watcherId);
      if (!success) {
        return { ok: false, error: { code: 'UNWATCH_ERROR', message: 'Watcher not found' } };
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: { code: 'UNWATCH_ERROR', message: (err as Error).message } };
    }
  });
}
