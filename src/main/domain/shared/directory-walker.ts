import fs from 'fs'
import path from 'path'

export interface WalkOptions {
  /** Called for every entry (file or directory) encountered. */
  onEntry: (fullPath: string, entry: fs.Dirent, currentPath: string) => void
  /** Return true to skip descending into a directory entry. */
  shouldSkipDir?: (entry: fs.Dirent, fullPath: string) => boolean
  /** Return false to abort the walk early (e.g. user cancellation). Checked before reading each directory and before processing each entry. */
  shouldContinue?: () => boolean
}

/**
 * Recursively walks a directory tree depth-first, invoking `onEntry` for every
 * file and folder found. Silently skips directories that can't be read
 * (permission errors, locked folders, etc).
 */
export function walkDirectory(rootPath: string, options: WalkOptions): void {
  const { onEntry, shouldSkipDir, shouldContinue } = options

  function walk(currentPath: string): void {
    if (shouldContinue && !shouldContinue()) return

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (shouldContinue && !shouldContinue()) return

      const fullPath = path.join(currentPath, entry.name)
      onEntry(fullPath, entry, currentPath)

      if (entry.isDirectory() && !(shouldSkipDir && shouldSkipDir(entry, fullPath))) {
        walk(fullPath)
      }
    }
  }

  walk(rootPath)
}
