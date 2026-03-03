import { describe, it, expect, vi } from 'vitest'
import { RssCollector } from './rss-collector'
import type { RssSource } from '../../shared/types'

vi.mock('rss-parser', () => {
  return {
    default: class {
      async parseURL(url: string) {
        return {
          items: [
            {
              title: 'AI Agents Transform UX',
              link: 'https://example.com/ai-agents',
              contentSnippet: 'AI agents are changing how users interact...',
              isoDate: new Date().toISOString()
            },
            {
              title: 'Old Article',
              link: 'https://example.com/old',
              contentSnippet: 'This is an old article',
              isoDate: '2020-01-01T00:00:00Z'
            }
          ]
        }
      }
    }
  }
})

describe('RssCollector', () => {
  const sources: RssSource[] = [
    { name: 'Test Feed', url: 'https://example.com/feed', enabled: true },
    { name: 'Disabled Feed', url: 'https://example.com/disabled', enabled: false }
  ]

  it('collects articles from enabled RSS sources only', async () => {
    const collector = new RssCollector()
    const articles = await collector.collect(sources)
    expect(articles.length).toBe(1)
    expect(articles[0].title).toBe('AI Agents Transform UX')
    expect(articles[0].source).toBe('rss')
    expect(articles[0].sourceName).toBe('Test Feed')
  })

  it('skips disabled sources', async () => {
    const collector = new RssCollector()
    const disabledOnly: RssSource[] = [
      { name: 'Disabled', url: 'https://example.com/x', enabled: false }
    ]
    const articles = await collector.collect(disabledOnly)
    expect(articles.length).toBe(0)
  })
})
