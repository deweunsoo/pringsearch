import { describe, it, expect, vi } from 'vitest'
import { ClaudeAnalyzer } from './analyzer'
import type { RawArticle } from '../../shared/types'

const mockResponse = JSON.stringify({
  trends: [
    { text: 'AI agents are the new UX paradigm', relatedUrls: ['https://example.com/1'] }
  ],
  insights: [
    { title: 'Agent UX is emerging', body: 'Detailed insight about agent UX patterns', relatedUrls: ['https://example.com/1'] }
  ],
  actions: [
    { text: 'Study agent UX patterns', category: 'study' }
  ]
})

vi.mock('child_process', () => {
  const { EventEmitter } = require('events')
  const { Readable, Writable } = require('stream')
  return {
    spawn: vi.fn(() => {
      const child = new EventEmitter()
      child.stdout = new Readable({ read() { this.push(mockResponse); this.push(null) } })
      child.stderr = new Readable({ read() { this.push(null) } })
      child.stdin = new Writable({ write(_c: any, _e: any, cb: any) { cb() } })
      setTimeout(() => child.emit('close', 0), 10)
      return child
    })
  }
})

describe('ClaudeAnalyzer', () => {
  const articles: RawArticle[] = [
    {
      title: 'AI Agents Transform UX',
      url: 'https://example.com/1',
      source: 'rss',
      sourceName: 'Test',
      summary: 'AI agents are changing user experience design...',
      publishedAt: '2026-02-27T09:00:00Z'
    }
  ]

  it('analyzes articles and returns structured result', async () => {
    const analyzer = new ClaudeAnalyzer()
    const result = await analyzer.analyze(articles, ['AI Agent', 'UX Design'])
    expect(result.trends.length).toBeGreaterThan(0)
    expect(result.insights.length).toBeGreaterThan(0)
    expect(result.actions.length).toBeGreaterThan(0)
    expect(result.trends[0].text).toContain('AI agent')
  })

  it('returns empty result for empty articles', async () => {
    const analyzer = new ClaudeAnalyzer()
    const result = await analyzer.analyze([], ['AI'])
    expect(result.trends).toEqual([])
    expect(result.insights).toEqual([])
    expect(result.actions).toEqual([])
  })
})
