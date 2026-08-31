import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { RuleEvaluator, RuleSetDomain } from '../domain/organizer/rule-evaluator'
import { ConflictDetector } from '../domain/organizer/conflict-detector'

export interface ExtensionRule {
  extensions: string[]
  folderName: string
  enabled: boolean
}

export interface OrganizerJob {
  sourceDir: string
  rules: ExtensionRule[]
  createSubfolders: boolean
  mode: 'move' | 'copy'
}

export interface OrganizerPreviewItem {
  sourcePath: string
  destinationPath: string
  fileName: string
  extension: string
  category: string
  size: number
}

export interface OrganizerResult {
  success: boolean
  processed: number
  skipped: number
  errors: string[]
}

function scanDirectory(dir: string): string[] {
  const files: string[] = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile()) {
        files.push(path.join(dir, entry.name))
      }
    }
  } catch (err) {
    console.error('Error scanning directory:', err)
  }
  return files
}

function findMatchingRule(ext: string, rules: ExtensionRule[]): ExtensionRule | null {
  const normalizedExt = ext.toLowerCase().replace(/^\./, '')
  return (
    rules.find(
      (r) =>
        r.enabled && r.extensions.some((e) => e.toLowerCase().replace(/^\./, '') === normalizedExt)
    ) || null
  )
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function getUniqueDestination(destPath: string): string {
  if (!fs.existsSync(destPath)) return destPath
  const ext = path.extname(destPath)
  const base = destPath.slice(0, -ext.length)
  let counter = 1
  while (fs.existsSync(`${base} (${counter})${ext}`)) counter++
  return `${base} (${counter})${ext}`
}

export function registerOrganizerHandlers(): void {
  // Preview what would happen
  ipcMain.handle(
    'organizer:preview',
    async (_, job: OrganizerJob): Promise<OrganizerPreviewItem[]> => {
      const files = scanDirectory(job.sourceDir)
      const preview: OrganizerPreviewItem[] = []

      for (const filePath of files) {
        const ext = path.extname(filePath)
        const rule = findMatchingRule(ext, job.rules)
        if (!rule) continue

        const fileName = path.basename(filePath)
        const destDir = path.join(job.sourceDir, rule.folderName)
        const destPath = path.join(destDir, fileName)
        const stats = fs.statSync(filePath)

        preview.push({
          sourcePath: filePath,
          destinationPath: destPath,
          fileName,
          extension: ext,
          category: rule.folderName,
          size: stats.size
        })
      }

      return preview
    }
  )

  // Execute the organization
  ipcMain.handle(
    'organizer:execute',
    async (event, job: OrganizerJob): Promise<OrganizerResult> => {
      const files = scanDirectory(job.sourceDir)
      let processed = 0
      let skipped = 0
      const errors: string[] = []

      for (const filePath of files) {
        const ext = path.extname(filePath)
        const rule = findMatchingRule(ext, job.rules)

        if (!rule) {
          skipped++
          continue
        }

        const fileName = path.basename(filePath)
        const destDir = path.join(job.sourceDir, rule.folderName)

        try {
          ensureDir(destDir)
          const destPath = getUniqueDestination(path.join(destDir, fileName))

          if (job.mode === 'move') {
            fs.renameSync(filePath, destPath)
          } else {
            fs.copyFileSync(filePath, destPath)
          }

          processed++
          event.sender.send('organizer:progress', { processed, total: files.length, fileName })
        } catch (err) {
          errors.push(`Failed to process ${fileName}: ${(err as Error).message}`)
        }
      }

      return { success: errors.length === 0, processed, skipped, errors }
    }
  )

  // Get file stats for a directory
  ipcMain.handle('organizer:scan', async (_, dirPath: string) => {
    const files = scanDirectory(dirPath)
    const stats: Record<string, number> = {}

    for (const filePath of files) {
      const ext = path.extname(filePath).toLowerCase() || 'no extension'
      stats[ext] = (stats[ext] || 0) + 1
    }

    return { totalFiles: files.length, byExtension: stats }
  })

  // Watcher Service API
  ipcMain.handle('organizer:startWatching', async (_, ruleId: string, folderPath: string) => {
    try {
      const { WatcherService } = await import('../domain/watcher/watcher-service')
      WatcherService.watchFolder(ruleId, folderPath)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('organizer:stopWatching', async (_, ruleId: string, folderPath: string) => {
    try {
      const { WatcherService } = await import('../domain/watcher/watcher-service')
      WatcherService.unwatchFolder(ruleId, folderPath)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // ─── NEW fileflow API Handlers ────────────────────────────────────────────────

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

      for (const item of items) {
        try {
          // Ensure destination directory exists
          const destDir = path.dirname(item.proposedDestination);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }

          // Handle filename conflicts
          let destPath = item.proposedDestination;
          let counter = 1;
          while (fs.existsSync(destPath)) {
            const ext = path.extname(item.proposedDestination);
            const base = path.basename(item.proposedDestination, ext);
            destPath = path.join(destDir, `${base} (${counter})${ext}`);
            counter++;
          }

          // Execute the move or copy
          if (item.action === 'move') {
            fs.renameSync(item.originalPath, destPath);
          } else {
            fs.copyFileSync(item.originalPath, destPath);
          }
          organized++;
        } catch (err) {
          skipped.push({ path: item.originalPath, reason: (err as Error).message });
        }
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
