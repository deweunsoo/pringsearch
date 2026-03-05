import fs from 'fs'
import path from 'path'
import type { AppConfig, ResearchResult } from '../../shared/types'
import { DEFAULT_CONFIG } from '../../shared/types'

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
      // geminiApiKey → anthropicApiKey 마이그레이션
      if (parsed.geminiApiKey && !parsed.anthropicApiKey) {
        parsed.anthropicApiKey = parsed.geminiApiKey
      }
      delete parsed.geminiApiKey
      return { ...DEFAULT_CONFIG, ...parsed }
    } catch {
      return { ...DEFAULT_CONFIG }
    }
  }

  saveConfig(config: AppConfig): void {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8')
  }

  loadResearch(date: string): ResearchResult | null {
    try {
      const raw = fs.readFileSync(this.researchPath(date), 'utf-8')
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  saveResearch(result: ResearchResult): void {
    fs.writeFileSync(this.researchPath(result.date), JSON.stringify(result, null, 2), 'utf-8')
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
