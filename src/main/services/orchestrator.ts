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

    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const tokens = keywords
      .flatMap(k => k.toLowerCase().split(/\s+/))
      .filter(t => t.length >= 2)
    const matchesKeyword = (a: RawArticle): boolean => {
      if (tokens.length === 0) return true
      const haystack = `${a.title} ${a.summary || ''}`.toLowerCase()
      return tokens.some(t => haystack.includes(t))
    }
    const relevantRss = rssArticles.filter(matchesKeyword)
    const allArticles = [...relevantRss, ...hnArticles]
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

    let articlesToAnalyze: RawArticle[] = uniqueArticles
    if (articlesToAnalyze.length === 0 && existingResults && existingResults.length > 0) {
      const fallback: RawArticle[] = []
      const fallbackSeen = new Set<string>()
      for (const r of existingResults) {
        for (const a of r.rawArticles || []) {
          if (!fallbackSeen.has(a.url)) {
            fallbackSeen.add(a.url)
            fallback.push(a)
          }
        }
      }
      articlesToAnalyze = fallback
    }

    const existingTrends = existingResults?.flatMap(r => r.trends || []).map(t => t.text) || []
    const existingInsights = existingResults?.flatMap(r => r.insights || []).map(i => `${i.title}: ${i.body}`) || []
    const existingActions = existingResults?.flatMap(r => r.actions || []).map(a => a.text) || []
    const analysis = await this.analyzer.analyze(articlesToAnalyze, keywords, existingTrends, existingInsights, existingActions)

    return {
      date: today,
      generatedAt: new Date().toISOString(),
      category: category.name,
      rawArticles: articlesToAnalyze,
      ...analysis
    }
  }
}
