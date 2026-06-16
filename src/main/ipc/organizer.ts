import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export interface ExtensionRule {
  extensions: string[]
  folderName: string
  enabled: boolean
}

export interface OrganizerJob {
  sourceDir: string
  rules: ExtensionRule[]
  createSubfolders: boolean
  mode: 'move' | 'copy'
}

export interface OrganizerPreviewItem {
  sourcePath: string
  destinationPath: string
  fileName: string
  extension: string
  category: string
  size: number
}

export interface OrganizerResult {
  success: boolean
  processed: number
  skipped: number
  errors: string[]
}

function scanDirectory(dir: string): string[] {
  const files: string[] = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile()) {
        files.push(path.join(dir, entry.name))
      }
    }
  } catch (err) {
    console.error('Error scanning directory:', err)
  }
  return files
}

function findMatchingRule(ext: string, rules: ExtensionRule[]): ExtensionRule | null {
  const normalizedExt = ext.toLowerCase().replace(/^\./, '')
  return (
    rules.find(
      (r) =>
        r.enabled && r.extensions.some((e) => e.toLowerCase().replace(/^\./, '') === normalizedExt)
    ) || null
  )
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function getUniqueDestination(destPath: string): string {
  if (!fs.existsSync(destPath)) return destPath
  const ext = path.extname(destPath)
  const base = destPath.slice(0, -ext.length)
  let counter = 1
  while (fs.existsSync(`${base} (${counter})${ext}`)) counter++
  return `${base} (${counter})${ext}`
}

export function registerOrganizerHandlers(): void {
  // Preview what would happen
  ipcMain.handle(
    'organizer:preview',
    async (_, job: OrganizerJob): Promise<OrganizerPreviewItem[]> => {
      const files = scanDirectory(job.sourceDir)
      const preview: OrganizerPreviewItem[] = []

      for (const filePath of files) {
        const ext = path.extname(filePath)
        const rule = findMatchingRule(ext, job.rules)
        if (!rule) continue

        const fileName = path.basename(filePath)
        const destDir = path.join(job.sourceDir, rule.folderName)
        const destPath = path.join(destDir, fileName)
        const stats = fs.statSync(filePath)

        preview.push({
          sourcePath: filePath,
          destinationPath: destPath,
          fileName,
          extension: ext,
          category: rule.folderName,
          size: stats.size
        })
      }

      return preview
    }
  )

  // Execute the organization
  ipcMain.handle(
    'organizer:execute',
    async (event, job: OrganizerJob): Promise<OrganizerResult> => {
      const files = scanDirectory(job.sourceDir)
      let processed = 0
      let skipped = 0
      const errors: string[] = []

      for (const filePath of files) {
        const ext = path.extname(filePath)
        const rule = findMatchingRule(ext, job.rules)

        if (!rule) {
          skipped++
          continue
        }

        const fileName = path.basename(filePath)
        const destDir = path.join(job.sourceDir, rule.folderName)

        try {
          ensureDir(destDir)
          const destPath = getUniqueDestination(path.join(destDir, fileName))

          if (job.mode === 'move') {
            fs.renameSync(filePath, destPath)
          } else {
            fs.copyFileSync(filePath, destPath)
          }

          processed++
          event.sender.send('organizer:progress', { processed, total: files.length, fileName })
        } catch (err) {
          errors.push(`Failed to process ${fileName}: ${(err as Error).message}`)
        }
      }

      return { success: errors.length === 0, processed, skipped, errors }
    }
  )

  // Get file stats for a directory
  ipcMain.handle('organizer:scan', async (_, dirPath: string) => {
    const files = scanDirectory(dirPath)
    const stats: Record<string, number> = {}

    for (const filePath of files) {
      const ext = path.extname(filePath).toLowerCase() || 'no extension'
      stats[ext] = (stats[ext] || 0) + 1
    }

    return { totalFiles: files.length, byExtension: stats }
  })
}
