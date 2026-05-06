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

function isSafeHttpUrl(raw: string): boolean {
  try {
    const { protocol } = new URL(raw)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

function logLine(msg: string): void {
  try {
    const dir = app.getPath('logs')
    fs.mkdirSync(dir, { recursive: true })
    fs.appendFileSync(path.join(dir, 'pringsearch.log'), `[${new Date().toISOString()}] ${msg}\n`)
  } catch {}
}

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
    if (isSafeHttpUrl(url)) shell.openExternal(url)
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
    logLine(`Starting research for ${config.categories.length} categories...`)
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
    logLine(`Completed ${results.length} categories, topIssue=${topIssue.categoryName}`)

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
    logLine(`FAILED: ${error?.message || error}`)
    console.error('[Research] Failed:', error?.message || error)
    mainWindow?.webContents.send('research-complete', null)
    throw error
  } finally {
    researchRunning = false
  }
}

function notifyFailureExhausted(): void {
  const config = storage.loadConfig()
  if (!config.notificationEnabled) return
  new Notification({
    title: '리서치 실패',
    body: '오늘 자동 리서치가 여러 번 실패했어요. 설정의 AI 키/네트워크를 확인해 주세요.',
  }).show()
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
  ipcMain.handle('run-research-now', () => runResearch().catch(() => {}))
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
    const { response, checkboxChecked } = await dialog.showMessageBox(mainWindow!, {
      type: 'warning',
      title: '외부 서비스에 공유',
      message: '리서치 내용을 dpaste.org에 업로드합니다',
      detail: '• 링크를 아는 누구나 7일간 열람 가능합니다\n• 사내/민감 정보가 포함되어 있지 않은지 확인하세요\n• 한 번 업로드한 내용은 회수할 수 없습니다',
      buttons: ['공유', '취소'],
      defaultId: 1,
      cancelId: 1,
      checkboxLabel: '내용을 검토했고 외부 공개에 동의합니다',
      checkboxChecked: false,
    })
    if (response !== 0 || !checkboxChecked) return null
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
    if (!isSafeHttpUrl(info.url)) return
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
  scheduler.onFailureExhausted = notifyFailureExhausted
  scheduler.start(config.scheduleHour, config.scheduleMinute, runResearch, config.openAtLogin)
  trayManager.create(mainWindow!, () => { runResearch().catch(() => {}) })

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
    logLine(`Update check error: ${err?.message || err}`)
    return null
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  mainWindow?.show()
})
