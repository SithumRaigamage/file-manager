import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import fs from 'fs';
import { RuleEvaluator, RuleSetDomain } from '../organizer/rule-evaluator';
import { FileStabilityChecker } from '../organizer/file-stability';
import { db } from '../../db';
import { ruleSets } from '../../db/schema';
import { eq } from 'drizzle-orm';

export class WatcherService {
  private static watchers = new Map<string, FSWatcher>();
  // Maps folderPath -> Set of active Rule IDs
  private static folderToRules = new Map<string, Set<string>>();

  static watchFolder(ruleId: string, folderPath: string): void {
    const absolutePath = path.resolve(folderPath);

    if (!fs.existsSync(absolutePath)) {
      console.warn(`[Watcher] Cannot watch non-existent folder: ${absolutePath}`);
      return;
    }

    // Add rule to map
    if (!this.folderToRules.has(absolutePath)) {
      this.folderToRules.set(absolutePath, new Set());
    }
    this.folderToRules.get(absolutePath)!.add(ruleId);

    // If already watching this folder, we just needed to add the rule ID
    if (this.watchers.has(absolutePath)) {
      return;
    }

    // Spawn a new watcher
    console.log(`[Watcher] Starting to watch: ${absolutePath}`);
    const watcher = chokidar.watch(absolutePath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      depth: 0, // MVP: Only watch top level for Auto Mode
      ignoreInitial: true, // Don't trigger 'add' for existing files
      awaitWriteFinish: false, // We handle stability ourselves for finer control
    });

    watcher.on('add', (filePath) => {
      this.handleFileAdded(absolutePath, filePath);
    });

    watcher.on('error', error => console.error(`[Watcher Error] ${error}`));

    this.watchers.set(absolutePath, watcher);
  }

  static unwatchFolder(ruleId: string, folderPath: string): void {
    const absolutePath = path.resolve(folderPath);

    const rules = this.folderToRules.get(absolutePath);
    if (rules) {
      rules.delete(ruleId);
      
      // If no more rules are watching this folder, close the watcher
      if (rules.size === 0) {
        this.folderToRules.delete(absolutePath);
        const watcher = this.watchers.get(absolutePath);
        if (watcher) {
          watcher.close().then(() => {
            console.log(`[Watcher] Stopped watching: ${absolutePath}`);
          });
          this.watchers.delete(absolutePath);
        }
      }
    }
  }

  static unwatchAll(): void {
    for (const [, watcher] of this.watchers.entries()) {
      watcher.close();
    }
    this.watchers.clear();
    this.folderToRules.clear();
  }

  private static async handleFileAdded(folderPath: string, filePath: string): Promise<void> {
    console.log(`[Watcher] File added: ${filePath}`);

    // Wait until the file has stopped growing (fully downloaded/copied)
    const isStable = await FileStabilityChecker.waitUntilStable(filePath);
    if (!isStable) {
      console.log(`[Watcher] Ignoring unstable or invalid file: ${filePath}`);
      return;
    }

    // File is stable. Now evaluate all active rules for this folder.
    const ruleIds = this.folderToRules.get(folderPath);
    if (!ruleIds || ruleIds.size === 0) return;

    // Fetch the rule definitions from the DB
    // Note: It's better to cache this, but for MVP we can fetch fresh to always have latest logic
    for (const ruleId of ruleIds) {
      const rows = db.select().from(ruleSets).where(eq(ruleSets.id, ruleId)).all();
      if (rows.length === 0) continue;

      const rule = rows[0] as unknown as RuleSetDomain;

      // Ensure conditions and action are parsed if they are JSON strings
      if (typeof rule.conditions === 'string') {
        try { rule.conditions = JSON.parse(rule.conditions); } catch {}
      }
      if (typeof rule.action === 'string') {
        try { rule.action = JSON.parse(rule.action as string); } catch {}
      }

      if (RuleEvaluator.evaluate(filePath, rule)) {
        console.log(`[Watcher] File ${filePath} matched rule ${rule.name}`);
        this.executeRuleAction(filePath, rule);
        break; // Stop evaluating other rules on this file to prevent conflicts
      }
    }
  }

  private static executeRuleAction(filePath: string, rule: RuleSetDomain): void {
    if (!rule.action || !rule.action.destination) return;

    const destFolder = path.resolve(rule.action.destination);
    if (!fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, { recursive: true });
    }

    const fileName = path.basename(filePath);
    let destPath = path.join(destFolder, fileName);

    // Basic collision handling: append number
    let counter = 1;
    while (fs.existsSync(destPath)) {
      const ext = path.extname(fileName);
      const base = path.basename(fileName, ext);
      destPath = path.join(destFolder, `${base} (${counter})${ext}`);
      counter++;
    }

    try {
      if (rule.action.type === 'move') {
        fs.renameSync(filePath, destPath);
      } else if (rule.action.type === 'copy') {
        fs.copyFileSync(filePath, destPath);
      }
      console.log(`[Watcher] Successfully ${rule.action.type}d ${fileName} to ${destPath}`);
      
      // TODO: In the future, log this action to the BatchRecord Undo/History Service.
    } catch (err) {
      console.error(`[Watcher] Failed to execute rule ${rule.name} on ${filePath}:`, err);
    }
  }
}
