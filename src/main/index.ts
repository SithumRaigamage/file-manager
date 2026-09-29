import { app, shell, BrowserWindow, crashReporter } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { registerOrganizerHandlers } from './ipc/organizer'
import { registerRenamerHandlers } from './ipc/renamer'
import { registerConverterHandlers } from './ipc/converter'
import { registerSearcherHandlers } from './ipc/searcher'
import { registerMp4AnalyzerHandlers } from './ipc/mp4analyzer'
import { registerHistoryHandlers } from './ipc/history'
import { registerSettingsIpc } from './ipc/settings'
import { registerDuplicatesHandlers } from './ipc/duplicates'
import { registerDashboardHandlers } from './ipc/dashboard'
import { registerIndexerHandlers } from './ipc/indexer'
import { registerAnalyticsHandlers } from './ipc/analytics'
import { registerAutomationHandlers } from './ipc/automation'
import { registerTagsHandlers } from './ipc/tags'
import { registerAIHandlers } from './ipc/ai'
import { registerShellHandlers } from './ipc/shell'
import { registerMediaScheme, registerMediaProtocol } from './features/media/media-protocol'
import { isSafeExternalUrl } from './domain/shared/open-policy'
import { schedulerService } from './features/automation/scheduler-service'
import { db } from './db'
import { appSettings } from './db/schema'
import { eq } from 'drizzle-orm'

// Custom scheme privileges must be registered before the app is ready
registerMediaScheme()

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
    transparent: true,
    backgroundColor: '#00000000',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundMaterial: 'mica',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Never open new app windows; only web links go to the system browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  // The renderer must never navigate away from the bundled app.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const devUrl = app.isPackaged ? undefined : process.env['ELECTRON_RENDERER_URL']
    const isAppPage = devUrl ? url.startsWith(devUrl) : url.startsWith('file://')
    if (!isAppPage) event.preventDefault()
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

import { initializeScheduler, stopScheduler } from './scheduler'

app.whenReady().then(async () => {
  // Dynamically import @electron-toolkit/utils after app is ready
  // because it accesses `electron.app.isPackaged` at module load time
  const { electronApp, optimizer } = await import('@electron-toolkit/utils')

  // Initialize crash reporter after app is ready, only if user has opted in
  // We do this here (not at module load) so the DB schema is fully initialized
  try {
    const settingsRows = db.select().from(appSettings).where(eq(appSettings.id, 'default')).all()
    if (settingsRows.length > 0 && settingsRows[0].crashReportingOptIn) {
      // Reports are only uploaded to an explicitly configured HTTPS endpoint;
      // otherwise dumps stay on this machine.
      const submitURL = process.env['FILEFLOW_CRASH_REPORT_URL']
      const canUpload = !!submitURL && submitURL.startsWith('https://')
      crashReporter.start({
        submitURL: canUpload ? submitURL : '',
        uploadToServer: canUpload,
        ignoreSystemCrashHandler: false
      })
    }
  } catch (error) {
    console.warn('Failed to initialize crash reporter from settings', error)
  }

  initializeScheduler()
  electronApp.setAppUserModelId('com.filemanager.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Local audio/video playback for the in-app players
  registerMediaProtocol()

  // Register all IPC handlers
  registerOrganizerHandlers()
  registerRenamerHandlers()
  registerConverterHandlers()
  registerSearcherHandlers()
  registerMp4AnalyzerHandlers()
  registerHistoryHandlers()
  registerSettingsIpc()
  registerDuplicatesHandlers()
  registerDashboardHandlers()
  registerIndexerHandlers()
  registerAnalyticsHandlers()
  registerAutomationHandlers()
  registerTagsHandlers()
  registerAIHandlers()
  registerShellHandlers()

  // Start scheduler
  schedulerService.start()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopScheduler()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
