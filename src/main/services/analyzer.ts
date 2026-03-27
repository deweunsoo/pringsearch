import { spawn, execFileSync } from 'child_process'
import https from 'https'
import type { RawArticle, TrendItem, InsightItem, ActionItem, DiscussionMessage } from '../../shared/types'

interface AnalysisResult {
  trendHeadline: string
  insightHeadline: string
  actionHeadline: string
  trends: TrendItem[]
  insights: InsightItem[]
  actions: ActionItem[]
}

export type AiProvider = 'claude' | 'gemini' | 'api-key' | 'none'

function whichSync(cmd: string): string | null {
  try {
    return execFileSync('which', [cmd], { encoding: 'utf-8', timeout: 5000 }).trim() || null
  } catch {
    return null
  }
}

let cachedProvider: { provider: AiProvider; path: string | null } | null = null

export function detectAiProvider(apiKey?: string): { provider: AiProvider; path: string | null } {
  if (apiKey) return { provider: 'api-key', path: null }

  if (cachedProvider && cachedProvider.provider !== 'api-key') return cachedProvider

  const claudePath = whichSync('claude')
  if (claudePath) {
    cachedProvider = { provider: 'claude', path: claudePath }
    return cachedProvider
  }

  const geminiPath = whichSync('gemini')
  if (geminiPath) {
    cachedProvider = { provider: 'gemini', path: geminiPath }
    return cachedProvider
  }

  cachedProvider = { provider: 'none', path: null }
  return cachedProvider
}

export function resetProviderCache(): void {
  cachedProvider = null
}

export class ClaudeAnalyzer {
  private apiKey: string

  constructor(apiKey: string = '') {
    this.apiKey = apiKey
  }

