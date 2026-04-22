import fs from 'fs'
import path from 'path'
import type { AppConfig, Category, ResearchResult, BookmarkItem } from '../../shared/types'
import { DEFAULT_CONFIG } from '../../shared/types'

export function migrateConfig(raw: any): AppConfig {
  if (Array.isArray(raw?.categories)) {
    const { keywords: _drop, ...rest } = raw
    return { ...DEFAULT_CONFIG, ...rest } as AppConfig
  }
  const legacyKeywords: string[] = Array.isArray(raw?.keywords) ? raw.keywords : []
  const categories: Category[] = legacyKeywords.map(k => ({ name: k, keywords: [k] }))
  const { keywords: _drop, ...rest } = raw || {}
  return { ...DEFAULT_CONFIG, ...rest, categories } as AppConfig
}

export class StorageService {
  private basePath: string

  constructor(basePath: string) {
    this.basePath = basePath
    fs.mkdirSync(path.join(this.basePath, 'data'), { recursive: true })
  }

  private get configPath(): string {
    return path.join(this.basePath, 'config.json')
  }

  private researchPath(date: string): string {
    return path.join(this.basePath, 'data', `research-${date}.json`)
  }

  loadConfig(): AppConfig {
    try {
      const raw = fs.readFileSync(this.configPath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (parsed.geminiApiKey && !parsed.anthropicApiKey) {
        parsed.anthropicApiKey = parsed.geminiApiKey
      }
      delete parsed.geminiApiKey
      return migrateConfig(parsed)
    } catch {
      return { ...DEFAULT_CONFIG }
    }
  }

  saveConfig(config: AppConfig): void {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8')
  }

  loadResearch(date: string): ResearchResult[] | null {
    try {
      const raw = fs.readFileSync(this.researchPath(date), 'utf-8')
      const parsed = JSON.parse(raw)
      const arr: ResearchResult[] = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : [])
      if (arr.length === 0) return null
      return arr.map(r => ({ ...r, category: r.category ?? 'Legacy' }))
    } catch {
      return null
    }
  }

  saveResearch(result: ResearchResult): void {
    const existing = this.loadResearch(result.date) || []
    existing.push(result)
    fs.writeFileSync(this.researchPath(result.date), JSON.stringify(existing, null, 2), 'utf-8')
  }

  deleteResearchAt(date: string, index: number): void {
    const existing = this.loadResearch(date) || []
    if (index >= 0 && index < existing.length) {
      existing.splice(index, 1)
      if (existing.length === 0) {
        try { fs.unlinkSync(this.researchPath(date)) } catch {}
      } else {
        fs.writeFileSync(this.researchPath(date), JSON.stringify(existing, null, 2), 'utf-8')
      }
    }
  }

  private get bookmarksPath(): string {
    return path.join(this.basePath, 'bookmarks.json')
  }

  loadBookmarks(): BookmarkItem[] {
    try {
      return JSON.parse(fs.readFileSync(this.bookmarksPath, 'utf-8'))
    } catch {
      return []
    }
  }

  saveBookmark(item: BookmarkItem): void {
    const bookmarks = this.loadBookmarks()
    if (!bookmarks.find(b => b.id === item.id)) {
      bookmarks.unshift(item)
      fs.writeFileSync(this.bookmarksPath, JSON.stringify(bookmarks, null, 2), 'utf-8')
    }
  }

  removeBookmark(id: string): void {
    const bookmarks = this.loadBookmarks().filter(b => b.id !== id)
    fs.writeFileSync(this.bookmarksPath, JSON.stringify(bookmarks, null, 2), 'utf-8')
  }

  listResearchDates(): string[] {
    const dataDir = path.join(this.basePath, 'data')
    try {
      return fs.readdirSync(dataDir)
        .filter(f => f.startsWith('research-') && f.endsWith('.json'))
        .map(f => f.replace('research-', '').replace('.json', ''))
        .sort()
        .reverse()
    } catch {
      return []
    }
  }
}
