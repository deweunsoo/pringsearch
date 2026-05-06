import Parser from 'rss-parser'
import type { RawArticle, RssSource } from '../../shared/types'

export class RssCollector {
  private parser: Parser

  constructor() {
    this.parser = new Parser({
      timeout: 10000
    })
  }

  async collect(sources: RssSource[], fetchPeriodDays = 7): Promise<RawArticle[]> {
    const enabledSources = sources.filter(s => s.enabled)
    const results = await Promise.allSettled(
      enabledSources.map(source => this.fetchFeed(source, fetchPeriodDays))
    )
    return results
      .filter((r): r is PromiseFulfilledResult<RawArticle[]> => r.status === 'fulfilled')
      .flatMap(r => r.value)
  }

  private async fetchFeed(source: RssSource, fetchPeriodDays: number): Promise<RawArticle[]> {
    const feed = await this.parser.parseURL(source.url)
    const sevenDaysAgo = Date.now() - fetchPeriodDays * 24 * 60 * 60 * 1000
    return (feed.items || [])
      .filter(item => {
        const pubDate = item.isoDate ? new Date(item.isoDate).getTime() : 0
        return pubDate > sevenDaysAgo
      })
      .map(item => ({
        title: item.title || 'Untitled',
        url: item.link || '',
        source: 'rss' as const,
        sourceName: source.name,
        summary: (item.contentSnippet || '').slice(0, 500),
        publishedAt: item.isoDate || new Date().toISOString()
      }))
  }
}
