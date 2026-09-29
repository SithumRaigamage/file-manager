import { ipcMain } from 'electron'
import type {
  RenamePatternDomain,
  RenamePreviewItem
} from '../domain/renamer/rename-evaluator'

export function registerRenamerHandlers(): void {
  ipcMain.handle('renamer:previewRename', async (_, paths: string[], pattern: RenamePatternDomain) => {
    try {
      const { RenameEvaluator } = await import('../domain/renamer/rename-evaluator')
      const preview = RenameEvaluator.evaluateBatch(paths, pattern)
      return { ok: true, data: preview }
    } catch (err) {
      return { ok: false, error: { code: 'PREVIEW_ERROR', message: (err as Error).message } }
    }
  })

  ipcMain.handle('renamer:applyRename', async (_, items: RenamePreviewItem[]) => {
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
      const summary = await HistoryService.revertBatch(batchId)
      return { ok: true, data: summary }
    } catch (err) {
      return { ok: false, error: { code: 'UNDO_ERROR', message: (err as Error).message } }
    }
  })
}
