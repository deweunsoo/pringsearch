import { spawn } from 'child_process'
import type { RawArticle, TrendItem, InsightItem, ActionItem } from '../../shared/types'

interface AnalysisResult {
  trends: TrendItem[]
  insights: InsightItem[]
  actions: ActionItem[]
}

export class ClaudeAnalyzer {
  async analyze(articles: RawArticle[], keywords: string[]): Promise<AnalysisResult> {
    if (articles.length === 0) {
      return { trends: [], insights: [], actions: [] }
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
- trends는 최대 5개
- insights는 최대 5개
- actions는 최대 5개
- 모든 텍스트는 한국어로
- category는 "study", "apply", "explore" 중 하나`

    const text = await this.runClaude(prompt)

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return { trends: [], insights: [], actions: [] }
      return JSON.parse(jsonMatch[0])
    } catch {
      return { trends: [], insights: [], actions: [] }
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
