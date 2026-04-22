export interface RawArticle {
  title: string
  url: string
  source: string
  sourceName: string
  summary: string
  publishedAt: string
}

export interface TrendItem {
  keywords: string[]
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
  category: string
  trendHeadline: string
  insightHeadline: string
  actionHeadline: string
  rawArticles: RawArticle[]
  trends: TrendItem[]
  insights: InsightItem[]
  actions: ActionItem[]
}

export interface Category {
  name: string
  keywords: string[]
}

export interface TopIssue {
  categoryName: string
  headline: string
  body: string
}

export interface DiscussionMessage {
  role: 'Gemini 사원' | 'GPT 대리' | 'Claude 과장' | 'Perplexity 사장'
  text: string
}

export interface BookmarkItem {
  id: string
  type: 'trend' | 'insight' | 'action'
  content: TrendItem | InsightItem | ActionItem
  date: string
  savedAt: string
}

export interface RssSource {
  name: string
  url: string
  enabled: boolean
}

export interface AppConfig {
  scheduleHour: number
  scheduleMinute: number
  anthropicApiKey: string
  rssSources: RssSource[]
  categories: Category[]
  notificationEnabled: boolean
  openAtLogin: boolean
  setupCompleted: boolean
  dataPath: string
  fetchPeriodDays: number
}

export const DEFAULT_CONFIG: AppConfig = {
  scheduleHour: 10,
  scheduleMinute: 30,
  anthropicApiKey: '',
  rssSources: [
    { name: 'MIT Tech Review - AI', url: 'https://www.technologyreview.com/feed/', enabled: true },
    { name: 'The Verge - AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', enabled: true },
    { name: 'TechCrunch - AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', enabled: true }
  ],
  categories: [{ name: 'AI Agent', keywords: ['AI Agent', 'AI Coding', 'LLM', 'Generative AI'] }],
  notificationEnabled: true,
  openAtLogin: false,
  setupCompleted: false,
  dataPath: '~/ai-research-widget/data',
  fetchPeriodDays: 3
}
