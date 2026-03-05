process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
import { app, BrowserWindow, ipcMain, Notification, screen } from 'electron'
import path from 'path'
import os from 'os'
import { StorageService } from './services/storage'
import { ResearchOrchestrator } from './services/orchestrator'
import { Scheduler } from './scheduler'
import { TrayManager } from './tray'

const DATA_PATH = path.join(os.homedir(), 'ai-research-widget')
const storage = new StorageService(DATA_PATH)
const scheduler = new Scheduler()
const trayManager = new TrayManager()

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 460,
    height: 640,
    frame: false,
    transparent: true,
    hasShadow: true,
    vibrancy: 'fullscreen-ui',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: true,
    minWidth: 360,
    minHeight: 480,
    maxWidth: 600,
    maxHeight: 900,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize
  mainWindow.setPosition(width - 480, height - 660)

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

async function runResearch(): Promise<void> {
  const config = storage.loadConfig()

  try {
    const fs = require('fs')
    fs.appendFileSync('/tmp/pringsearch.log', `[${new Date().toISOString()}] Starting research...\n`)
    const orchestrator = new ResearchOrchestrator()
    const result = await orchestrator.run(config)
    fs.appendFileSync('/tmp/pringsearch.log', `[${new Date().toISOString()}] Result: ${JSON.stringify(result).slice(0, 300)}\n`)
    const hasContent = result.trends.length > 0 || result.insights.length > 0

    if (hasContent) {
      storage.saveResearch(result)
    }

    mainWindow?.webContents.send('research-complete', hasContent ? result : null)

    if (config.notificationEnabled) {
      new Notification({
        title: '오늘의 AI 리서치 도착',
        body: result.trends[0]?.text || '새로운 리서치가 준비되었습니다.'
      }).show()
    }
  } catch (error: any) {
    const fs = require('fs')
    fs.appendFileSync('/tmp/pringsearch.log', `[${new Date().toISOString()}] FAILED: ${error?.message || error}\n`)
    console.error('[Research] Failed:', error?.message || error)
    mainWindow?.webContents.send('research-complete', null)
  }
}

function setupIPC(): void {
  ipcMain.handle('get-research', (_e, date: string) => storage.loadResearch(date))
  ipcMain.handle('get-today-research', () => {
    const today = new Date().toISOString().split('T')[0]
    return storage.loadResearch(today)
  })
  ipcMain.handle('get-research-dates', () => storage.listResearchDates())
  ipcMain.handle('get-config', () => storage.loadConfig())
  ipcMain.handle('save-config', (_e, config) => {
    storage.saveConfig(config)
    scheduler.reschedule(config.scheduleHour, config.scheduleMinute, runResearch)
  })
  ipcMain.handle('run-research-now', () => runResearch())
  ipcMain.handle('window-close', () => mainWindow?.hide())
  ipcMain.handle('window-minimize', () => mainWindow?.minimize())
  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
}

app.whenReady().then(() => {
  createWindow()
  setupIPC()

  const config = storage.loadConfig()
  scheduler.start(config.scheduleHour, config.scheduleMinute, runResearch)
  trayManager.create(mainWindow!, runResearch)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  mainWindow?.show()
})
