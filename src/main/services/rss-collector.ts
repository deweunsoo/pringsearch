import Parser from 'rss-parser'
import https from 'https'
import type { RawArticle, RssSource } from '../../shared/types'

export class RssCollector {
  private parser: Parser

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      requestOptions: {
        agent: new https.Agent({ rejectUnauthorized: false })
      }
    })
  }

  async collect(sources: RssSource[]): Promise<RawArticle[]> {
    const enabledSources = sources.filter(s => s.enabled)
    const results = await Promise.allSettled(
      enabledSources.map(source => this.fetchFeed(source))
    )
    return results
      .filter((r): r is PromiseFulfilledResult<RawArticle[]> => r.status === 'fulfilled')
      .flatMap(r => r.value)
  }

  private async fetchFeed(source: RssSource): Promise<RawArticle[]> {
    const feed = await this.parser.parseURL(source.url)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
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
