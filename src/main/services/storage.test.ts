import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { StorageService, migrateConfig } from './storage'
import { DEFAULT_CONFIG } from '../../shared/types'
import type { ResearchResult } from '../../shared/types'

describe('StorageService', () => {
  let storage: StorageService
  let testDir: string

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arw-test-'))
    storage = new StorageService(testDir)
  })

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  describe('config', () => {
    it('returns default config when no config file exists', () => {
      const config = storage.loadConfig()
      expect(config.scheduleHour).toBe(10)
      expect(config.scheduleMinute).toBe(30)
      expect(config.rssSources.length).toBeGreaterThan(0)
    })

    it('saves and loads config', () => {
      const config = { ...DEFAULT_CONFIG, scheduleHour: 8 }
      storage.saveConfig(config)
      const loaded = storage.loadConfig()
      expect(loaded.scheduleHour).toBe(8)
    })
  })

  describe('config migration', () => {
    it('migrates flat keywords to matched preset categories', () => {
      const legacy = {
        keywords: ['AI Agent', 'LLM', 'UX Design', 'Design System', 'Random'],
        scheduleHour: 9,
      }
      const migrated = migrateConfig(legacy)
      const names = migrated.categories.map(c => c.name)
      expect(names).toContain('AI Agent')
      expect(names).toContain('UX Design')
      expect(names).toContain('Custom')
      const custom = migrated.categories.find(c => c.name === 'Custom')!
      expect(custom.keywords).toEqual(['Random'])
      expect((migrated as any).keywords).toBeUndefined()
    })

    it('passes through already-migrated config', () => {
      const already = {
        categories: [{ name: 'AI Agent', keywords: ['LLM'] }],
        scheduleHour: 11,
      }
      const migrated = migrateConfig(already)
      expect(migrated.categories).toEqual(already.categories)
      expect(migrated.scheduleHour).toBe(11)
    })

    it('yields empty categories when neither keywords nor categories present', () => {
      const migrated = migrateConfig({ scheduleHour: 7 })
      expect(migrated.categories).toEqual([])
    })
  })

  describe('research data', () => {
    const mockResult: ResearchResult = {
      date: '2026-02-27',
      generatedAt: '2026-02-27T10:30:00Z',
      category: 'AI Agent',
      trendHeadline: '',
      insightHeadline: '',
      actionHeadline: '',
      rawArticles: [],
      trends: [{ keywords: [], text: 'AI agents are trending', relatedUrls: [] }],
      insights: [{ title: 'Insight 1', body: 'Detail', relatedUrls: [] }],
      actions: [{ text: 'Try AI agents', category: 'explore' }]
    }

    it('saves and loads research result by date', () => {
      storage.saveResearch(mockResult)
      const loaded = storage.loadResearch('2026-02-27')
      expect(loaded).not.toBeNull()
      expect(loaded![0].trends[0].text).toBe('AI agents are trending')
    })

    it('returns null for missing date', () => {
      const loaded = storage.loadResearch('2099-01-01')
      expect(loaded).toBeNull()
    })

    it('lists available research dates', () => {
      storage.saveResearch(mockResult)
      storage.saveResearch({ ...mockResult, date: '2026-02-26' })
      const dates = storage.listResearchDates()
      expect(dates).toContain('2026-02-27')
      expect(dates).toContain('2026-02-26')
    })

    it('defaults category to "Legacy" when loading a pre-spec record', () => {
      const dataDir = path.join(testDir, 'data')
      const legacyRecord = {
        date: '2026-01-01',
        generatedAt: '2026-01-01T00:00:00Z',
        rawArticles: [],
        trends: [],
        insights: [],
        actions: [],
        trendHeadline: '',
        insightHeadline: '',
        actionHeadline: '',
      }
      fs.writeFileSync(path.join(dataDir, 'research-2026-01-01.json'), JSON.stringify([legacyRecord]), 'utf-8')
      const loaded = storage.loadResearch('2026-01-01')
      expect(loaded![0].category).toBe('Legacy')
    })
  })
})
