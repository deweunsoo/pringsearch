process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
import { app, BrowserWindow, ipcMain, Notification, screen, clipboard, net, shell, dialog } from 'electron'
import fs from 'fs'
import { execFile } from 'child_process'
import path from 'path'
import os from 'os'
import { StorageService } from './services/storage'
import { ResearchOrchestrator } from './services/orchestrator'
import { MultiCategoryOrchestrator } from './services/multi-category-orchestrator'
import { TopIssuePicker } from './services/top-issue-picker'
import { ClaudeAnalyzer, detectAiProvider } from './services/analyzer'
import { Scheduler } from './scheduler'
import { TrayManager } from './tray'
import type { ResearchResult } from '../shared/types'

// Prevent macOS Media Library TCC prompt ("access Apple Music / media library").
// Chromium's SystemMediaControls loads MediaRemote.framework even when the app has
// no media content, which triggers the permission dialog. Safe to disable here —
// Pringsearch has no audio/video playback.
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling,MediaSessionService,GlobalMediaControls')

app.name = app.isPackaged ? 'Pringsearch' : 'Pringsearch DEV'

const DATA_PATH = path.join(os.homedir(), 'ai-research-widget')
const storage = new StorageService(DATA_PATH)
const scheduler = new Scheduler()
const trayManager = new TrayManager()

let mainWindow: BrowserWindow | null = null
let researchRunning = false

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 520,
    frame: false,
    transparent: true,
    hasShadow: true,
    backgroundColor: '#00000000',
    alwaysOnTop: false,
    resizable: true,
    minWidth: 360,
    minHeight: 200,
    maxWidth: 600,
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
  mainWindow.setPosition(width - 480, height - 420)

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

async function runResearch(): Promise<void> {
  if (researchRunning) return
  researchRunning = true
  const config = storage.loadConfig()

  try {
    const fs = require('fs')
    fs.appendFileSync('/tmp/pringsearch.log', `[${new Date().toISOString()}] Starting research for ${config.categories.length} categories...\n`)
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const existingResults = storage.loadResearch(today) || []

    const existingByCategory: Record<string, ResearchResult[]> = {}
    for (const r of existingResults) {
      (existingByCategory[r.category] ||= []).push(r)
    }

    const orchestrator = new ResearchOrchestrator(config.anthropicApiKey)
    const picker = new TopIssuePicker(orchestrator.analyzer)
    const multi = new MultiCategoryOrchestrator(orchestrator, picker)

    const { results, topIssue } = await multi.run(config, existingByCategory)
    fs.appendFileSync('/tmp/pringsearch.log', `[${new Date().toISOString()}] Completed ${results.length} categories, topIssue=${topIssue.categoryName}\n`)

    for (const r of results) {
      const hasContent = r.trends.length > 0 || r.insights.length > 0
      if (hasContent) storage.saveResearch(r)
    }

    mainWindow?.webContents.send('research-complete', { results, topIssue })

    if (config.notificationEnabled && results.length > 0) {
      const n = new Notification({
        title: '오늘의 리서치 준비 완료',
        body: `[${topIssue.categoryName}] ${topIssue.headline}`,
      })
      n.show()
    }
  } catch (error: any) {
    const fs = require('fs')
    fs.appendFileSync('/tmp/pringsearch.log', `[${new Date().toISOString()}] FAILED: ${error?.message || error}\n`)
    console.error('[Research] Failed:', error?.message || error)
    mainWindow?.webContents.send('research-complete', null)
  } finally {
    researchRunning = false
  }
}

