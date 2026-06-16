import { app, shell, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerOrganizerHandlers } from './ipc/organizer'
import { registerRenamerHandlers } from './ipc/renamer'
import { registerConverterHandlers } from './ipc/converter'
import { registerSearcherHandlers } from './ipc/searcher'
import { registerMp4AnalyzerHandlers } from './ipc/mp4analyzer'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.filemanager.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register custom media protocol to play local video/audio files
  protocol.handle('media', (request) => {
    const filePath = decodeURIComponent(request.url.replace('media://', ''))
    return net.fetch(pathToFileURL(filePath).toString())
  })

  // Register all IPC handlers
  registerOrganizerHandlers()
  registerRenamerHandlers()
  registerConverterHandlers()
  registerSearcherHandlers()
  registerMp4AnalyzerHandlers()

  // Dialog handlers
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('dialog:openFiles', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('shell:openPath', async (_, path: string) => {
    await shell.openPath(path)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
