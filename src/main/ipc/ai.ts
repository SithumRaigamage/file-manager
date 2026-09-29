import { ipcMain } from 'electron'
import { aiService } from '../features/ai/ai-service'
import fs from 'fs'
import path from 'path'
import { db } from '../db'
import { searchIndex, tags, fileTags } from '../db/schema'
import { and, eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

/** ".PDF" / "pdf" → ".pdf"; rejects anything that isn't a plain extension. */
function normalizeExtension(raw: string | undefined): string | null {
  if (!raw) return null
  const ext = `.${raw.trim().toLowerCase().replace(/^\.+/, '')}`
  return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : null
}

export function registerAIHandlers(): void {
  ipcMain.handle('fileflow:ai:checkStatus', async () => {
    try {
      const result = await aiService.checkAvailability()
      return { ok: true, data: result }
    } catch (error) {
      return { ok: false, error: { code: 'AI_ERROR', message: (error as Error).message } }
    }
  })

  ipcMain.handle(
    'fileflow:ai:suggestCategories',
    async (_event, folderPath: string, categories: string[]) => {
      try {
        const items = fs.readdirSync(folderPath, { withFileTypes: true })
        const files = items.filter((i) => i.isFile() && !i.name.startsWith('.'))

        const suggestions: Array<{ file: string; path: string; suggestedCategory: string }> = []
        // To avoid overwhelming Ollama or getting timeouts, we process sequentially for now
        // In a real production app we'd queue these or use a background worker.
        for (const file of files) {
          const fullPath = path.join(folderPath, file.name)
          const stats = fs.statSync(fullPath)

          const category = await aiService.suggestCategory(
            {
              filename: file.name,
              path: fullPath,
              size: stats.size
            },
            categories
          )

          if (category) {
            suggestions.push({
              file: file.name,
              path: fullPath,
              suggestedCategory: category
            })
          }
        }

        return { ok: true, data: suggestions }
      } catch (error) {
        return { ok: false, error: { code: 'AI_ERROR', message: (error as Error).message } }
      }
    }
  )

  ipcMain.handle('fileflow:ai:executeCommand', async (_event, query: string) => {
    try {
      const intent = await aiService.parseCommandIntent(query)

      if (!intent || intent.action !== 'search_and_tag') {
        return {
          ok: true,
          data: {
            message:
              "Sorry, I couldn't understand that command. I can only search and tag files right now."
          }
        }
      }

      // A model misread must never tag the whole index: require a concrete file type.
      const extension = normalizeExtension(intent.fileExtension)
      if (!extension || !intent.tag) {
        return {
          ok: true,
          data: {
            message: 'Please name a file type and a tag, e.g. "tag all .pdf files as Work".',
            details: intent
          }
        }
      }

      let affectedFiles = 0
      const matchedFiles = db
        .select({ path: searchIndex.path })
        .from(searchIndex)
        .where(and(eq(searchIndex.extension, extension), eq(searchIndex.isDirectory, false)))
        .all()

      if (matchedFiles.length > 0) {
        const tagName = intent.tag
        let tag = db.select().from(tags).where(eq(tags.name, tagName)).get()
        if (!tag) {
          tag = {
            id: randomUUID(),
            name: tagName,
            color: '#6366f1',
            createdAt: new Date().toISOString()
          }
          db.insert(tags).values(tag).run()
        }
        const tagId = tag.id

        // UNIQUE(file_id, tag_id): already-tagged files are skipped, never fail the batch
        db.transaction(() => {
          const createdAt = new Date().toISOString()
          for (const file of matchedFiles) {
            const result = db
              .insert(fileTags)
              .values({ id: randomUUID(), fileId: file.path, tagId, createdAt })
              .onConflictDoNothing()
              .run()
            affectedFiles += result.changes
          }
        })
      }

      return {
        ok: true,
        data: {
          message: `✅ Tagged ${affectedFiles} file(s) with '${intent.tag}'.`,
          details: intent
        }
      }
    } catch (error) {
      return { ok: false, error: { code: 'AI_ERROR', message: (error as Error).message } }
    }
  })
}
