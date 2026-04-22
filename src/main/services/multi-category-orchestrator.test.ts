import { describe, it, expect, vi } from 'vitest'
import { MultiCategoryOrchestrator } from './multi-category-orchestrator'
import type { AppConfig, ResearchResult } from '../../shared/types'

function mkResult(category: string): ResearchResult {
  return {
    date: '2026-04-22',
    generatedAt: '2026-04-22T10:00:00Z',
    category,
    trendHeadline: `${category} trend`,
    insightHeadline: '',
    actionHeadline: '',
    rawArticles: [],
    trends: [{ keywords: [], text: `${category} text`, relatedUrls: [] }],
    insights: [],
    actions: [],
  }
}

function mkConfig(categoryNames: string[]): AppConfig {
  return {
    scheduleHour: 10,
    scheduleMinute: 0,
    anthropicApiKey: '',
    rssSources: [],
    categories: categoryNames.map(n => ({ name: n, keywords: [n] })),
    notificationEnabled: true,
    openAtLogin: false,
    setupCompleted: true,
    dataPath: '',
    fetchPeriodDays: 3,
  }
}

describe('MultiCategoryOrchestrator', () => {
  it('fans out to each category, collects results, and returns topIssue', async () => {
    const orchestrator = {
      run: vi.fn().mockImplementation((_c, cat) => Promise.resolve(mkResult(cat.name))),
    }
    const picker = {
      pick: vi.fn().mockResolvedValue({ categoryName: 'A', headline: 'top', body: '' }),
    }
    const multi = new MultiCategoryOrchestrator(orchestrator as any, picker as any)
    const out = await multi.run(mkConfig(['A', 'B', 'C']))
    expect(out.results.map(r => r.category)).toEqual(['A', 'B', 'C'])
    expect(out.topIssue.headline).toBe('top')
    expect(orchestrator.run).toHaveBeenCalledTimes(3)
    expect(picker.pick).toHaveBeenCalledWith(out.results)
  })

  it('drops failed categories and keeps successful ones', async () => {
    const orchestrator = {
      run: vi.fn().mockImplementation((_c, cat) =>
        cat.name === 'B' ? Promise.reject(new Error('fail')) : Promise.resolve(mkResult(cat.name))
      ),
    }
    const picker = {
      pick: vi.fn().mockResolvedValue({ categoryName: 'A', headline: 'top', body: '' }),
    }
    const multi = new MultiCategoryOrchestrator(orchestrator as any, picker as any)
    const out = await multi.run(mkConfig(['A', 'B', 'C']))
    expect(out.results.map(r => r.category)).toEqual(['A', 'C'])
  })

  it('throws when all categories fail', async () => {
    const orchestrator = {
      run: vi.fn().mockRejectedValue(new Error('fail')),
    }
    const picker = { pick: vi.fn() }
    const multi = new MultiCategoryOrchestrator(orchestrator as any, picker as any)
    await expect(multi.run(mkConfig(['A', 'B']))).rejects.toThrow(/All categories failed/)
    expect(picker.pick).not.toHaveBeenCalled()
  })

  it('passes per-category existing results to orchestrator', async () => {
    const orchestrator = {
      run: vi.fn().mockImplementation((_c, cat) => Promise.resolve(mkResult(cat.name))),
    }
    const picker = {
      pick: vi.fn().mockResolvedValue({ categoryName: 'A', headline: 'top', body: '' }),
    }
    const multi = new MultiCategoryOrchestrator(orchestrator as any, picker as any)
    const existing = { A: [mkResult('A')], B: [] }
    await multi.run(mkConfig(['A', 'B']), existing)
    expect(orchestrator.run).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({ name: 'A' }),
      existing.A
    )
    expect(orchestrator.run).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ name: 'B' }),
      existing.B
    )
  })
})
