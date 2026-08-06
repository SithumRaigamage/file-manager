import { db } from '../../db';
import { searchIndex } from '../../db/schema';
import { eq, desc, sql, and, or, gte, lte } from 'drizzle-orm';
import { Worker } from 'worker_threads';
import * as path from 'path';
import { app } from 'electron';

export interface SearchQuery {
  text: string;
  useRegex?: boolean;
  minSize?: number;
  maxSize?: number;
  extensions?: string[];
}

export class SearchEngine {
  private activeWorker: Worker | null = null;
  private dbPath: string;

  constructor() {
    const userDataPath = app ? app.getPath('userData') : process.cwd();
    this.dbPath = path.join(userDataPath, 'fileflow.db');
  }

  startIndexing(dirPath: string, onProgress: (data: any) => void): Promise<void> {
    if (this.activeWorker) {
      this.activeWorker.postMessage({ command: 'cancel' });
    }

    return new Promise((resolve, reject) => {
      // Must use built JS file in production, TS in dev if running via ts-node, but electron-vite builds to js
      const workerScript = path.join(__dirname, 'indexer-worker.js');
      
      this.activeWorker = new Worker(workerScript);
      
      this.activeWorker.on('message', (msg) => {
        if (msg.type === 'progress') {
          onProgress({ scanned: msg.scanned, indexed: msg.indexed });
        } else if (msg.type === 'completed') {
          this.activeWorker?.terminate();
          this.activeWorker = null;
          resolve();
        } else if (msg.type === 'error') {
          reject(new Error(msg.error));
        }
      });

      this.activeWorker.on('error', (err) => {
        reject(err);
      });

      this.activeWorker.postMessage({ 
        command: 'start', 
        dirPath,
        dbPath: this.dbPath 
      });
    });
  }

  cancelIndexing() {
    if (this.activeWorker) {
      this.activeWorker.postMessage({ command: 'cancel' });
      this.activeWorker = null;
    }
  }

  search(query: SearchQuery) {
    let conditions: any[] = [];
    
    if (query.text) {
      // Use FTS5 for fast text search
      // Note: We use Drizzle's sql template for raw FTS queries
      conditions.push(sql`rowid IN (SELECT rowid FROM search_index_fts WHERE search_index_fts MATCH ${query.text + '*'})`);
    }
    
    if (query.minSize) {
      conditions.push(gte(searchIndex.size, query.minSize));
    }
    if (query.maxSize) {
      conditions.push(lte(searchIndex.size, query.maxSize));
    }
    
    if (query.extensions && query.extensions.length > 0) {
      const extConditions = query.extensions.map(ext => eq(searchIndex.extension, ext.toLowerCase()));
      conditions.push(or(...extConditions));
    }

    const finalQuery = db.select()
      .from(searchIndex)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(1000); // hard limit to prevent UI freezes
      
    return finalQuery.all();
  }

  getLargestFiles(limit: number = 50) {
    return db.select()
      .from(searchIndex)
      .where(eq(searchIndex.isDirectory, false))
      .orderBy(desc(searchIndex.size))
      .limit(limit)
      .all();
  }

  getStorageAnalytics() {
    // Aggregate by extension
    const extStats = db.select({
      extension: searchIndex.extension,
      totalSize: sql<number>`SUM(${searchIndex.size})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(searchIndex)
    .where(eq(searchIndex.isDirectory, false))
    .groupBy(searchIndex.extension)
    .orderBy(desc(sql`SUM(${searchIndex.size})`))
    .all();

    return { extStats };
  }
}

export const searchEngine = new SearchEngine();
