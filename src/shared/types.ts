export interface RawArticle {
  title: string
  url: string
  source: string
  sourceName: string
  summary: string
  publishedAt: string
}

export interface TrendItem {
  text: string
  relatedUrls: string[]
}

export interface InsightItem {
  title: string
  body: string
  relatedUrls: string[]
}

export interface ActionItem {
  text: string
  category: 'study' | 'apply' | 'explore'
}

export interface ResearchResult {
  date: string
  generatedAt: string
  rawArticles: RawArticle[]
  trends: TrendItem[]
  insights: InsightItem[]
  actions: ActionItem[]
}

export interface RssSource {
  name: string
  url: string
  enabled: boolean
}

export interface AppConfig {
  scheduleHour: number
  scheduleMinute: number
  geminiApiKey: string
  rssSources: RssSource[]
  keywords: string[]
  notificationEnabled: boolean
  dataPath: string
}

export const DEFAULT_CONFIG: AppConfig = {
  scheduleHour: 10,
  scheduleMinute: 30,
  geminiApiKey: '',
  rssSources: [
    { name: 'MIT Tech Review - AI', url: 'https://www.technologyreview.com/feed/', enabled: true },
    { name: 'The Verge - AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', enabled: true },
    { name: 'TechCrunch - AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', enabled: true },
    { name: 'UX Collective', url: 'https://uxdesign.cc/feed', enabled: true },
    { name: 'NN Group', url: 'https://www.nngroup.com/feed/rss/', enabled: true },
    { name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/', enabled: true }
  ],
  keywords: ['AI Agent', 'UX Design', 'Generative UI', 'AI Design Tools'],
  notificationEnabled: true,
  dataPath: '~/ai-research-widget/data'
}
