import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HackerNewsCollector } from './hn-collector'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('HackerNewsCollector', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('collects top AI/design stories with score >= 10', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('topstories')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([1, 2, 3]) })
      }
      if (url.includes('/item/1.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 1, title: 'New AI Agent Framework',
            url: 'https://example.com/ai', score: 120,
            time: Math.floor(Date.now() / 1000), type: 'story'
          })
        })
      }
      if (url.includes('/item/2.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 2, title: 'Cooking recipes',
            url: 'https://example.com/cook', score: 200,
            time: Math.floor(Date.now() / 1000), type: 'story'
          })
        })
      }
      if (url.includes('/item/3.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 3, title: 'UX Design with AI',
            url: 'https://example.com/ux', score: 30,
            time: Math.floor(Date.now() / 1000), type: 'story'
          })
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(null) })
    })

    const collector = new HackerNewsCollector()
    const articles = await collector.collect(['AI', 'UX Design'])
    expect(articles.length).toBe(2)
    expect(articles[0].title).toBe('New AI Agent Framework')
    expect(articles[1].title).toBe('UX Design with AI')
    expect(articles[0].source).toBe('hackernews')
  })
})
