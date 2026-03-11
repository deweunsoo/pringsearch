import { spawn } from 'child_process'
import type { RawArticle, TrendItem, InsightItem, ActionItem } from '../../shared/types'

interface AnalysisResult {
  trendHeadline: string
  insightHeadline: string
  actionHeadline: string
  trends: TrendItem[]
  insights: InsightItem[]
  actions: ActionItem[]
}

export class ClaudeAnalyzer {
  async analyze(articles: RawArticle[], keywords: string[], existingTrends: string[] = []): Promise<AnalysisResult> {
    if (articles.length === 0) {
      return { trendHeadline: '', insightHeadline: '', actionHeadline: '', trends: [], insights: [], actions: [] }
    }

    const articleSummaries = articles
      .map((a, i) => `[${i + 1}] ${a.title}\nSource: ${a.sourceName}\nURL: ${a.url}\n${a.summary}`)
      .join('\n\n')

    const prompt = `You are an AI/UX research analyst. Analyze these articles and provide insights.

관심 키워드: ${keywords.join(', ')}

오늘 수집된 기사들:
${articleSummaries}

다음 JSON 형식으로 정확히 응답하세요 (JSON만, 다른 텍스트 없이):
{
  "trendHeadline": "핵심 트렌드 섹션의 요약 제목 (한국어, 한 문장)",
  "insightHeadline": "인사이트 섹션의 요약 제목 (한국어, 한 문장)",
  "actionHeadline": "실무 적용 섹션의 요약 제목 (한국어, 한 문장)",
  "trends": [
    { "keywords": ["키워드1", "키워드2"], "text": "핵심 트렌드 한 줄 요약 (한국어)", "relatedUrls": ["관련 기사 URL"] }
  ],
  "insights": [
    { "title": "인사이트 제목 (한국어)", "body": "2-3문장의 상세 인사이트 (한국어)", "relatedUrls": ["관련 기사 URL"] }
  ],
  "actions": [
    { "text": "실무 적용 제안 (한국어)", "category": "study|apply|explore" }
  ]
}

규칙:
- 이미 생성된 트렌드와 절대 중복되지 않는 새로운 관점의 내용만 생성할 것${existingTrends.length > 0 ? `\n- 이미 다룬 내용 (중복 금지): ${existingTrends.map((t, i) => `${i + 1}. ${t}`).join('; ')}` : ''}
- trendHeadline, insightHeadline, actionHeadline은 각 섹션의 내용을 하나의 구체적인 문장으로 요약
- trends는 최대 5개
- insights는 최대 5개
- actions는 최대 5개
- 모든 텍스트는 한국어로
- category는 "study", "apply", "explore" 중 하나
- 중요한 숫자, 고유명사, 핵심 키워드는 **볼드**로 감싸기 (예: "**Cursor** 연매출 **20억 달러** 돌파")
- trends의 keywords는 해당 트렌드의 핵심 키워드 1-3개 (예: ["AI 코딩", "Cursor", "바이브 코딩"])`

    const text = await this.runClaude(prompt)

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return { trendHeadline: '', insightHeadline: '', actionHeadline: '', trends: [], insights: [], actions: [] }
      return JSON.parse(jsonMatch[0])
    } catch {
      return { trendHeadline: '', insightHeadline: '', actionHeadline: '', trends: [], insights: [], actions: [] }
    }
  }

  private runClaude(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('/usr/local/bin/claude', ['--print'], {
        env: { ...process.env, PATH: process.env.PATH + ':/usr/local/bin' },
        timeout: 120_000
      })

      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
      child.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
      child.on('close', (code) => {
        if (code !== 0) return reject(new Error(`claude exited ${code}: ${stderr}`))
        resolve(stdout)
      })
      child.on('error', reject)
      child.stdin.write(prompt)
      child.stdin.end()
    })
  }
}
