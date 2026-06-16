import { app, shell, BrowserWindow, ipcMain, dialog, protocol } from 'electron'
import { join, normalize, extname } from 'path'
import * as fs from 'fs'
import { Readable } from 'stream'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerOrganizerHandlers } from './ipc/organizer'
import { registerRenamerHandlers } from './ipc/renamer'
import { registerConverterHandlers } from './ipc/converter'
import { registerSearcherHandlers } from './ipc/searcher'
import { registerMp4AnalyzerHandlers } from './ipc/mp4analyzer'

// Register custom media protocol privileges before app ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      bypassCSP: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true
    }
  }
])

function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  const mimeTypes: { [key: string]: string } = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/x-msvideo',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4'
  }
  return mimeTypes[ext] || 'video/mp4'
}

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
  protocol.handle('media', async (request) => {
    try {
      console.log('Media protocol requested URL:', request.url)
      const url = new URL(request.url)
      
      let filePath = ''
      if (url.host) {
        filePath = url.host + url.pathname
        if (process.platform !== 'win32' && !filePath.startsWith('/')) {
          filePath = '/' + filePath
        }
      } else {
        filePath = url.pathname
      }
      
      filePath = decodeURIComponent(filePath)
      if (process.platform === 'win32' && filePath.startsWith('/')) {
        filePath = filePath.slice(1)
      }
      
      // Map case-lowercased 'users' host segment back to 'Users' on macOS/Linux systems to prevent case issues
      if (process.platform !== 'win32' && filePath.startsWith('/users/')) {
        filePath = '/Users/' + filePath.slice(7)
      }
      
      filePath = normalize(filePath)
      console.log('Resolved filesystem path:', filePath)

      if (!fs.existsSync(filePath)) {
        console.warn('Media file not found:', filePath)
        return new Response('File not found', { status: 404 })
      }

      const stats = fs.statSync(filePath)
      const fileSize = stats.size
      const range = request.headers.get('range')
      const mimeType = getMimeType(filePath)

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

        const chunksize = end - start + 1
        const fileStream = fs.createReadStream(filePath, { start, end })

        const responseHeaders = new Headers({
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': mimeType
        })

        return new Response(Readable.toWeb(fileStream) as any, {
          status: 206,
          statusText: 'Partial Content',
          headers: responseHeaders
        })
      } else {
        const fileStream = fs.createReadStream(filePath)
        const responseHeaders = new Headers({
          'Content-Length': fileSize.toString(),
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes'
        })
        return new Response(Readable.toWeb(fileStream) as any, {
          status: 200,
          headers: responseHeaders
        })
      }
    } catch (err) {
      console.error('Failed to parse media protocol URL:', err)
      return new Response('Invalid media URL', { status: 400 })
    }
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

  ipcMain.on('shell:showItemInFolder', (_, path: string) => {
    shell.showItemInFolder(path)
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
