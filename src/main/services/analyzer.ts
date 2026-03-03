import { GoogleGenerativeAI } from '@google/generative-ai'
import type { RawArticle, TrendItem, InsightItem, ActionItem } from '../../shared/types'

interface AnalysisResult {
  trends: TrendItem[]
  insights: InsightItem[]
  actions: ActionItem[]
}

export class GeminiAnalyzer {
  private genAI: GoogleGenerativeAI

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey)
  }

  async analyze(articles: RawArticle[], keywords: string[]): Promise<AnalysisResult> {
    if (articles.length === 0) {
      return { trends: [], insights: [], actions: [] }
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const articleSummaries = articles
      .map((a, i) => `[${i + 1}] ${a.title}\nSource: ${a.sourceName}\nURL: ${a.url}\n${a.summary}`)
      .join('\n\n')

    const prompt = `You are an AI/UX research analyst. Analyze these articles and provide insights.

관심 키워드: ${keywords.join(', ')}

오늘 수집된 기사들:
${articleSummaries}

다음 JSON 형식으로 정확히 응답하세요 (JSON만, 다른 텍스트 없이):
{
  "trends": [
    { "text": "핵심 트렌드 한 줄 요약 (한국어)", "relatedUrls": ["관련 기사 URL"] }
  ],
  "insights": [
    { "title": "인사이트 제목 (한국어)", "body": "2-3문장의 상세 인사이트 (한국어)", "relatedUrls": ["관련 기사 URL"] }
  ],
  "actions": [
    { "text": "실무 적용 제안 (한국어)", "category": "study|apply|explore" }
  ]
}

규칙:
- trends는 최대 3개
- insights는 최대 3개
- actions는 최대 3개
- 모든 텍스트는 한국어로
- category는 "study", "apply", "explore" 중 하나`

    const response = await model.generateContent(prompt)
    const text = response.response.text()

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return { trends: [], insights: [], actions: [] }
      return JSON.parse(jsonMatch[0])
    } catch {
      return { trends: [], insights: [], actions: [] }
    }
  }
}
