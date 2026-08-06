import * as fs from 'fs';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { db } from '../../db';
import { duplicateGroups } from '../../db/schema';
import crypto from 'crypto';

export interface DuplicateScanProgress {
  phase: 'scanning' | 'hashing' | 'completed';
  scannedCount: number;
  hashedCount: number;
  totalToHash: number;
}

export interface DuplicateFile {
  path: string;
  lastModified: number;
  size: number;
}

export interface DuplicateGroupEntity {
  id: string;
  hash: string;
  size: number;
  files: DuplicateFile[];
  status: 'pending' | 'resolved';
}

export class DuplicateScanner {
  private workers: Worker[] = [];
  private killed = false;
  
  // Group files by size first (fast)
  private sizeMap = new Map<number, DuplicateFile[]>();

  async scan(dirPath: string, onProgress: (progress: DuplicateScanProgress) => void): Promise<void> {
    this.killed = false;
    this.sizeMap.clear();

    onProgress({ phase: 'scanning', scannedCount: 0, hashedCount: 0, totalToHash: 0 });

    let scannedCount = 0;
    
    const walk = (dir: string) => {
      if (this.killed) return;
      
      let items: fs.Dirent[] = [];
      try {
        items = fs.readdirSync(dir, { withFileTypes: true });
      } catch (err) {
        return; // Skip unreadable directories
      }

      for (const item of items) {
        if (this.killed) return;
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          walk(fullPath);
        } else if (item.isFile()) {
          scannedCount++;
          if (scannedCount % 500 === 0) {
            onProgress({ phase: 'scanning', scannedCount, hashedCount: 0, totalToHash: 0 });
          }
          
          try {
            const stat = fs.statSync(fullPath);
            if (stat.size > 0) { // Ignore empty files
              if (!this.sizeMap.has(stat.size)) {
                this.sizeMap.set(stat.size, []);
              }
              this.sizeMap.get(stat.size)!.push({
                path: fullPath,
                lastModified: stat.mtimeMs,
                size: stat.size
              });
            }
          } catch (e) {
            // Ignore stat errors
          }
        }
      }
    };

    walk(dirPath);
    if (this.killed) return;

    const filesToHash: DuplicateFile[] = [];
    for (const [, files] of this.sizeMap.entries()) {
      if (files.length > 1) {
        filesToHash.push(...files);
      }
    }

    const totalToHash = filesToHash.length;
    let hashedCount = 0;

    onProgress({ phase: 'hashing', scannedCount, hashedCount, totalToHash });

    if (totalToHash === 0) {
      onProgress({ phase: 'completed', scannedCount, hashedCount, totalToHash });
      return;
    }

    // Queue for hashing
    const hashMap = new Map<string, DuplicateFile[]>();
    
    // Create a worker pool (using CPU cores)
    const numCores = require('os').cpus().length;
    const workerCount = Math.max(1, Math.min(numCores - 1, 4)); // max 4 workers
    
    const workerScript = path.join(__dirname, 'hash-worker.js'); // NOTE: It must be the built .js file in production
    
    return new Promise((resolve) => {
      let currentIndex = 0;
      let completedWorkers = 0;

      const processNext = (worker: Worker) => {
        if (this.killed) return;
        if (currentIndex < filesToHash.length) {
          const file = filesToHash[currentIndex++];
          worker.postMessage(file.path);
        } else {
          completedWorkers++;
          worker.terminate();
          if (completedWorkers === this.workers.length) {
            this.workers = [];
            this.saveResults(hashMap);
            onProgress({ phase: 'completed', scannedCount, hashedCount, totalToHash });
            resolve();
          }
        }
      };

      for (let i = 0; i < workerCount; i++) {
        // Need to load the compiled js file in prod, or ts-node in dev?
        // Electron Vite builds main to `out/main/index.js`, so the worker needs to be a separate entry or we inline it.
        // For MVP, we will use a separate entry point in electron.vite.config.ts for the worker.
        let resolvedScript = workerScript;
        if (!fs.existsSync(resolvedScript)) {
          // Fallback if running via ts-node directly (unlikely in electron-vite)
          resolvedScript = workerScript.replace('.js', '.ts');
        }

        const worker = new Worker(resolvedScript, {
          // If we use .ts file, we might need execArgv for ts-node, but electron-vite builds to .js
        });
        this.workers.push(worker);

        worker.on('message', (result: { filePath: string, hash?: string, error?: string }) => {
          hashedCount++;
          onProgress({ phase: 'hashing', scannedCount, hashedCount, totalToHash });

          if (result.hash) {
            if (!hashMap.has(result.hash)) {
              hashMap.set(result.hash, []);
            }
            const originalFile = filesToHash.find(f => f.path === result.filePath);
            if (originalFile) {
              hashMap.get(result.hash)!.push(originalFile);
            }
          }
          processNext(worker);
        });

        worker.on('error', (err) => {
          console.error('Worker error', err);
          processNext(worker); // Keep going even if one file fails
        });

        // Bootstrap the first tasks
        processNext(worker);
      }
    });
  }

  private saveResults(hashMap: Map<string, DuplicateFile[]>) {
    for (const [hash, files] of hashMap.entries()) {
      if (files.length > 1) {
        const id = crypto.randomUUID();
        db.insert(duplicateGroups).values({
          id,
          hash,
          size: files[0].size,
          files,
          status: 'pending',
          createdAt: new Date().toISOString()
        }).run();
      }
    }
  }

  cancel(): void {
    this.killed = true;
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
  }
}
