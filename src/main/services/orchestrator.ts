import { RssCollector } from './rss-collector'
import { HackerNewsCollector } from './hn-collector'
import { ClaudeAnalyzer } from './analyzer'
import type { AppConfig, Category, RawArticle, ResearchResult } from '../../shared/types'


export class ResearchOrchestrator {
  private rssCollector: RssCollector
  private hnCollector: HackerNewsCollector
  analyzer: ClaudeAnalyzer

  constructor(apiKey?: string) {
    this.rssCollector = new RssCollector()
    this.hnCollector = new HackerNewsCollector()
    this.analyzer = new ClaudeAnalyzer(apiKey || '')
  }

  async run(
    config: AppConfig,
    category: Category,
    existingResults?: ResearchResult[],
  ): Promise<ResearchResult> {
    const fetchDays = config.fetchPeriodDays || 7
    const keywords = category.keywords
    const [rssArticles, hnArticles] = await Promise.all([
      this.rssCollector.collect(config.rssSources, fetchDays),
      this.hnCollector.collect(keywords)
    ])

    const allArticles = [...rssArticles, ...hnArticles]
    const seen = new Set<string>()
    const uniqueArticles: RawArticle[] = []

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

    const articlesToAnalyze = uniqueArticles.length > 0
      ? uniqueArticles
      : existingResults?.flatMap(r => r.rawArticles || []) || []

    const existingTrends = existingResults?.flatMap(r => r.trends || []).map(t => t.text) || []
    const existingInsights = existingResults?.flatMap(r => r.insights || []).map(i => `${i.title}: ${i.body}`) || []
    const existingActions = existingResults?.flatMap(r => r.actions || []).map(a => a.text) || []
    const analysis = await this.analyzer.analyze(articlesToAnalyze, keywords, existingTrends, existingInsights, existingActions)

    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    return {
      date: today,
      generatedAt: new Date().toISOString(),
      category: category.name,
      rawArticles: articlesToAnalyze,
      ...analysis
    }
  }
}
