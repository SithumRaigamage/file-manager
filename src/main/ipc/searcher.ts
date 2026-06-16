import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

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

function walkTree(
  currentPath: string,
  rootPath: string,
  variants: string[],
  results: SearchResult[],
  onProgress: (scanned: number, found: number) => void,
  state: { scanned: number }
): void {
  try {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })
    state.scanned += entries.length

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name)
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
      const isMatch = isExtensionMatch || isFilenameMatch

      if (isMatch) {
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

        results.push(item)
        onProgress(state.scanned, results.length)
      }

      // Recurse if directory (and not hidden/system usually, but keeping it simple)
      if (
        entry.isDirectory() &&
        !entry.name.startsWith('$') &&
        !entry.name.startsWith('.') &&
        !IGNORED_DIRECTORIES.has(entry.name.toLowerCase())
      ) {
        walkTree(fullPath, rootPath, variants, results, onProgress, state)
      }
    }
  } catch {
    // Skip locked/inaccessible folders
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

function getUniqueDestination(targetPath: string): string {
  if (!fs.existsSync(targetPath)) return targetPath
  const ext = path.extname(targetPath)
  const base = path.join(path.dirname(targetPath), path.basename(targetPath, ext))
  let counter = 1
  while (fs.existsSync(`${base} (${counter})${ext}`)) {
    counter++
  }
  return `${base} (${counter})${ext}`
}

function moveItem(source: string, dest: string): void {
  // Try rename first (fast on same drive)
  try {
    fs.renameSync(source, dest)
  } catch {
    // If it fails (e.g. cross-device), copy and delete
    const stats = fs.statSync(source)
    if (stats.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true })
      const entries = fs.readdirSync(source)
      for (const entry of entries) {
        moveItem(path.join(source, entry), path.join(dest, entry))
      }
      fs.rmdirSync(source)
    } else {
      fs.copyFileSync(source, dest)
      fs.unlinkSync(source)
    }
  }
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
      const raw: SearchResult[] = []
      const state = { scanned: 0 }

      const onProgress = (scanned: number, found: number): void => {
        event.sender.send('searcher:progress', { scanned, found })
      }

      walkTree(drivePath, drivePath, variants, raw, onProgress, state)

      const deduplicated = deduplicateResults(raw)

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

      for (const item of results) {
        // Skip if item no longer exists (may have been moved as part of parent)
        if (!fs.existsSync(item.fullPath)) continue

        const destPath = getUniqueDestination(path.join(newFolderPath, item.name))

        try {
          moveItem(item.fullPath, destPath)
          moved++
          event.sender.send('searcher:collect-progress', { moved, total: results.length })
        } catch (err) {
          errors.push(`Failed to move "${item.name}": ${(err as Error).message}`)
        }
      }

      return {
        success: errors.length === 0,
        moved,
        newFolderPath,
        errors
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
    async (event, params: { drivePath: string; queries: string[] }): Promise<Record<string, SearchResult[]>> => {
      const { drivePath, queries } = params
      if (queries.length === 0) return {}

      const keywordMap = queries.reduce((acc, q) => {
        acc[q] = { variants: generateVariants(q), results: [] }
        return acc
      }, {} as Record<string, { variants: string[]; results: SearchResult[] }>)

      const state = { scanned: 0 }
      const onProgress = (scanned: number, found: number): void => {
        event.sender.send('searcher:progress', { scanned, found })
      }

      // Helper for batch matching within the walk
      const walkBatch = (currentPath: string, root: string): void => {
        try {
          const entries = fs.readdirSync(currentPath, { withFileTypes: true })
          state.scanned += entries.length

          for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name)
            const nameLower = entry.name.toLowerCase()
            const ext = path.extname(nameLower)
            const baseNameWithoutExt = path.basename(nameLower, ext)
            let matchedAny = false

            for (const query of queries) {
              const { variants, results } = keywordMap[query]
              const isExtensionMatch = variants.some((v) => {
                const vClean = v.trim()
                if (vClean.startsWith('.')) {
                  return ext === vClean
                }
                return ext.slice(1) === vClean
              })
              const isFilenameMatch = variants.some((v) => baseNameWithoutExt.includes(v))

              if (isExtensionMatch || isFilenameMatch) {
                const stats = fs.statSync(fullPath)
                results.push({
                  name: entry.name,
                  fullPath,
                  type: entry.isDirectory() ? 'folder' : 'file',
                  size: stats.size,
                  extension: path.extname(entry.name),
                  modifiedAt: stats.mtimeMs,
                  depth: fullPath.split(path.sep).length - root.split(path.sep).length,
                  parentPath: currentPath,
                  childCount: 0
                })
                matchedAny = true
                // Note: We don't 'break' here because a file might match multiple keywords 
                // but for 'move' automation, we'll handle the first match later.
              }
            }

            if (matchedAny) {
              onProgress(state.scanned, 0) // Found count isn't easily calculated here
            }

            // Recurse
            if (
              entry.isDirectory() &&
              !entry.name.startsWith('$') &&
              !entry.name.startsWith('.') &&
              !IGNORED_DIRECTORIES.has(entry.name.toLowerCase())
            ) {
              walkBatch(fullPath, root)
            }
          }
        } catch {
          // Skip inaccessible
        }
      }

      walkBatch(drivePath, drivePath)

      // Convert map to plain object of results
      const final: Record<string, SearchResult[]> = {}
      for (const q of queries) {
        final[q] = deduplicateResults(keywordMap[q].results)
      }
      return final
    }
  )
}
