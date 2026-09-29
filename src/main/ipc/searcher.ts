import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { walkDirectory } from '../domain/shared/directory-walker'
import { resolveUniquePath } from '../domain/shared/unique-path'
import { movePath, isSameOrInside } from '../domain/shared/move-path'
import { planKeywordCollection } from '../domain/searcher/collect-plan'
import { HistoryService, BatchItem } from '../domain/history/history-service'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Drive {
  name: string
  path: string
  type: 'internal' | 'external' | 'network'
}

export interface SearchResult {
  name: string
  fullPath: string
  type: 'file' | 'folder'
  size: number
  extension: string
  modifiedAt: number
  depth: number
  parentPath: string
  childCount: number
}

export interface SearchParams {
  drivePath: string
  query: string
}

export interface CollectParams {
  results: SearchResult[]
  destRoot: string
  folderName: string
}

export interface CollectResult {
  success: boolean
  moved: number
  newFolderPath: string
  errors: string[]
  /** History batch id — the move can be undone from the History page. */
  batchId?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAvailableDrives(): Drive[] {
  const drives: Drive[] = []
  if (process.platform === 'win32') {
    // Windows drive letters
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    for (const char of letters) {
      const drivePath = `${char}:\\`
      if (fs.existsSync(drivePath)) {
        drives.push({
          name: `Drive ${char}:`,
          path: drivePath,
          type: char === 'C' ? 'internal' : 'external'
        })
      }
    }
  } else if (process.platform === 'darwin') {
    // macOS /Volumes
    drives.push({ name: 'Macintosh HD', path: '/', type: 'internal' })
    const volumes = fs.readdirSync('/Volumes')
    for (const vol of volumes) {
      drives.push({ name: vol, path: path.join('/Volumes', vol), type: 'external' })
    }
  }
  return drives
}

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  'library', // macOS ~/Library
  'appdata', // Windows AppData
  'local settings',
  'application data',
  'dist',
  'build',
  'out',
  'target',
  'cache',
  'temp',
  'tmp',
  'pkg',
  'obj'
])

function shouldSkipSearchDir(entry: fs.Dirent): boolean {
  return (
    entry.name.startsWith('$') ||
    entry.name.startsWith('.') ||
    IGNORED_DIRECTORIES.has(entry.name.toLowerCase())
  )
}

function generateVariants(query: string): string[] {
  let q = query.trim().toLowerCase()
  if (q.startsWith('*')) {
    q = q.slice(1)
  }
  return [
    q,
    q.replace(/\s+/g, '_'),
    q.replace(/\s+/g, '-'),
    q.replace(/\s+/g, '.'),
    q.replace(/_/g, ' '),
    q.replace(/-/g, ' '),
    q.replace(/\./g, ' ')
  ]
}

function matchesVariants(entry: fs.Dirent, variants: string[]): boolean {
  const nameLower = entry.name.toLowerCase()
  const ext = path.extname(nameLower)
  const baseNameWithoutExt = path.basename(nameLower, ext)

  const isExtensionMatch = variants.some((v) => {
    const vClean = v.trim()
    if (vClean.startsWith('.')) {
      return ext === vClean
    }
    return ext.slice(1) === vClean
  })
  const isFilenameMatch = variants.some((v) => baseNameWithoutExt.includes(v))
  return isExtensionMatch || isFilenameMatch
}

function toSearchResult(
  fullPath: string,
  entry: fs.Dirent,
  currentPath: string,
  rootPath: string
): SearchResult | null {
  try {
    const stats = fs.statSync(fullPath)
    const item: SearchResult = {
      name: entry.name,
      fullPath,
      type: entry.isDirectory() ? 'folder' : 'file',
      size: stats.size,
      extension: path.extname(entry.name),
      modifiedAt: stats.mtimeMs,
      depth: fullPath.split(path.sep).length - rootPath.split(path.sep).length,
      parentPath: currentPath,
      childCount: 0
    }

    if (entry.isDirectory()) {
      try {
        item.childCount = fs.readdirSync(fullPath).length
      } catch {
        item.childCount = 0
      }
    }

    return item
  } catch {
    // Skip entries we can no longer stat (e.g. removed mid-scan)
    return null
  }
}

function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>()
  return results.filter((item) => {
    if (seen.has(item.fullPath)) return false
    seen.add(item.fullPath)
    return true
  })
}

function sanitizeFolderName(name: string): string {
  // eslint-disable-next-line no-control-regex
  return name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').trim() || 'collected'
}

// ─── IPC Registration ─────────────────────────────────────────────────────────