function setupIPC(): void {
  ipcMain.handle('get-research', (_e, date: string) => storage.loadResearch(date))
  ipcMain.handle('get-today-research', () => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    return storage.loadResearch(today)
  })
  ipcMain.handle('get-research-dates', () => storage.listResearchDates())
  ipcMain.handle('get-config', () => storage.loadConfig())
  ipcMain.handle('detect-ai', () => {
    const config = storage.loadConfig()
    return detectAiProvider(config.anthropicApiKey || undefined)
  })
  ipcMain.handle('save-config', (_e, config) => {
    storage.saveConfig(config)
    if (app.isPackaged) {
      app.setLoginItemSettings({ openAtLogin: config.openAtLogin, openAsHidden: true })
    }
    scheduler.reschedule(config.scheduleHour, config.scheduleMinute, runResearch, config.openAtLogin)
  })
  ipcMain.handle('run-research-now', () => runResearch())
  ipcMain.handle('delete-research', (_e, date: string, index: number) => storage.deleteResearchAt(date, index))
  ipcMain.handle('get-bookmarks', () => storage.loadBookmarks())
  ipcMain.handle('save-bookmark', (_e, item) => storage.saveBookmark(item))
  ipcMain.handle('remove-bookmark', (_e, id: string) => storage.removeBookmark(id))
  ipcMain.handle('resize-window', (_e, height: number) => {
    if (!mainWindow) return
    const display = screen.getPrimaryDisplay()
    const maxH = display.workAreaSize.height - 40
    const [w, oldH] = mainWindow.getSize()
    const newH = Math.min(Math.max(height, 200), maxH)
    if (newH === oldH) return
    const [x, y] = mainWindow.getPosition()
    const newY = y - (newH - oldH)
    mainWindow.setBounds({ x, y: Math.max(newY, 20), width: w, height: newH }, true)
  })
  ipcMain.handle('snap-window', (_e, direction: string) => {
    if (!mainWindow) return
    const { bounds, workArea } = screen.getPrimaryDisplay()
    const [w, h] = mainWindow.getSize()
    switch (direction) {
      case 'left':
        mainWindow.setPosition(bounds.x, workArea.y)
        break
      case 'right':
        mainWindow.setPosition(bounds.x + bounds.width - w, workArea.y)
        break
      case 'up':
        mainWindow.setPosition(bounds.x + bounds.width - w, workArea.y)
        mainWindow.setSize(w, workArea.height)
        break
      case 'down':
        mainWindow.setPosition(bounds.x + bounds.width - w, workArea.y + workArea.height - 400)
        mainWindow.setSize(w, 400)
        break
    }
  })
  ipcMain.handle('share-text', async (_e, text: string) => {
    try {
      const res = await net.fetch('https://dpaste.org/api/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `content=${encodeURIComponent(text)}&syntax=markdown&expiry_days=7`
      })
      return (await res.text()).trim()
    } catch {
      return null
    }
  })
  ipcMain.handle('save-markdown', async (_e, defaultName: string, content: string) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: path.join(DATA_PATH, defaultName),
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (result.canceled || !result.filePath) return null
    fs.writeFileSync(result.filePath, content, 'utf-8')
    return result.filePath
  })
  ipcMain.handle('pick-folder', async () => {
    const result = await dialog.showOpenDialog({
      defaultPath: DATA_PATH,
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })
  ipcMain.handle('run-discussion', async (_e, research) => {
    const config = storage.loadConfig()
    const analyzer = new ClaudeAnalyzer(config.anthropicApiKey)
    return analyzer.generateDiscussion(research)
  })
  ipcMain.handle('window-close', () => mainWindow?.hide())
  ipcMain.handle('window-minimize', () => mainWindow?.minimize())
  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.handle('check-update', () => fetchLatestUpdate())
  ipcMain.handle('open-update-dialog', async (_e, info: { version: string; url: string }) => {
    const { response } = await dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: '업데이트 알림',
      message: `새 버전(v${info.version})이 있어요!`,
      detail: '다운로드 페이지에서 최신 버전을 받을 수 있어요.',
      buttons: ['업데이트', '나중에'],
      defaultId: 0,
    })
    if (response !== 0) return
    try {
      await shell.openExternal(info.url)
    } catch {
      clipboard.writeText(info.url)
      dialog.showMessageBox(mainWindow!, {
        type: 'info',
        title: '링크 복사됨',
        message: '브라우저를 열 수 없어서 링크를 클립보드에 복사했어요.',
        detail: info.url,
      })
    }
  })
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock && !app.isPackaged) {
    app.dock.setIcon(path.join(__dirname, '../../build/icon.png'))
  }

  createWindow()
  setupIPC()

  const config = storage.loadConfig()
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: config.openAtLogin, openAsHidden: true })
  }
  scheduler.start(config.scheduleHour, config.scheduleMinute, runResearch, config.openAtLogin)
  trayManager.create(mainWindow!, runResearch)

})

function isNewerVersion(latest: string, current: string): boolean {
  const pa = latest.split('.').map(Number)
  const pb = current.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0, nb = pb[i] || 0
    if (na > nb) return true
    if (na < nb) return false
  }
  return false
}

async function fetchLatestUpdate(): Promise<{ version: string; url: string } | null> {
  try {
    const res = await net.fetch('https://api.github.com/repos/deweunsoo/pringsearch/releases/latest')
    if (!res.ok) return null
    const data: any = await res.json()
    const latest = String(data.tag_name || '').replace(/^v/, '')
    if (!latest || !isNewerVersion(latest, app.getVersion())) return null
    return {
      version: latest,
      url: data.html_url || 'https://github.com/deweunsoo/pringsearch/releases/latest',
    }
  } catch (err: any) {
    fs.appendFileSync('/tmp/pringsearch.log', `[${new Date().toISOString()}] Update check error: ${err?.message || err}\n`)
    return null
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  mainWindow?.show()
})