  async analyze(articles: RawArticle[], keywords: string[], existingTrends: string[] = [], existingInsights: string[] = [], existingActions: string[] = []): Promise<AnalysisResult> {
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
- 이전 리서치에서 이미 다룬 내용과 절대 중복되지 않는 완전히 새로운 관점, 새로운 주제, 새로운 분석을 제시할 것
- 같은 기사라도 이전과 다른 각도에서 분석할 것 (예: 이전에 시장 규모를 다뤘으면, 이번엔 기술적 영향이나 사용자 경험 변화를 다룰 것)${existingTrends.length > 0 ? `\n- 이미 다룬 트렌드 (중복 금지): ${existingTrends.map((t, i) => `${i + 1}. ${t}`).join('; ')}` : ''}${existingInsights.length > 0 ? `\n- 이미 다룬 인사이트 (중복 금지): ${existingInsights.map((t, i) => `${i + 1}. ${t}`).join('; ')}` : ''}${existingActions.length > 0 ? `\n- 이미 다룬 실무 적용 (중복 금지): ${existingActions.map((t, i) => `${i + 1}. ${t}`).join('; ')}` : ''}
- trendHeadline, insightHeadline, actionHeadline은 각 섹션의 내용을 하나의 구체적인 문장으로 요약
- trends는 최대 5개
- insights는 최대 5개
- actions는 최대 5개
- 모든 텍스트는 한국어로
- category는 "study", "apply", "explore" 중 하나
- 중요한 숫자, 고유명사, 핵심 키워드는 **볼드**로 감싸기 (예: "**Cursor** 연매출 **20억 달러** 돌파")
- trends의 keywords는 해당 트렌드의 핵심 키워드 1-3개 (예: ["AI 코딩", "Cursor", "바이브 코딩"])`

    const text = await this.callAi(prompt)

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return { trendHeadline: '', insightHeadline: '', actionHeadline: '', trends: [], insights: [], actions: [] }
      return JSON.parse(jsonMatch[0])
    } catch {
      return { trendHeadline: '', insightHeadline: '', actionHeadline: '', trends: [], insights: [], actions: [] }
    }
  }

  async generateDiscussion(research: { trends: TrendItem[]; insights: InsightItem[]; actions: ActionItem[] }): Promise<DiscussionMessage[]> {
    const context = [
      '## 트렌드',
      ...research.trends.map(t => `- ${t.text}`),
      '## 인사이트',
      ...research.insights.map(i => `- ${i.title}: ${i.body}`),
      '## 실무 적용',
      ...research.actions.map(a => `- [${a.category}] ${a.text}`)
    ].join('\n')

    const prompt = `당신은 AI 회사의 4명 동료 역할극을 수행합니다. 아래 리서치 결과를 보고 열띤 토론을 벌이세요.

캐릭터:
- Gemini 사원: 2년차 서비스기획 사원. MZ세대. 짧고 임팩트 있게 말함. "ㄹㅇ", "ㅋㅋ", "개~", "미쳤다", "헐" 같은 표현 자연스럽게 사용. 기획 관점에서 사용자 경험, 서비스 흐름에 관심. 호기심 폭발, 오버 리액션. 1~2문장으로 짧게. 이모지 가끔 사용.
- GPT 대리: 5년차 프로덕트/UXUI 디자이너. 일에 찌들었지만 AI로 업무 효율화하는 데 진심인 사람. "이거 AI로 자동화하면 칼퇴 가능", "피그마 플러그인 붙이면 끝인데" 같은 반응. 귀찮은 건 싫지만 AI 도구 활용법엔 눈이 번쩍. 디자인+AI 융합 관점. 2~3문장. 반말.
- Claude 과장: 정말 똑똑한 풀스택 개발자. 기술 깊이가 남다름. 복잡한 걸 쉽게 설명하고, 다른 사람이 못 보는 기술적 포인트를 짚어냄. "아 그거 이렇게 하면 돼", "근본적으로 이건~" 같은 자신감 있는 말투. 구체적인 기술 솔루션을 제시. 2~3문장. 반말.
- Perplexity 사장: 결론 내리는 보스. 숫자/데이터 좋아함. "그래서 결론은", "이거 해", "다음주까지 검토해" 같은 지시형. 1~2문장으로 끊음. 반말.

리서치 결과:
${context}

규칙:
- 12~16개의 메시지로 자연스러운 대화를 구성
- 각 메시지는 짧게! 최대 3문장. 장문 금지.
- 서로의 말에 적극 반응: 동의, 반박, 질문, 보충하며 진짜 단톡방 대화처럼
- 같은 사람이 연속 2개 메시지를 보낼 수도 있음 (생각 이어가기)
- 각 캐릭터의 개성이 강하게 드러나는 말투
- 한국어로 작성
- 다음 JSON 배열 형식으로만 응답 (다른 텍스트 없이):
[
  { "role": "Gemini 사원", "text": "..." },
  { "role": "GPT 대리", "text": "..." }
]`

    const raw = await this.callAi(prompt)

    try {
      const match = raw.match(/\[[\s\S]*\]/)
      if (!match) return []
      return JSON.parse(match[0])
    } catch {
      return []
    }
  }

  private async callAi(prompt: string): Promise<string> {
    const { provider, path } = detectAiProvider(this.apiKey)

    switch (provider) {
      case 'api-key':
        return this.callAnthropicAPI(prompt)
      case 'claude':
        return this.runCli(path!, ['--print', '--model', 'claude-haiku-4-5-20251001'], prompt)
      case 'gemini':
        return this.runCli(path!, [], prompt)
      case 'none':
        throw new Error('AI CLI를 찾을 수 없습니다. Claude Code 또는 Gemini CLI를 설치하거나, 설정에서 API 키를 입력해주세요.')
    }
  }

  private callAnthropicAPI(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      })

      const req = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
      }, (res) => {
        let data = ''
        res.on('data', (chunk: Buffer) => { data += chunk.toString() })
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            if (json.error) return reject(new Error(json.error.message))
            const text = json.content?.[0]?.text || ''
            resolve(text)
          } catch {
            reject(new Error('Failed to parse API response'))
          }
        })
      })

      req.on('error', reject)
      req.setTimeout(60_000, () => { req.destroy(); reject(new Error('API timeout')) })
      req.write(body)
      req.end()
    })
  }

  private runCli(cliPath: string, args: string[], prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(cliPath, args, {
        env: { ...process.env, PATH: process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin' },
        timeout: 120_000
      })

      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
      child.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
      child.on('close', (code) => {
        if (code !== 0) return reject(new Error(`CLI exited ${code}: ${stderr}`))
        resolve(stdout)
      })
      child.on('error', reject)
      child.stdin.write(prompt)
      child.stdin.end()
    })
  }
}