export function registerSearcherHandlers(): void {
  // List available drives
  ipcMain.handle('searcher:get-drives', async (): Promise<Drive[]> => {
    return getAvailableDrives()
  })

  // Full recursive search with progress streaming
  ipcMain.handle(
    'searcher:search',
    async (event, params: SearchParams): Promise<SearchResult[]> => {
      const { drivePath, query } = params

      if (!query.trim()) return []

      const variants = generateVariants(query)
      const results: SearchResult[] = []
      const state = { scanned: 0 }

      walkDirectory(drivePath, {
        shouldSkipDir: shouldSkipSearchDir,
        onEntry: (fullPath, entry, currentPath) => {
          state.scanned++
          if (!matchesVariants(entry, variants)) return

          const item = toSearchResult(fullPath, entry, currentPath, drivePath)
          if (item) {
            results.push(item)
            event.sender.send('searcher:progress', {
              scanned: state.scanned,
              found: results.length
            })
          }
        }
      })

      const deduplicated = deduplicateResults(results)

      // Final progress update
      event.sender.send('searcher:progress', { scanned: state.scanned, found: deduplicated.length })

      return deduplicated
    }
  )

  // Collect: move all results to a new folder at drive root
  ipcMain.handle(
    'searcher:collect',
    async (event, params: CollectParams): Promise<CollectResult> => {
      const { results, destRoot, folderName } = params
      const safeFolder = sanitizeFolderName(folderName)
      const newFolderPath = path.join(destRoot, safeFolder)
      const errors: string[] = []
      let moved = 0

      try {
        if (!fs.existsSync(newFolderPath)) {
          fs.mkdirSync(newFolderPath, { recursive: true })
        }
      } catch (err) {
        return {
          success: false,
          moved: 0,
          newFolderPath,
          errors: [`Failed to create destination folder: ${(err as Error).message}`]
        }
      }

      const historyItems: BatchItem[] = []

      for (const item of results) {
        // Skip if item no longer exists (may have been moved as part of parent)
        if (!fs.existsSync(item.fullPath)) continue

        // A folder that contains the destination would be moved into itself
        if (isSameOrInside(item.fullPath, newFolderPath)) {
          errors.push(`Skipped "${item.name}": it contains the destination folder`)
          continue
        }

        const destPath = resolveUniquePath(path.join(newFolderPath, item.name))

        try {
          movePath(item.fullPath, destPath)
          moved++
          historyItems.push({ before: item.fullPath, after: destPath, status: 'success' })
          event.sender.send('searcher:collect-progress', { moved, total: results.length })
        } catch (err) {
          errors.push(`Failed to move "${item.name}": ${(err as Error).message}`)
        }
      }

      // Every collect is undoable from the History page
      const batchId =
        historyItems.length > 0
          ? HistoryService.logBatch('organize', historyItems, true)
          : undefined

      return {
        success: errors.length === 0,
        moved,
        newFolderPath,
        errors,
        batchId
      }
    }
  )

  // Get subfolder names for bulk keyword import
  ipcMain.handle('searcher:get-folder-names', async (_, dirPath: string): Promise<string[]> => {
    try {
      if (!fs.existsSync(dirPath)) return []
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })

      const names = entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name.split('.')[0]) // Extract before the first dot
        .filter((name) => name.length > 1) // Filter out very short names

      // Deduplicate result
      return Array.from(new Set(names))
    } catch {
      return []
    }
  })

  // Batch search for multiple keywords in one scan
  ipcMain.handle(
    'searcher:batch-search',
    async (
      event,
      params: { drivePath: string; queries: string[]; destRoot?: string }
    ): Promise<Record<string, SearchResult[]>> => {
      const { drivePath, queries, destRoot } = params
      if (queries.length === 0) return {}

      const keywordMap = queries.reduce(
        (acc, q) => {
          acc[q] = { variants: generateVariants(q), results: [] }
          return acc
        },
        {} as Record<string, { variants: string[]; results: SearchResult[] }>
      )

      const state = { scanned: 0 }

      walkDirectory(drivePath, {
        shouldSkipDir: shouldSkipSearchDir,
        onEntry: (fullPath, entry, currentPath) => {
          state.scanned++
          let matchedAny = false

          for (const query of queries) {
            const { variants, results } = keywordMap[query]
            if (!matchesVariants(entry, variants)) continue

            const item = toSearchResult(fullPath, entry, currentPath, drivePath)
            if (item) {
              results.push(item)
              matchedAny = true
              // Note: we don't stop here because a file might match multiple keywords,
              // but for 'move' automation, we'll handle the first match later.
            }
          }

          if (matchedAny) {
            event.sender.send('searcher:progress', { scanned: state.scanned, found: 0 })
          }
        }
      })

      // Convert map to plain object of results
      const deduped: Record<string, SearchResult[]> = {}
      for (const q of queries) {
        deduped[q] = deduplicateResults(keywordMap[q].results)
      }
      // With a destination, return a safe move plan: each item under one keyword,
      // nothing nested in another planned item, nothing containing the destination.
      return destRoot ? planKeywordCollection(deduped, queries, destRoot) : deduped
    }
  )
}
