import { ipcMain } from 'electron'
import {
  DuplicateScanner,
  DuplicateScanProgress,
  DuplicateFile
} from '../features/duplicates/duplicate-scanner'
import { planDuplicateResolution } from '../domain/duplicates/resolution'
import { moveToTrash, TrashResult } from '../features/shared/trash'
import { confirmDestructive, summarizePaths } from '../features/shared/confirm-dialog'
import type { IpcResponse } from './ipc-response'
import { db } from '../db'
import { duplicateGroups } from '../db/schema'
import { eq } from 'drizzle-orm'
import * as fs from 'fs'

let currentScanner: DuplicateScanner | null = null

export function registerDuplicatesHandlers(): void {
  ipcMain.handle('fileflow:duplicates:scan', async (event, dirPath: string) => {
    if (currentScanner) {
      currentScanner.cancel()
    }

    const scanner = new DuplicateScanner()
    currentScanner = scanner

    try {
      await scanner.scan(dirPath, (progress: DuplicateScanProgress) => {
        // A superseded scan must not interleave its progress with the new one
        if (currentScanner !== scanner) return
        event.sender.send('fileflow:duplicates:progress', progress)
      })
      return { ok: true }
    } catch (error) {
      console.error('Scan failed:', error)
      return { ok: false, error: { code: 'SCAN_FAILED', message: (error as Error).message } }
    } finally {
      if (currentScanner === scanner) currentScanner = null
    }
  })

  ipcMain.handle('fileflow:duplicates:cancel', async () => {
    if (currentScanner) {
      currentScanner.cancel()
      currentScanner = null
      return { ok: true }
    }
    return { ok: false, error: { code: 'NO_SCAN', message: 'No scan in progress' } }
  })

  ipcMain.handle('fileflow:duplicates:getGroups', async () => {
    try {
      const groups = db
        .select()
        .from(duplicateGroups)
        .where(eq(duplicateGroups.status, 'pending'))
        .all()
      return { ok: true, data: groups }
    } catch (error) {
      return { ok: false, error: { code: 'GET_GROUPS_FAILED', message: (error as Error).message } }
    }
  })

  ipcMain.handle('fileflow:duplicates:clear', async () => {
    try {
      db.delete(duplicateGroups).run()
      return { ok: true }
    } catch (error) {
      return { ok: false, error: { code: 'CLEAR_FAILED', message: (error as Error).message } }
    }
  })

  // Keep one copy, move the others to the Trash. The group is re-read from the
  // database and the request validated against it, so the renderer can only
  // choose among that group's files — never name arbitrary paths.
  ipcMain.handle(
    'fileflow:duplicates:resolve',
    async (
      event,
      groupId: string,
      keepPath: string,
      deletePaths: string[]
    ): Promise<IpcResponse<TrashResult>> => {
      try {
        const group = db.select().from(duplicateGroups).where(eq(duplicateGroups.id, groupId)).get()
        if (!group) {
          return {
            ok: false,
            error: { code: 'GROUP_NOT_FOUND', message: 'This duplicate group no longer exists' }
          }
        }

        const groupFiles = (group.files as DuplicateFile[]).map((f) => f.path)
        const plan = planDuplicateResolution(
          groupFiles,
          keepPath,
          Array.isArray(deletePaths) ? deletePaths : [],
          fs.existsSync(keepPath)
        )
        if (!plan.ok) {
          return { ok: false, error: { code: 'INVALID_RESOLUTION', message: plan.reason } }
        }

        const confirmed = await confirmDestructive(event.sender, {
          title: 'Remove Duplicates',
          message: `Move ${plan.toTrash.length} duplicate${plan.toTrash.length === 1 ? '' : 's'} to the Trash?`,
          detail: `Keeping:\n${keepPath}\n\nMoving to Trash:\n${summarizePaths(plan.toTrash)}\n\nYou can restore them from the Trash.`,
          confirmLabel: 'Move to Trash'
        })
        if (!confirmed) return { ok: true, data: { trashed: [], failed: [] } }

        const result = await moveToTrash(plan.toTrash.filter((p) => fs.existsSync(p)))
        if (result.failed.length === 0) {
          db.update(duplicateGroups)
            .set({ status: 'resolved' })
            .where(eq(duplicateGroups.id, groupId))
            .run()
        }
        return { ok: true, data: result }
      } catch (error) {
        return { ok: false, error: { code: 'RESOLVE_FAILED', message: (error as Error).message } }
      }
    }
  )
}
