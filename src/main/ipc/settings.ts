import { ipcMain } from 'electron'
import { db } from '../db'
import { appSettings } from '../db/schema'
import { eq } from 'drizzle-orm'
import { validateSettingsUpdate } from '../domain/settings/settings-update'
import type { IpcResponse } from './ipc-response'

export function registerSettingsIpc(): void {
  ipcMain.handle(
    'fileflow:settings:get',
    async (): Promise<IpcResponse<Partial<typeof appSettings.$inferSelect>>> => {
      try {
        const row = db.select().from(appSettings).where(eq(appSettings.id, 'default')).get()
        return { ok: true, data: row ?? {} }
      } catch (err) {
        return {
          ok: false,
          error: { code: 'SETTINGS_GET_FAILED', message: (err as Error).message }
        }
      }
    }
  )

  // Only allow-listed keys with valid values are written; `id` is never writable.
  ipcMain.handle(
    'fileflow:settings:update',
    async (_, input: unknown): Promise<IpcResponse<void>> => {
      const result = validateSettingsUpdate(input)
      if (!result.ok) {
        return { ok: false, error: { code: 'INVALID_SETTINGS', message: result.reason } }
      }
      try {
        db.update(appSettings).set(result.updates).where(eq(appSettings.id, 'default')).run()
        return { ok: true, data: undefined }
      } catch (err) {
        return {
          ok: false,
          error: { code: 'SETTINGS_UPDATE_FAILED', message: (err as Error).message }
        }
      }
    }
  )
}
