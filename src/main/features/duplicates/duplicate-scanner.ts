import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { Worker } from 'worker_threads'
import { db } from '../../db'
import { duplicateGroups } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { walkDirectoryAsync } from '../../domain/shared/directory-walker'
import crypto from 'crypto'

export interface DuplicateScanProgress {
  phase: 'scanning' | 'hashing' | 'completed'
  scannedCount: number
  hashedCount: number
  totalToHash: number
}

export interface DuplicateFile {
  path: string
  lastModified: number
  size: number
}

export interface DuplicateGroupEntity {
  id: string
  hash: string
  size: number
  files: DuplicateFile[]
  status: 'pending' | 'resolved'
}

export class DuplicateScanner {
  private workers: Worker[] = []
  /** Settles an in-flight hashing phase when the scan is cancelled. */
  private onCancel: (() => void) | null = null
  private killed = false

  // Group files by size first (fast)
  private sizeMap = new Map<number, DuplicateFile[]>()

  async scan(
    dirPath: string,
    onProgress: (progress: DuplicateScanProgress) => void
  ): Promise<void> {
    this.killed = false
    this.sizeMap.clear()

    onProgress({ phase: 'scanning', scannedCount: 0, hashedCount: 0, totalToHash: 0 })

    let scannedCount = 0

    // Async walk: a whole-drive scan must not block the main process (P1)
    await walkDirectoryAsync(dirPath, {
      shouldContinue: () => !this.killed,
      onEntry: async (fullPath, item) => {
        if (!item.isFile()) return

        scannedCount++
        if (scannedCount % 500 === 0) {
          onProgress({ phase: 'scanning', scannedCount, hashedCount: 0, totalToHash: 0 })
        }

        try {
          const stat = await fs.promises.stat(fullPath)
          if (stat.size === 0) return // empty files are never duplicates worth removing
          const bucket = this.sizeMap.get(stat.size)
          const file = { path: fullPath, lastModified: stat.mtimeMs, size: stat.size }
          if (bucket) bucket.push(file)
          else this.sizeMap.set(stat.size, [file])
        } catch {
          // Unreadable or vanished mid-scan
        }
      }
    })

    if (this.killed) return

    const filesToHash: DuplicateFile[] = []
    for (const [, files] of this.sizeMap.entries()) {
      if (files.length > 1) {
        filesToHash.push(...files)
      }
    }

    const totalToHash = filesToHash.length
    let hashedCount = 0

    onProgress({ phase: 'hashing', scannedCount, hashedCount, totalToHash })

    if (totalToHash === 0) {
      onProgress({ phase: 'completed', scannedCount, hashedCount, totalToHash })
      return
    }

    // Queue for hashing
    const hashMap = new Map<string, DuplicateFile[]>()

    // Create a worker pool (using CPU cores)
    const numCores = os.cpus().length
    const workerCount = Math.max(1, Math.min(numCores - 1, 4)) // max 4 workers

    const workerScript = path.join(__dirname, 'hash-worker.js') // NOTE: It must be the built .js file in production

    const fileByPath = new Map(filesToHash.map((f) => [f.path, f]))

    return new Promise((resolve) => {
      let currentIndex = 0
      let finishedWorkers = 0
      let settled = false

      // Resolves exactly once: on completion, on cancel(), or when every worker is gone.
      const settle = (completed: boolean): void => {
        if (settled) return
        settled = true
        this.onCancel = null
        for (const worker of this.workers) void worker.terminate()
        this.workers = []
        if (completed) {
          this.saveResults(hashMap)
          onProgress({ phase: 'completed', scannedCount, hashedCount, totalToHash })
        }
        resolve()
      }
      this.onCancel = () => settle(false)

      const retire = (worker: Worker): void => {
        void worker.terminate()
        finishedWorkers++
        if (finishedWorkers === workerCount) settle(true)
      }

      const processNext = (worker: Worker): void => {
        if (this.killed) return settle(false)
        if (currentIndex < filesToHash.length) {
          worker.postMessage(filesToHash[currentIndex++].path)
        } else {
          retire(worker)
        }
      }

      for (let i = 0; i < workerCount; i++) {
        // electron-vite builds the worker as its own entry next to the main bundle
        const resolvedScript = fs.existsSync(workerScript)
          ? workerScript
          : workerScript.replace('.js', '.ts')
        const worker = new Worker(resolvedScript)
        this.workers.push(worker)

        worker.on('message', (result: { filePath: string; hash?: string; error?: string }) => {
          hashedCount++
          onProgress({ phase: 'hashing', scannedCount, hashedCount, totalToHash })

          const file = fileByPath.get(result.filePath)
          if (result.hash && file) {
            const group = hashMap.get(result.hash)
            if (group) group.push(file)
            else hashMap.set(result.hash, [file])
          }
          processNext(worker)
        })

        // A crashed worker cannot take more jobs; the others finish the queue.
        worker.on('error', (err) => {
          console.error('Hash worker error', err)
          retire(worker)
        })

        processNext(worker)
      }
    })
  }

  /** Replaces the previous scan's unresolved groups with this scan's, atomically. */
  private saveResults(hashMap: Map<string, DuplicateFile[]>): void {
    const createdAt = new Date().toISOString()
    db.transaction((tx) => {
      tx.delete(duplicateGroups).where(eq(duplicateGroups.status, 'pending')).run()
      for (const [hash, files] of hashMap.entries()) {
        if (files.length < 2) continue
        tx.insert(duplicateGroups)
          .values({
            id: crypto.randomUUID(),
            hash,
            size: files[0].size,
            files,
            status: 'pending',
            createdAt
          })
          .run()
      }
    })
  }

  cancel(): void {
    this.killed = true
    if (this.onCancel) {
      this.onCancel()
    } else {
      for (const worker of this.workers) void worker.terminate()
      this.workers = []
    }
  }
}
