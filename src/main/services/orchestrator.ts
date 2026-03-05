import { RssCollector } from './rss-collector'
import { HackerNewsCollector } from './hn-collector'
import { ClaudeAnalyzer } from './analyzer'
import type { AppConfig, RawArticle, ResearchResult } from '../../shared/types'

export class ResearchOrchestrator {
  private rssCollector: RssCollector
  private hnCollector: HackerNewsCollector
  private analyzer: ClaudeAnalyzer

  constructor() {
    this.rssCollector = new RssCollector()
    this.hnCollector = new HackerNewsCollector()
    this.analyzer = new ClaudeAnalyzer()
  }

  async run(config: AppConfig): Promise<ResearchResult> {
    const [rssArticles, hnArticles] = await Promise.all([
      this.rssCollector.collect(config.rssSources),
      this.hnCollector.collect(config.keywords)
    ])

    const allArticles = [...rssArticles, ...hnArticles]
    const seen = new Set<string>()
    const uniqueArticles: RawArticle[] = []
    for (const article of allArticles) {
      if (!seen.has(article.url)) {
        seen.add(article.url)
        uniqueArticles.push(article)
      }
    }

    const analysis = await this.analyzer.analyze(uniqueArticles, config.keywords)

    const today = new Date().toISOString().split('T')[0]
    return {
      date: today,
      generatedAt: new Date().toISOString(),
      rawArticles: uniqueArticles,
      ...analysis
    }
  }
}
