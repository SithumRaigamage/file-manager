import { dialog, ipcMain, shell } from 'electron'
import * as fs from 'fs'
import { openBlockReason } from '../domain/shared/open-policy'
import type { IpcResponse } from './ipc-response'

function isExecutableFile(filePath: string, stats: fs.Stats): boolean {
  if (!stats.isFile() || process.platform === 'win32') return false
  try {
    fs.accessSync(filePath, fs.constants.X_OK)
    return true
  } catch {
    return false
  }
}

/** Native file pickers and "open / reveal" actions. */
export function registerShellHandlers(): void {
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('dialog:openFiles', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] })
    return result.canceled ? [] : result.filePaths
  })

  // Opens a file or folder with its default app. Apps, installers, scripts and
  // executables are refused: "opening" them runs code.
  ipcMain.handle('shell:openPath', async (_, target: unknown): Promise<IpcResponse<void>> => {
    if (typeof target !== 'string' || target.length === 0) {
      return { ok: false, error: { code: 'INVALID_PATH', message: 'Invalid path' } }
    }
    let stats: fs.Stats
    try {
      stats = fs.statSync(target)
    } catch {
      return { ok: false, error: { code: 'FILE_NOT_FOUND', message: 'File not found' } }
    }

    const blocked = openBlockReason({
      path: target,
      isDirectory: stats.isDirectory(),
      isExecutable: isExecutableFile(target, stats)
    })
    if (blocked) return { ok: false, error: { code: 'OPEN_BLOCKED', message: blocked } }

    const failure = await shell.openPath(target)
    return failure
      ? { ok: false, error: { code: 'OPEN_FAILED', message: failure } }
      : { ok: true, data: undefined }
  })

  // Revealing in Finder/Explorer never executes anything, so any existing path is fine.
  ipcMain.on('shell:showItemInFolder', (_, target: unknown) => {
    if (typeof target === 'string' && fs.existsSync(target)) shell.showItemInFolder(target)
  })
}
