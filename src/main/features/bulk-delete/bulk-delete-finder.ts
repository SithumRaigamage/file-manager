import fs from 'fs'
import path from 'path'
import { walkDirectory } from '../../domain/shared/directory-walker'
import { isHiddenOrSystem, matchesExtension } from '../../domain/bulk-delete/extension-filter'

export interface BulkDeleteFile {
  path: string
  name: string
  relativePath: string
  size: number
  modifiedAt: number
}

export interface BulkDeleteFindResult {
  files: BulkDeleteFile[]
  totalSize: number
}

/** Finds every file under `folder` (all subfolders) whose name ends with one of `exts`. */
export function findFilesByExtension(folder: string, exts: string[]): BulkDeleteFindResult {
  const files: BulkDeleteFile[] = []
  let totalSize = 0

  walkDirectory(folder, {
    shouldSkipDir: (entry) => isHiddenOrSystem(entry.name),
    onEntry: (fullPath, entry) => {
      if (!entry.isFile() || isHiddenOrSystem(entry.name)) return
      if (!matchesExtension(entry.name, exts)) return
      try {
        const stat = fs.statSync(fullPath)
        files.push({
          path: fullPath,
          name: entry.name,
          relativePath: path.relative(folder, fullPath),
          size: stat.size,
          modifiedAt: stat.mtimeMs
        })
        totalSize += stat.size
      } catch {
        // Skip files we can't stat (removed mid-walk, permissions)
      }
    }
  })

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
  return { files, totalSize }
}
