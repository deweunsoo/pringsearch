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

  async run(config: AppConfig, existingResults?: ResearchResult[]): Promise<ResearchResult> {
    const fetchDays = config.fetchPeriodDays || 7
    const [rssArticles, hnArticles] = await Promise.all([
      this.rssCollector.collect(config.rssSources, fetchDays),
      this.hnCollector.collect(config.keywords)
    ])

    const allArticles = [...rssArticles, ...hnArticles]
    const seen = new Set<string>()
    const uniqueArticles: RawArticle[] = []

    // Exclude articles already used in previous runs today
    if (existingResults && existingResults.length > 0) {
      for (const r of existingResults) {
        for (const a of r.rawArticles || []) {
          seen.add(a.url)
        }
      }
    }

    for (const article of allArticles) {
      if (!seen.has(article.url)) {
        seen.add(article.url)
        uniqueArticles.push(article)
      }
    }

    const existingTrends = existingResults?.flatMap(r => r.trends || []).map(t => t.text) || []
    const analysis = await this.analyzer.analyze(uniqueArticles, config.keywords, existingTrends)

    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    return {
      date: today,
      generatedAt: new Date().toISOString(),
      rawArticles: uniqueArticles,
      ...analysis
    }
  }
}
