import { describe, it, expect, vi } from 'vitest'
import { GeminiAnalyzer } from './analyzer'
import type { RawArticle } from '../../shared/types'

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      constructor() {}
      getGenerativeModel() {
        return {
          generateContent: vi.fn().mockResolvedValue({
            response: {
              text: () => JSON.stringify({
                trends: [
                  { text: 'AI agents are the new UX paradigm', relatedUrls: ['https://example.com/1'] }
                ],
                insights: [
                  { title: 'Agent UX is emerging', body: 'Detailed insight about agent UX patterns', relatedUrls: ['https://example.com/1'] }
                ],
                actions: [
                  { text: 'Study agent UX patterns', category: 'study' }
                ]
              })
            }
          })
        }
      }
    }
  }
})

describe('GeminiAnalyzer', () => {
  const articles: RawArticle[] = [
    {
      title: 'AI Agents Transform UX',
      url: 'https://example.com/1',
      source: 'rss',
      sourceName: 'Test',
      summary: 'AI agents are changing user experience design...',
      publishedAt: '2026-02-27T09:00:00Z'
    }
  ]

  it('analyzes articles and returns structured result', async () => {
    const analyzer = new GeminiAnalyzer('fake-api-key')
    const result = await analyzer.analyze(articles, ['AI Agent', 'UX Design'])
    expect(result.trends.length).toBeGreaterThan(0)
    expect(result.insights.length).toBeGreaterThan(0)
    expect(result.actions.length).toBeGreaterThan(0)
    expect(result.trends[0].text).toContain('AI agent')
  })

  it('returns empty result for empty articles', async () => {
    const analyzer = new GeminiAnalyzer('fake-api-key')
    const result = await analyzer.analyze([], ['AI'])
    expect(result.trends).toEqual([])
    expect(result.insights).toEqual([])
    expect(result.actions).toEqual([])
  })
})
