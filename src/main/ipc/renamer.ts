import { ipcMain } from 'electron'

export function registerRenamerHandlers(): void {
  ipcMain.handle('renamer:previewRename', async (_, paths: string[], pattern: any) => {
    try {
      const { RenameEvaluator } = await import('../domain/renamer/rename-evaluator')
      const preview = RenameEvaluator.evaluateBatch(paths, pattern)
      return { ok: true, data: preview }
    } catch (err) {
      return { ok: false, error: { code: 'PREVIEW_ERROR', message: (err as Error).message } }
    }
  })

  ipcMain.handle('renamer:applyRename', async (_, items: any[]) => {
    try {
      const { RenameExecutor } = await import('../domain/renamer/rename-executor')
      const result = RenameExecutor.executeBatch(items)
      return { ok: true, data: result }
    } catch (err) {
      return { ok: false, error: { code: 'APPLY_ERROR', message: (err as Error).message } }
    }
  })

  ipcMain.handle('renamer:undoRename', async (_, batchId: string) => {
    try {
      const { HistoryService } = await import('../domain/history/history-service')
      HistoryService.revertBatch(batchId)
      return { ok: true, data: undefined }
    } catch (err) {
      return { ok: false, error: { code: 'UNDO_ERROR', message: (err as Error).message } }
    }
  })
}
