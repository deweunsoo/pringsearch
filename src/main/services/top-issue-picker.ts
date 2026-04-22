import type { ResearchResult, TopIssue } from '../../shared/types'
import type { ClaudeAnalyzer } from './analyzer'

export class TopIssuePicker {
  constructor(private analyzer: Pick<ClaudeAnalyzer, 'callAi'>) {}

  async pick(results: ResearchResult[]): Promise<TopIssue> {
    if (results.length === 0) throw new Error('No results to pick from')
    const summaries = results
      .map(
        r =>
          `카테고리: ${r.category}\nTrend: ${r.trendHeadline || r.trends[0]?.text || ''}\nInsight: ${r.insightHeadline || r.insights[0]?.title || ''}`
      )
      .join('\n\n')
    const prompt = `다음은 ${results.length}개 관심 키워드의 오늘 리서치 요약이야. 이 중 가장 임팩트 큰 이슈 1개를 JSON으로 답해. 형식: {"categoryName":"...","headline":"...","body":"..."}

${summaries}`
    try {
      const text = await this.analyzer.callAi(prompt)
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('no json')
      const parsed = JSON.parse(match[0])
      if (!parsed.categoryName || !parsed.headline) throw new Error('missing fields')
      return {
        categoryName: String(parsed.categoryName),
        headline: String(parsed.headline),
        body: String(parsed.body ?? ''),
      }
    } catch {
      const first = results[0]
      return {
        categoryName: first.category,
        headline: first.trendHeadline || first.trends[0]?.text || '새 리서치 도착',
        body: first.trends[0]?.text || '',
      }
    }
  }
}
