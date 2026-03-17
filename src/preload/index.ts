import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getResearch: (date: string) => ipcRenderer.invoke('get-research', date),
  getTodayResearch: () => ipcRenderer.invoke('get-today-research'),
  getResearchDates: () => ipcRenderer.invoke('get-research-dates'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  runResearchNow: () => ipcRenderer.invoke('run-research-now'),
  deleteResearch: (date: string, index: number) => ipcRenderer.invoke('delete-research', date, index),
  getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
  saveBookmark: (item: any) => ipcRenderer.invoke('save-bookmark', item),
  removeBookmark: (id: string) => ipcRenderer.invoke('remove-bookmark', id),
  resizeWindow: (height: number) => ipcRenderer.invoke('resize-window', height),
  snapWindow: (direction: string) => ipcRenderer.invoke('snap-window', direction),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  shareText: (text: string) => ipcRenderer.invoke('share-text', text),
  saveMarkdown: (defaultName: string, content: string) => ipcRenderer.invoke('save-markdown', defaultName, content),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  runDiscussion: (research: any) => ipcRenderer.invoke('run-discussion', research),
  onResearchComplete: (callback: (result: any) => void) => {
    const handler = (_event: any, result: any) => callback(result)
    ipcRenderer.on('research-complete', handler)
    return () => ipcRenderer.removeListener('research-complete', handler)
  }
})
