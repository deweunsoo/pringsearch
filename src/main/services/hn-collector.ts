import type { RawArticle } from '../../shared/types'

const HN_API = 'https://hacker-news.firebaseio.com/v0'

interface HNStory {
  id: number
  title: string
  url?: string
  score: number
  time: number
  type: string
}

export class HackerNewsCollector {
  async collect(keywords: string[]): Promise<RawArticle[]> {
    const res = await fetch(`${HN_API}/topstories.json`)
    if (!res.ok) return []
    const ids: number[] = await res.json()
    const top50Ids = ids.slice(0, 50)
    const stories = await Promise.allSettled(
      top50Ids.map(id => this.fetchStory(id))
    )
    const keywordGroups = keywords.map(k => k.toLowerCase().split(/\s+/))
    return stories
      .filter((r): r is PromiseFulfilledResult<HNStory | null> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter((story): story is HNStory => {
        if (!story || story.type !== 'story' || story.score < 10) return false
        const title = story.title.toLowerCase()
        return keywordGroups.some(words => words.every(w => title.includes(w)))
      })
      .map(story => ({
        title: story.title,
        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
        source: 'hackernews' as const,
        sourceName: 'Hacker News',
        summary: story.title,
        publishedAt: new Date(story.time * 1000).toISOString()
      }))
  }

  private async fetchStory(id: number): Promise<HNStory | null> {
    try {
      const res = await fetch(`${HN_API}/item/${id}.json`)
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  }
}
