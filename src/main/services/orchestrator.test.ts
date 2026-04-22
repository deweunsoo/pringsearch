import { describe, it, expect, vi } from 'vitest'
import { ResearchOrchestrator } from './orchestrator'

vi.mock('./rss-collector', () => ({
  RssCollector: class {
    async collect() {
      return [
        { title: 'Article A', url: 'https://a.com', source: 'rss', sourceName: 'RSS', summary: 'A', publishedAt: '2026-02-27T09:00:00Z' },
        { title: 'Article B', url: 'https://b.com', source: 'rss', sourceName: 'RSS', summary: 'B', publishedAt: '2026-02-27T09:00:00Z' }
      ]
    }
  }
}))

vi.mock('./hn-collector', () => ({
  HackerNewsCollector: class {
    async collect() {
      return [
        { title: 'Article C', url: 'https://a.com', source: 'hackernews', sourceName: 'HN', summary: 'C', publishedAt: '2026-02-27T09:00:00Z' }
      ]
    }
  }
}))

vi.mock('./analyzer', () => ({
  ClaudeAnalyzer: class {
    async analyze(articles: any[]) {
      return {
        trendHeadline: '',
        insightHeadline: '',
        actionHeadline: '',
        trends: [{ keywords: [], text: `Analyzed ${articles.length} articles`, relatedUrls: [] }],
        insights: [{ title: 'Insight', body: 'Body', relatedUrls: [] }],
        actions: [{ text: 'Action', category: 'study' }]
      }
    }
  }
}))

describe('ResearchOrchestrator', () => {
  it('collects from all sources, deduplicates by URL, and analyzes with category name', async () => {
    const orchestrator = new ResearchOrchestrator()
    const config = {
      rssSources: [{ name: 'Test', url: 'https://test.com/feed', enabled: true }],
      categories: [{ name: 'AI Agent', keywords: ['AI'] }]
    }
    const category = { name: 'AI Agent', keywords: ['AI'] }
    const result = await orchestrator.run(config as any, category)
    expect(result.rawArticles.length).toBe(2)
    expect(result.trends[0].text).toBe('Analyzed 2 articles')
    expect(result.date).toBe(new Date().toISOString().split('T')[0])
    expect(result.category).toBe('AI Agent')
  })
})
