import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export interface RenamePattern {
  type: 'sequential' | 'prefix' | 'suffix' | 'replace' | 'date'
  prefix?: string
  suffix?: string
  separator?: string
  startIndex?: number
  find?: string
  replaceWith?: string
  dateFormat?: string
  extension?: 'keep' | 'lowercase' | 'uppercase'
}

export interface RenamePreviewItem {
  sourcePath: string
  oldName: string
  newName: string
  newPath: string
  conflict: boolean
}

function formatDate(date: Date, format: string): string {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const pad = (n: number) => n.toString().padStart(2, '0')
  return format
    .replace('YYYY', date.getFullYear().toString())
    .replace('MM', pad(date.getMonth() + 1))
    .replace('DD', pad(date.getDate()))
    .replace('HH', pad(date.getHours()))
    .replace('mm', pad(date.getMinutes()))
    .replace('ss', pad(date.getSeconds()))
}

function buildNewName(filePath: string, pattern: RenamePattern, index: number): string {
  const ext = path.extname(filePath)
  const nameWithoutExt = path.basename(filePath, ext)
  const stats = fs.statSync(filePath)

  let newBase = nameWithoutExt
  const sep = pattern.separator ?? '_'

  switch (pattern.type) {
    case 'sequential': {
      const idx = (pattern.startIndex ?? 1) + index
      const parts: string[] = []
      if (pattern.prefix) parts.push(pattern.prefix)
      parts.push(idx.toString())
      if (pattern.suffix) parts.push(pattern.suffix)
      newBase = parts.join(sep)
      break
    }
    case 'prefix': {
      newBase = pattern.prefix ? `${pattern.prefix}${sep}${nameWithoutExt}` : nameWithoutExt
      break
    }
    case 'suffix': {
      newBase = pattern.suffix ? `${nameWithoutExt}${sep}${pattern.suffix}` : nameWithoutExt
      break
    }
    case 'replace': {
      if (pattern.find) {
        newBase = nameWithoutExt.replaceAll(pattern.find, pattern.replaceWith ?? '')
      }
      break
    }
    case 'date': {
      const date = new Date(stats.mtime)
      const dateStr = formatDate(date, pattern.dateFormat ?? 'YYYY-MM-DD')
      newBase = `${dateStr}${sep}${nameWithoutExt}`
      break
    }
  }

  // Handle extension casing
  let finalExt = ext
  if (pattern.extension === 'lowercase') finalExt = ext.toLowerCase()
  if (pattern.extension === 'uppercase') finalExt = ext.toUpperCase()

  return `${newBase}${finalExt}`
}

export function registerRenamerHandlers(): void {
  // Preview renames
  ipcMain.handle(
    'renamer:preview',
    async (_, filePaths: string[], pattern: RenamePattern): Promise<RenamePreviewItem[]> => {
      const dir = path.dirname(filePaths[0])
      const usedNames = new Set<string>()
      const preview: RenamePreviewItem[] = []

      filePaths.forEach((filePath, index) => {
        const newName = buildNewName(filePath, pattern, index)
        const newPath = path.join(dir, newName)
        const conflict = usedNames.has(newName) || (fs.existsSync(newPath) && newPath !== filePath)
        usedNames.add(newName)
        preview.push({
          sourcePath: filePath,
          oldName: path.basename(filePath),
          newName,
          newPath,
          conflict
        })
      })

      return preview
    }
  )

  // Execute renames
  ipcMain.handle(
    'renamer:execute',
    async (
      _,
      items: RenamePreviewItem[]
    ): Promise<{ success: boolean; renamed: number; errors: string[] }> => {
      let renamed = 0
      const errors: string[] = []

      // Do a two-pass rename using temp names to avoid conflicts
      const tempItems: Array<{ tempPath: string; finalPath: string }> = []

      for (const item of items) {
        if (item.conflict) {
          errors.push(`Skipped ${item.oldName}: name conflict`)
          continue
        }
        try {
          const tempPath = item.sourcePath + '.tmp_rename'
          fs.renameSync(item.sourcePath, tempPath)
          tempItems.push({ tempPath, finalPath: item.newPath })
        } catch (err) {
          errors.push(`Failed to rename ${item.oldName}: ${(err as Error).message}`)
        }
      }

      for (const { tempPath, finalPath } of tempItems) {
        try {
          fs.renameSync(tempPath, finalPath)
          renamed++
        } catch (err) {
          errors.push(`Failed to finalize rename: ${(err as Error).message}`)
        }
      }

      return { success: errors.length === 0, renamed, errors }
    }
  )

  // Undo renames (swap newPath -> oldPath)
  ipcMain.handle(
    'renamer:undo',
    async (_, items: RenamePreviewItem[]): Promise<{ success: boolean; errors: string[] }> => {
      const errors: string[] = []
      for (const item of [...items].reverse()) {
        try {
          if (fs.existsSync(item.newPath)) {
            fs.renameSync(item.newPath, item.sourcePath)
          }
        } catch (err) {
          errors.push(`Failed to undo rename: ${(err as Error).message}`)
        }
      }
      return { success: errors.length === 0, errors }
    }
  )

  // List files in a directory
  ipcMain.handle('renamer:listFiles', async (_, dirPath: string) => {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      return entries
        .filter((e) => e.isFile())
        .map((e) => ({
          name: e.name,
          path: path.join(dirPath, e.name),
          ext: path.extname(e.name),
          size: fs.statSync(path.join(dirPath, e.name)).size,
          mtime: fs.statSync(path.join(dirPath, e.name)).mtime.toISOString()
        }))
    } catch {
      return []
    }
  })
}
