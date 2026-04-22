import { describe, it, expect, vi } from 'vitest'
import { TopIssuePicker } from './top-issue-picker'
import type { ResearchResult } from '../../shared/types'

function makeResult(overrides: Partial<ResearchResult> = {}): ResearchResult {
  return {
    date: '2026-04-22',
    generatedAt: '2026-04-22T10:00:00Z',
    category: 'AI Agent',
    trendHeadline: 'AI Agent 트렌드',
    insightHeadline: 'AI Agent 인사이트',
    actionHeadline: 'AI Agent 액션',
    rawArticles: [],
    trends: [{ keywords: [], text: 'trend text', relatedUrls: [] }],
    insights: [{ title: 'insight', body: 'body', relatedUrls: [] }],
    actions: [{ text: 'action', category: 'study' }],
    ...overrides,
  }
}

describe('TopIssuePicker', () => {
  it('returns parsed TopIssue when AI returns valid JSON', async () => {
    const analyzer = {
      callAi: vi.fn().mockResolvedValue(
        '{"categoryName":"LLM","headline":"새 GPT-5 발표","body":"세부 내용"}'
      ),
    }
    const picker = new TopIssuePicker(analyzer)
    const top = await picker.pick([makeResult({ category: 'AI Agent' }), makeResult({ category: 'LLM' })])
    expect(top).toEqual({ categoryName: 'LLM', headline: '새 GPT-5 발표', body: '세부 내용' })
  })

  it('falls back to first result when AI returns unparseable text', async () => {
    const analyzer = { callAi: vi.fn().mockResolvedValue('이상한 텍스트') }
    const picker = new TopIssuePicker(analyzer)
    const top = await picker.pick([
      makeResult({ category: 'AI Agent', trendHeadline: 'first' }),
      makeResult({ category: 'LLM' }),
    ])
    expect(top.categoryName).toBe('AI Agent')
    expect(top.headline).toBe('first')
  })

  it('falls back to first result when AI throws', async () => {
    const analyzer = { callAi: vi.fn().mockRejectedValue(new Error('boom')) }
    const picker = new TopIssuePicker(analyzer)
    const top = await picker.pick([makeResult({ category: 'AI Agent', trendHeadline: 'first' })])
    expect(top.categoryName).toBe('AI Agent')
    expect(top.headline).toBe('first')
  })

  it('throws when results are empty', async () => {
    const analyzer = { callAi: vi.fn() }
    const picker = new TopIssuePicker(analyzer)
    await expect(picker.pick([])).rejects.toThrow(/No results/)
  })
})
