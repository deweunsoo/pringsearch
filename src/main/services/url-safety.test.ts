import { describe, expect, it } from 'vitest'
import { assessExternalUrl } from '../../shared/url-safety'

describe('assessExternalUrl', () => {
  it('marks trusted https links as normal', () => {
    const result = assessExternalUrl('https://techcrunch.com/article')
    expect(result.level).toBe('normal')
    expect(result.trust).toBe('trusted')
    expect(result.label).toBe('신뢰 소스')
  })

  it('marks unknown https links as caution with an unclear status', () => {
    const result = assessExternalUrl('https://example.com/article')
    expect(result.level).toBe('caution')
    expect(result.trust).toBe('unknown')
    expect(result.label).toBe('확인 불가')
  })

  it('blocks non-https links', () => {
    const result = assessExternalUrl('http://example.com/article')
    expect(result.level).toBe('blocked')
    expect(result.reasons[0]).toContain('https')
  })

  it('blocks local and private network links', () => {
    expect(assessExternalUrl('https://localhost:3000').level).toBe('blocked')
    expect(assessExternalUrl('https://192.168.0.10/admin').level).toBe('blocked')
  })

  it('blocks direct installer or archive downloads', () => {
    expect(assessExternalUrl('https://example.com/update.dmg').level).toBe('blocked')
    expect(assessExternalUrl('https://example.com/archive.zip?ref=rss').level).toBe('blocked')
  })

  it('warns on shortened links', () => {
    const result = assessExternalUrl('https://bit.ly/example')
    expect(result.level).toBe('caution')
    expect(result.reasons.join('\n')).toContain('단축 URL')
  })
})
