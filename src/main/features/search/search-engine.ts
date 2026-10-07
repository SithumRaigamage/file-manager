import { db } from '../../db'
import { searchIndex } from '../../db/schema'
import { toFtsPrefixQuery } from '../../domain/search/fts-query'
import { eq, desc, sql, and, or, gte, lte, SQL } from 'drizzle-orm'
import { Worker } from 'worker_threads'
import * as path from 'path'
import { app } from 'electron'

export interface SearchQuery {
  text: string
  useRegex?: boolean
  minSize?: number
  maxSize?: number
  extensions?: string[]
}

export class SearchEngine {
  private activeWorker: Worker | null = null
  private dbPath: string

  constructor() {
    const userDataPath = app ? app.getPath('userData') : process.cwd()
    this.dbPath = path.join(userDataPath, 'fileflow.db')
  }

  startIndexing(dirPath: string, onProgress: (data: unknown) => void): Promise<void> {
    // Stop any previous run outright. A 'cancel' message can't interrupt the
    // worker's synchronous directory walk, so the old worker would otherwise
    // keep emitting progress interleaved with the new run's.
    this.cancelIndexing()

    return new Promise((resolve, reject) => {
      // Must use built JS file in production, TS in dev if running via ts-node, but electron-vite builds to js
      const workerScript = path.join(__dirname, 'indexer-worker.js')

      const worker = new Worker(workerScript)
      this.activeWorker = worker
      const isCurrent = (): boolean => this.activeWorker === worker

      worker.on('message', (msg) => {
        if (msg.type === 'progress') {
          if (isCurrent()) onProgress({ scanned: msg.scanned, indexed: msg.indexed })
        } else if (msg.type === 'completed') {
          worker.terminate()
          if (isCurrent()) this.activeWorker = null
          resolve()
        } else if (msg.type === 'error') {
          if (isCurrent()) this.activeWorker = null
          reject(new Error(msg.error))
        }
      })

      worker.on('error', (err) => {
        if (isCurrent()) this.activeWorker = null
        reject(err)
      })

      // Settles the promise when the worker is terminated by cancel/supersede
      worker.on('exit', () => resolve())

      worker.postMessage({
        command: 'start',
        dirPath,
        dbPath: this.dbPath
      })
    })
  }

  cancelIndexing(): void {
    if (this.activeWorker) {
      this.activeWorker.terminate()
      this.activeWorker = null
    }
  }

  search(query: SearchQuery): Array<typeof searchIndex.$inferSelect> {
    const conditions: Array<SQL | undefined> = []

    const ftsQuery = query.text ? toFtsPrefixQuery(query.text) : null
    if (ftsQuery) {
      // FTS5 for fast text search; the expression is built from quoted terms only
      conditions.push(
        sql`rowid IN (SELECT rowid FROM search_index_fts WHERE search_index_fts MATCH ${ftsQuery})`
      )
    }

    if (query.minSize) {
      conditions.push(gte(searchIndex.size, query.minSize))
    }
    if (query.maxSize) {
      conditions.push(lte(searchIndex.size, query.maxSize))
    }

    if (query.extensions && query.extensions.length > 0) {
      const extConditions = query.extensions.map((ext) =>
        eq(searchIndex.extension, ext.toLowerCase())
      )
      conditions.push(or(...extConditions))
    }

    const finalQuery = db
      .select()
      .from(searchIndex)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(1000) // hard limit to prevent UI freezes

    return finalQuery.all()
  }

  getLargestFiles(limit: number = 50): Array<typeof searchIndex.$inferSelect> {
    return db
      .select()
      .from(searchIndex)
      .where(eq(searchIndex.isDirectory, false))
      .orderBy(desc(searchIndex.size))
      .limit(limit)
      .all()
  }

  getStorageAnalytics(): {
    extStats: Array<{ extension: string; totalSize: number; count: number }>
  } {
    // Aggregate by extension
    const extStats = db
      .select({
        extension: searchIndex.extension,
        totalSize: sql<number>`SUM(${searchIndex.size})`,
        count: sql<number>`COUNT(*)`
      })
      .from(searchIndex)
      .where(eq(searchIndex.isDirectory, false))
      .groupBy(searchIndex.extension)
      .orderBy(desc(sql`SUM(${searchIndex.size})`))
      .all()

    return { extStats }
  }
}

export const searchEngine = new SearchEngine()
