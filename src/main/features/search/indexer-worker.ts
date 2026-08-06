import { parentPort } from 'worker_threads';
import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

interface IndexerMessage {
  command: 'start' | 'cancel';
  dirPath?: string;
  dbPath?: string;
}

let isCancelled = false;

if (parentPort) {
  parentPort.on('message', async (msg: IndexerMessage) => {
    if (msg.command === 'cancel') {
      isCancelled = true;
      return;
    }

    if (msg.command === 'start' && msg.dirPath && msg.dbPath) {
      isCancelled = false;
      try {
        await startIndexing(msg.dirPath, msg.dbPath);
        parentPort?.postMessage({ type: 'completed' });
      } catch (error) {
        parentPort?.postMessage({ type: 'error', error: (error as Error).message });
      }
    }
  });
}

async function startIndexing(dirPath: string, dbPath: string) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  const insertStmt = db.prepare(`
    INSERT INTO search_index (id, path, filename, extension, size, last_modified, is_directory)
    VALUES (@id, @path, @filename, @extension, @size, @lastModified, @isDirectory)
    ON CONFLICT(path) DO UPDATE SET
      filename = excluded.filename,
      extension = excluded.extension,
      size = excluded.size,
      last_modified = excluded.last_modified,
      is_directory = excluded.is_directory
  `);

  let scanned = 0;
  let indexed = 0;
  
  // Use a transaction for bulk inserts to significantly improve performance
  const processBatch = db.transaction((batch: any[]) => {
    for (const item of batch) {
      insertStmt.run(item);
      indexed++;
    }
  });

  let currentBatch: any[] = [];
  const BATCH_SIZE = 1000;

  function flush() {
    if (currentBatch.length > 0) {
      processBatch(currentBatch);
      currentBatch = [];
      parentPort?.postMessage({ type: 'progress', scanned, indexed });
    }
  }

  function walk(currentDir: string) {
    if (isCancelled) return;
    
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return; // Skip folders we can't read
    }

    for (const entry of entries) {
      if (isCancelled) break;
      
      const fullPath = path.join(currentDir, entry.name);
      scanned++;
      
      try {
        const stats = fs.statSync(fullPath);
        
        currentBatch.push({
          id: randomUUID(),
          path: fullPath,
          filename: entry.name,
          extension: entry.isDirectory() ? '' : path.extname(entry.name).toLowerCase(),
          size: stats.size,
          lastModified: stats.mtimeMs,
          isDirectory: entry.isDirectory() ? 1 : 0
        });

        if (currentBatch.length >= BATCH_SIZE) {
          flush();
        }

        if (entry.isDirectory()) {
          walk(fullPath);
        }
      } catch {
        // Skip files we can't stat
      }
    }
  }

  walk(dirPath);
  flush(); // flush remaining
  db.close();
}
