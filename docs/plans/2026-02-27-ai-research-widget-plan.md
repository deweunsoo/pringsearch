# AI Research Widget Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 매일 아침 AI/UX 리서치를 자동 수집하고 Gemini로 인사이트를 생성하여 macOS 데스크탑 위젯에 표시하는 Electron 앱을 만든다.

**Architecture:** Electron 메인 프로세스에서 node-cron 스케줄링, 데이터 수집, Gemini API 분석을 처리하고, IPC를 통해 React 렌더러로 결과를 전달한다. 데이터는 로컬 JSON 파일에 저장한다.

**Tech Stack:** Electron + electron-vite + React 18 + TypeScript + Tailwind CSS + node-cron + rss-parser + @google/generative-ai + vitest

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `electron-vite.config.ts`
- Create: `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`
- Create: `tailwind.config.js`
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/index.css`

**Step 1: Initialize electron-vite project**

```bash
cd /Users/spring.lee/ai-research-widget
npm create @anthropic-ai/quick-start@latest -- --skip  # 아니, electron-vite 사용
npm create @nicepkg/electron-vite@latest . -- --template react-ts
```

실제로는 수동 셋업이 더 깔끔하다. package.json부터 직접 만든다:

```bash
cd /Users/spring.lee/ai-research-widget
npm init -y
npm install electron electron-vite @electron-toolkit/preload @electron-toolkit/utils
npm install react react-dom
npm install -D typescript @types/react @types/react-dom
npm install -D tailwindcss @tailwindcss/vite
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
npm install node-cron rss-parser @google/generative-ai
npm install -D @types/node-cron
```

**Step 2: Configure electron-vite**

Create `electron-vite.config.ts`:

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react(), tailwindcss()]
  }
})
```

**Step 3: Configure TypeScript**

Create `tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "outDir": "out",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["electron-vite.config.ts", "src/main/**/*", "src/preload/**/*"]
}
```

Create `tsconfig.web.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "jsx": "react-jsx",
    "outDir": "out",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/renderer/**/*"]
}
```

**Step 4: Create minimal Electron entry files**

Create `src/main/index.ts`:

```typescript
import { app, BrowserWindow } from 'electron'
import path from 'path'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 380,
    height: 520,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

Create `src/preload/index.ts`:

```typescript
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('api', {
  platform: process.platform
})
```

Create `src/renderer/index.html`:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Research Widget</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./src/main.tsx"></script>
</body>
</html>
```

Create `src/renderer/src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

Create `src/renderer/src/App.tsx`:

```tsx
export default function App() {
  return (
    <div className="h-screen w-screen rounded-2xl bg-gray-950 text-white p-4">
      <h1 className="text-lg font-bold">AI Research Widget</h1>
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  )
}
```

Create `src/renderer/src/index.css`:

```css
@import "tailwindcss";

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: transparent;
  -webkit-app-region: drag;
}

button, a, input, select {
  -webkit-app-region: no-drag;
}
```

**Step 5: Add package.json scripts**

Update `package.json` main and scripts:

```json
{
  "main": "out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**Step 6: Create vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
```

**Step 7: Run dev to verify scaffolding works**

Run: `cd /Users/spring.lee/ai-research-widget && npm run dev`
Expected: Electron window opens with "AI Research Widget" text on dark background.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Electron + React + TypeScript + Tailwind project"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `src/shared/types.ts`

**Step 1: Define all shared types**

Create `src/shared/types.ts`:

```typescript
export interface RawArticle {
  title: string
  url: string
  source: string        // 'rss' | 'hackernews' | 'gemini-search'
  sourceName: string    // 'MIT Tech Review', 'Hacker News', etc.
  summary: string       // 원문 요약 또는 snippet
  publishedAt: string   // ISO date string
}

export interface TrendItem {
  text: string          // 트렌드 한 줄 요약
  relatedUrls: string[] // 관련 기사 URL들
}

export interface InsightItem {
  title: string         // 인사이트 제목
  body: string          // 인사이트 상세 내용
  relatedUrls: string[] // 관련 기사 URL들
}

export interface ActionItem {
  text: string          // 실무 적용 제안 내용
  category: 'study' | 'apply' | 'explore'  // 학습 / 적용 / 탐색
}

export interface ResearchResult {
  date: string          // YYYY-MM-DD
  generatedAt: string   // ISO datetime
  rawArticles: RawArticle[]
  trends: TrendItem[]
  insights: InsightItem[]
  actions: ActionItem[]
}

export interface RssSource {
  name: string
  url: string
  enabled: boolean
}

export interface AppConfig {
  scheduleHour: number
  scheduleMinute: number
  geminiApiKey: string
  rssSources: RssSource[]
  keywords: string[]
  notificationEnabled: boolean
  dataPath: string
}

export const DEFAULT_CONFIG: AppConfig = {
  scheduleHour: 10,
  scheduleMinute: 30,
  geminiApiKey: '',
  rssSources: [
    { name: 'MIT Tech Review - AI', url: 'https://www.technologyreview.com/feed/', enabled: true },
    { name: 'The Verge - AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', enabled: true },
    { name: 'TechCrunch - AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', enabled: true },
    { name: 'UX Collective', url: 'https://uxdesign.cc/feed', enabled: true },
    { name: 'NN Group', url: 'https://www.nngroup.com/feed/rss/', enabled: true },
    { name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/', enabled: true }
  ],
  keywords: ['AI Agent', 'UX Design', 'Generative UI', 'AI Design Tools'],
  notificationEnabled: true,
  dataPath: '~/ai-research-widget/data'
}
```

**Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: define shared TypeScript types for research data and config"
```

---

### Task 3: Storage Service (TDD)

**Files:**
- Create: `src/main/services/storage.ts`
- Create: `src/main/services/storage.test.ts`

**Step 1: Write failing tests**

Create `src/main/services/storage.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { StorageService } from './storage'
import { DEFAULT_CONFIG } from '../../shared/types'
import type { ResearchResult } from '../../shared/types'

describe('StorageService', () => {
  let storage: StorageService
  let testDir: string

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arw-test-'))
    storage = new StorageService(testDir)
  })

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  describe('config', () => {
    it('returns default config when no config file exists', () => {
      const config = storage.loadConfig()
      expect(config.scheduleHour).toBe(10)
      expect(config.scheduleMinute).toBe(30)
      expect(config.rssSources.length).toBeGreaterThan(0)
    })

    it('saves and loads config', () => {
      const config = { ...DEFAULT_CONFIG, scheduleHour: 8 }
      storage.saveConfig(config)
      const loaded = storage.loadConfig()
      expect(loaded.scheduleHour).toBe(8)
    })
  })

  describe('research data', () => {
    const mockResult: ResearchResult = {
      date: '2026-02-27',
      generatedAt: '2026-02-27T10:30:00Z',
      rawArticles: [],
      trends: [{ text: 'AI agents are trending', relatedUrls: [] }],
      insights: [{ title: 'Insight 1', body: 'Detail', relatedUrls: [] }],
      actions: [{ text: 'Try AI agents', category: 'explore' }]
    }

    it('saves and loads research result by date', () => {
      storage.saveResearch(mockResult)
      const loaded = storage.loadResearch('2026-02-27')
      expect(loaded).not.toBeNull()
      expect(loaded!.trends[0].text).toBe('AI agents are trending')
    })

    it('returns null for missing date', () => {
      const loaded = storage.loadResearch('2099-01-01')
      expect(loaded).toBeNull()
    })

    it('lists available research dates', () => {
      storage.saveResearch(mockResult)
      storage.saveResearch({ ...mockResult, date: '2026-02-26' })
      const dates = storage.listResearchDates()
      expect(dates).toContain('2026-02-27')
      expect(dates).toContain('2026-02-26')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/main/services/storage.test.ts`
Expected: FAIL — `storage.ts` doesn't exist

**Step 3: Implement storage service**

Create `src/main/services/storage.ts`:

```typescript
import fs from 'fs'
import path from 'path'
import type { AppConfig, ResearchResult } from '../../shared/types'
import { DEFAULT_CONFIG } from '../../shared/types'

export class StorageService {
  private basePath: string

  constructor(basePath: string) {
    this.basePath = basePath
    fs.mkdirSync(path.join(this.basePath, 'data'), { recursive: true })
  }

  private get configPath(): string {
    return path.join(this.basePath, 'config.json')
  }

  private researchPath(date: string): string {
    return path.join(this.basePath, 'data', `research-${date}.json`)
  }

  loadConfig(): AppConfig {
    try {
      const raw = fs.readFileSync(this.configPath, 'utf-8')
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
    } catch {
      return { ...DEFAULT_CONFIG }
    }
  }

  saveConfig(config: AppConfig): void {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8')
  }

  loadResearch(date: string): ResearchResult | null {
    try {
      const raw = fs.readFileSync(this.researchPath(date), 'utf-8')
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  saveResearch(result: ResearchResult): void {
    fs.writeFileSync(this.researchPath(result.date), JSON.stringify(result, null, 2), 'utf-8')
  }

  listResearchDates(): string[] {
    const dataDir = path.join(this.basePath, 'data')
    try {
      return fs.readdirSync(dataDir)
        .filter(f => f.startsWith('research-') && f.endsWith('.json'))
        .map(f => f.replace('research-', '').replace('.json', ''))
        .sort()
        .reverse()
    } catch {
      return []
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/main/services/storage.test.ts`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add src/main/services/storage.ts src/main/services/storage.test.ts
git commit -m "feat: add storage service with config and research data persistence"
```

---

### Task 4: RSS Collector (TDD)

**Files:**
- Create: `src/main/services/rss-collector.ts`
- Create: `src/main/services/rss-collector.test.ts`

**Step 1: Write failing test**

Create `src/main/services/rss-collector.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { RssCollector } from './rss-collector'
import type { RssSource } from '../../shared/types'

// rss-parser를 mock
vi.mock('rss-parser', () => {
  return {
    default: class {
      async parseURL(url: string) {
        return {
          items: [
            {
              title: 'AI Agents Transform UX',
              link: 'https://example.com/ai-agents',
              contentSnippet: 'AI agents are changing how users interact...',
              isoDate: new Date().toISOString()
            },
            {
              title: 'Old Article',
              link: 'https://example.com/old',
              contentSnippet: 'This is an old article',
              isoDate: '2020-01-01T00:00:00Z'
            }
          ]
        }
      }
    }
  }
})

describe('RssCollector', () => {
  const sources: RssSource[] = [
    { name: 'Test Feed', url: 'https://example.com/feed', enabled: true },
    { name: 'Disabled Feed', url: 'https://example.com/disabled', enabled: false }
  ]

  it('collects articles from enabled RSS sources only', async () => {
    const collector = new RssCollector()
    const articles = await collector.collect(sources)
    // Only enabled source, and only recent article (not the 2020 one)
    expect(articles.length).toBe(1)
    expect(articles[0].title).toBe('AI Agents Transform UX')
    expect(articles[0].source).toBe('rss')
    expect(articles[0].sourceName).toBe('Test Feed')
  })

  it('skips disabled sources', async () => {
    const collector = new RssCollector()
    const disabledOnly: RssSource[] = [
      { name: 'Disabled', url: 'https://example.com/x', enabled: false }
    ]
    const articles = await collector.collect(disabledOnly)
    expect(articles.length).toBe(0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/main/services/rss-collector.test.ts`
Expected: FAIL

**Step 3: Implement RSS collector**

Create `src/main/services/rss-collector.ts`:

```typescript
import Parser from 'rss-parser'
import type { RawArticle, RssSource } from '../../shared/types'

export class RssCollector {
  private parser: Parser

  constructor() {
    this.parser = new Parser({ timeout: 10000 })
  }

  async collect(sources: RssSource[]): Promise<RawArticle[]> {
    const enabledSources = sources.filter(s => s.enabled)
    const results = await Promise.allSettled(
      enabledSources.map(source => this.fetchFeed(source))
    )

    return results
      .filter((r): r is PromiseFulfilledResult<RawArticle[]> => r.status === 'fulfilled')
      .flatMap(r => r.value)
  }

  private async fetchFeed(source: RssSource): Promise<RawArticle[]> {
    const feed = await this.parser.parseURL(source.url)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

    return (feed.items || [])
      .filter(item => {
        const pubDate = item.isoDate ? new Date(item.isoDate).getTime() : 0
        return pubDate > oneDayAgo
      })
      .map(item => ({
        title: item.title || 'Untitled',
        url: item.link || '',
        source: 'rss' as const,
        sourceName: source.name,
        summary: (item.contentSnippet || '').slice(0, 500),
        publishedAt: item.isoDate || new Date().toISOString()
      }))
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/main/services/rss-collector.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/main/services/rss-collector.ts src/main/services/rss-collector.test.ts
git commit -m "feat: add RSS collector with date filtering and source toggle"
```

---

### Task 5: Hacker News Collector (TDD)

**Files:**
- Create: `src/main/services/hn-collector.ts`
- Create: `src/main/services/hn-collector.test.ts`

**Step 1: Write failing test**

Create `src/main/services/hn-collector.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HackerNewsCollector } from './hn-collector'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('HackerNewsCollector', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('collects top AI/design stories with score >= 50', async () => {
    // Mock top stories endpoint
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('topstories')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([1, 2, 3])
        })
      }
      if (url.includes('/item/1.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 1, title: 'New AI Agent Framework',
            url: 'https://example.com/ai', score: 120,
            time: Math.floor(Date.now() / 1000),
            type: 'story'
          })
        })
      }
      if (url.includes('/item/2.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 2, title: 'Cooking recipes',
            url: 'https://example.com/cook', score: 200,
            time: Math.floor(Date.now() / 1000),
            type: 'story'
          })
        })
      }
      if (url.includes('/item/3.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 3, title: 'UX Design with AI',
            url: 'https://example.com/ux', score: 30,
            time: Math.floor(Date.now() / 1000),
            type: 'story'
          })
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(null) })
    })

    const collector = new HackerNewsCollector()
    const articles = await collector.collect(['AI', 'UX Design'])

    // Story 1: AI + score>=50 → included
    // Story 2: not AI/UX → excluded
    // Story 3: UX but score<50 → excluded
    expect(articles.length).toBe(1)
    expect(articles[0].title).toBe('New AI Agent Framework')
    expect(articles[0].source).toBe('hackernews')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/main/services/hn-collector.test.ts`
Expected: FAIL

**Step 3: Implement HN collector**

Create `src/main/services/hn-collector.ts`:

```typescript
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

    const lowerKeywords = keywords.map(k => k.toLowerCase())

    return stories
      .filter((r): r is PromiseFulfilledResult<HNStory | null> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter((story): story is HNStory => {
        if (!story || story.type !== 'story' || story.score < 50) return false
        const title = story.title.toLowerCase()
        return lowerKeywords.some(kw => title.includes(kw.toLowerCase()))
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/main/services/hn-collector.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/services/hn-collector.ts src/main/services/hn-collector.test.ts
git commit -m "feat: add Hacker News collector with keyword and score filtering"
```

---

### Task 6: Gemini Analyzer (TDD)

**Files:**
- Create: `src/main/services/analyzer.ts`
- Create: `src/main/services/analyzer.test.ts`

**Step 1: Write failing test**

Create `src/main/services/analyzer.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { GeminiAnalyzer } from './analyzer'
import type { RawArticle } from '../../shared/types'

// Mock @google/generative-ai
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      constructor() {}
      getGenerativeModel() {
        return {
          generateContent: vi.fn().mockResolvedValue({
            response: {
              text: () => JSON.stringify({
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
            }
          })
        }
      }
    }
  }
})

describe('GeminiAnalyzer', () => {
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
    const analyzer = new GeminiAnalyzer('fake-api-key')
    const result = await analyzer.analyze(articles, ['AI Agent', 'UX Design'])

    expect(result.trends.length).toBeGreaterThan(0)
    expect(result.insights.length).toBeGreaterThan(0)
    expect(result.actions.length).toBeGreaterThan(0)
    expect(result.trends[0].text).toContain('AI agent')
  })

  it('returns empty result for empty articles', async () => {
    const analyzer = new GeminiAnalyzer('fake-api-key')
    const result = await analyzer.analyze([], ['AI'])

    expect(result.trends).toEqual([])
    expect(result.insights).toEqual([])
    expect(result.actions).toEqual([])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/main/services/analyzer.test.ts`
Expected: FAIL

**Step 3: Implement Gemini analyzer**

Create `src/main/services/analyzer.ts`:

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/main/services/analyzer.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/main/services/analyzer.ts src/main/services/analyzer.test.ts
git commit -m "feat: add Gemini analyzer for article summarization and insight generation"
```

---

### Task 7: Research Orchestrator (TDD)

**Files:**
- Create: `src/main/services/orchestrator.ts`
- Create: `src/main/services/orchestrator.test.ts`

**Step 1: Write failing test**

Create `src/main/services/orchestrator.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { ResearchOrchestrator } from './orchestrator'

// Mock dependencies
vi.mock('./rss-collector', () => ({
  RssCollector: class {
    async collect() {
      return [
        { title: 'Article A', url: 'https://a.com', source: 'rss', sourceName: 'RSS', summary: 'A', publishedAt: '2026-02-27T09:00:00Z' },
        { title: 'Article B', url: 'https://b.com', source: 'rss', sourceName: 'RSS', summary: 'B', publishedAt: '2026-02-27T09:00:00Z' }
      ]
    }
  }
}))

vi.mock('./hn-collector', () => ({
  HackerNewsCollector: class {
    async collect() {
      return [
        { title: 'Article C', url: 'https://a.com', source: 'hackernews', sourceName: 'HN', summary: 'C', publishedAt: '2026-02-27T09:00:00Z' }
      ]
    }
  }
}))

vi.mock('./analyzer', () => ({
  GeminiAnalyzer: class {
    async analyze(articles: any[]) {
      return {
        trends: [{ text: `Analyzed ${articles.length} articles`, relatedUrls: [] }],
        insights: [{ title: 'Insight', body: 'Body', relatedUrls: [] }],
        actions: [{ text: 'Action', category: 'study' }]
      }
    }
  }
}))

describe('ResearchOrchestrator', () => {
  it('collects from all sources, deduplicates by URL, and analyzes', async () => {
    const orchestrator = new ResearchOrchestrator('fake-key')
    const config = {
      rssSources: [{ name: 'Test', url: 'https://test.com/feed', enabled: true }],
      keywords: ['AI']
    }

    const result = await orchestrator.run(config as any)

    // https://a.com appears in both RSS and HN → deduplicated to 2 articles
    expect(result.rawArticles.length).toBe(2)
    expect(result.trends[0].text).toBe('Analyzed 2 articles')
    expect(result.date).toBe(new Date().toISOString().split('T')[0])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/main/services/orchestrator.test.ts`
Expected: FAIL

**Step 3: Implement orchestrator**

Create `src/main/services/orchestrator.ts`:

```typescript
import { RssCollector } from './rss-collector'
import { HackerNewsCollector } from './hn-collector'
import { GeminiAnalyzer } from './analyzer'
import type { AppConfig, RawArticle, ResearchResult } from '../../shared/types'

export class ResearchOrchestrator {
  private rssCollector: RssCollector
  private hnCollector: HackerNewsCollector
  private analyzer: GeminiAnalyzer

  constructor(apiKey: string) {
    this.rssCollector = new RssCollector()
    this.hnCollector = new HackerNewsCollector()
    this.analyzer = new GeminiAnalyzer(apiKey)
  }

  async run(config: AppConfig): Promise<ResearchResult> {
    // 1. Collect from all sources in parallel
    const [rssArticles, hnArticles] = await Promise.all([
      this.rssCollector.collect(config.rssSources),
      this.hnCollector.collect(config.keywords)
    ])

    // 2. Merge and deduplicate by URL
    const allArticles = [...rssArticles, ...hnArticles]
    const seen = new Set<string>()
    const uniqueArticles: RawArticle[] = []
    for (const article of allArticles) {
      if (!seen.has(article.url)) {
        seen.add(article.url)
        uniqueArticles.push(article)
      }
    }

    // 3. Analyze with Gemini
    const analysis = await this.analyzer.analyze(uniqueArticles, config.keywords)

    // 4. Build result
    const today = new Date().toISOString().split('T')[0]
    return {
      date: today,
      generatedAt: new Date().toISOString(),
      rawArticles: uniqueArticles,
      ...analysis
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/main/services/orchestrator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/services/orchestrator.ts src/main/services/orchestrator.test.ts
git commit -m "feat: add research orchestrator with collection, dedup, and analysis"
```

---

### Task 8: Electron Main Process + Tray + Scheduler

**Files:**
- Modify: `src/main/index.ts`
- Create: `src/main/tray.ts`
- Create: `src/main/scheduler.ts`
- Modify: `src/preload/index.ts`

**Step 1: Update preload with IPC channels**

Update `src/preload/index.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  getResearch: (date: string) => Promise<any>
  getTodayResearch: () => Promise<any>
  getResearchDates: () => Promise<string[]>
  getConfig: () => Promise<any>
  saveConfig: (config: any) => Promise<void>
  runResearchNow: () => Promise<void>
  onResearchComplete: (callback: (result: any) => void) => () => void
}

contextBridge.exposeInMainWorld('api', {
  getResearch: (date: string) => ipcRenderer.invoke('get-research', date),
  getTodayResearch: () => ipcRenderer.invoke('get-today-research'),
  getResearchDates: () => ipcRenderer.invoke('get-research-dates'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  runResearchNow: () => ipcRenderer.invoke('run-research-now'),
  onResearchComplete: (callback: (result: any) => void) => {
    const handler = (_event: any, result: any) => callback(result)
    ipcRenderer.on('research-complete', handler)
    return () => ipcRenderer.removeListener('research-complete', handler)
  }
})
```

**Step 2: Create scheduler**

Create `src/main/scheduler.ts`:

```typescript
import cron from 'node-cron'
import type { ScheduledTask } from 'node-cron'

export class Scheduler {
  private task: ScheduledTask | null = null

  start(hour: number, minute: number, callback: () => void): void {
    this.stop()
    const cronExpr = `${minute} ${hour} * * *`
    this.task = cron.schedule(cronExpr, callback)
  }

  stop(): void {
    if (this.task) {
      this.task.stop()
      this.task = null
    }
  }

  reschedule(hour: number, minute: number, callback: () => void): void {
    this.start(hour, minute, callback)
  }
}
```

**Step 3: Create tray manager**

Create `src/main/tray.ts`:

```typescript
import { Tray, Menu, nativeImage, BrowserWindow } from 'electron'
import path from 'path'

export class TrayManager {
  private tray: Tray | null = null

  create(window: BrowserWindow, onRunNow: () => void): void {
    // 16x16 simple icon (will create proper icon later)
    const icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4xNkREWWUAAABJSURBVDhPY/hPIWBgYGD4T6YZDDAMN+D/f4IAEP+nGAOyATDBYBjgMACbIfjkCLoBRkZG+A1A1kzIBYRcgK4Z3QBCLiDkAgYGABwMHTGTBcGsAAAAAElFTkSuQmCC'
    )

    this.tray = new Tray(icon.resize({ width: 16, height: 16 }))

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show Widget', click: () => window.show() },
      { label: 'Run Research Now', click: onRunNow },
      { type: 'separator' },
      { label: 'Quit', click: () => { window.destroy(); process.exit(0) } }
    ])

    this.tray.setToolTip('AI Research Widget')
    this.tray.setContextMenu(contextMenu)
    this.tray.on('click', () => {
      window.isVisible() ? window.hide() : window.show()
    })
  }
}
```

**Step 4: Update main process with full IPC + scheduler + tray**

Rewrite `src/main/index.ts`:

```typescript
import { app, BrowserWindow, ipcMain, Notification } from 'electron'
import path from 'path'
import os from 'os'
import { StorageService } from './services/storage'
import { ResearchOrchestrator } from './services/orchestrator'
import { Scheduler } from './scheduler'
import { TrayManager } from './tray'

const DATA_PATH = path.join(os.homedir(), 'ai-research-widget')
const storage = new StorageService(DATA_PATH)
const scheduler = new Scheduler()
const trayManager = new TrayManager()

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 520,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Position bottom-right
  const { screen } = require('electron')
  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize
  mainWindow.setPosition(width - 400, height - 540)

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

async function runResearch(): Promise<void> {
  const config = storage.loadConfig()
  if (!config.geminiApiKey) {
    mainWindow?.webContents.send('research-complete', null)
    return
  }

  try {
    const orchestrator = new ResearchOrchestrator(config.geminiApiKey)
    const result = await orchestrator.run(config)
    storage.saveResearch(result)

    mainWindow?.webContents.send('research-complete', result)

    if (config.notificationEnabled) {
      new Notification({
        title: '오늘의 AI 리서치 도착',
        body: result.trends[0]?.text || '새로운 리서치가 준비되었습니다.'
      }).show()
    }
  } catch (error) {
    console.error('Research failed:', error)
  }
}

function setupIPC(): void {
  ipcMain.handle('get-research', (_e, date: string) => storage.loadResearch(date))
  ipcMain.handle('get-today-research', () => {
    const today = new Date().toISOString().split('T')[0]
    return storage.loadResearch(today)
  })
  ipcMain.handle('get-research-dates', () => storage.listResearchDates())
  ipcMain.handle('get-config', () => storage.loadConfig())
  ipcMain.handle('save-config', (_e, config) => {
    storage.saveConfig(config)
    // Reschedule with new time
    scheduler.reschedule(config.scheduleHour, config.scheduleMinute, runResearch)
  })
  ipcMain.handle('run-research-now', () => runResearch())
}

app.whenReady().then(() => {
  createWindow()
  setupIPC()

  const config = storage.loadConfig()
  scheduler.start(config.scheduleHour, config.scheduleMinute, runResearch)
  trayManager.create(mainWindow!, runResearch)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  mainWindow?.show()
})
```

**Step 5: Run dev to verify the app starts**

Run: `npm run dev`
Expected: Electron window opens at bottom-right, tray icon appears, no errors in console.

**Step 6: Commit**

```bash
git add src/main/ src/preload/
git commit -m "feat: add Electron main process with scheduler, tray, and IPC"
```

---

### Task 9: UI - Widget Layout and Header

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Create: `src/renderer/src/components/Header.tsx`
- Create: `src/renderer/src/hooks/useResearch.ts`

**Step 1: Create useResearch hook**

Create `src/renderer/src/hooks/useResearch.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react'

declare global {
  interface Window {
    api: {
      getResearch: (date: string) => Promise<any>
      getTodayResearch: () => Promise<any>
      getResearchDates: () => Promise<string[]>
      getConfig: () => Promise<any>
      saveConfig: (config: any) => Promise<void>
      runResearchNow: () => Promise<void>
      onResearchComplete: (callback: (result: any) => void) => () => void
    }
  }
}

export function useResearch() {
  const [research, setResearch] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split('T')[0])

  const loadResearch = useCallback(async (date: string) => {
    setLoading(true)
    const result = await window.api.getResearch(date)
    setResearch(result)
    setCurrentDate(date)
    setLoading(false)
  }, [])

  const runNow = useCallback(async () => {
    setLoading(true)
    await window.api.runResearchNow()
  }, [])

  useEffect(() => {
    window.api.getTodayResearch().then(result => {
      setResearch(result)
      setLoading(false)
    })

    const cleanup = window.api.onResearchComplete(result => {
      if (result) {
        setResearch(result)
        setCurrentDate(result.date)
      }
      setLoading(false)
    })

    return cleanup
  }, [])

  return { research, loading, currentDate, loadResearch, runNow }
}
```

**Step 2: Create Header component**

Create `src/renderer/src/components/Header.tsx`:

```tsx
interface HeaderProps {
  currentDate: string
  generatedAt?: string
  onSettingsClick: () => void
  onRefresh: () => void
  loading: boolean
}

export default function Header({ currentDate, generatedAt, onSettingsClick, onRefresh, loading }: HeaderProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} (${days[date.getDay()]})`
  }

  const formatTime = (isoStr?: string) => {
    if (!isoStr) return ''
    const date = new Date(isoStr)
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className={`text-sm ${loading ? 'animate-spin' : 'hover:opacity-70'} transition`}
          >
            &#x27F3;
          </button>
          <h1 className="text-base font-bold text-white">AI Research Daily</h1>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatDate(currentDate)}
          {generatedAt && ` ${formatTime(generatedAt)}`}
        </p>
      </div>
      <button
        onClick={onSettingsClick}
        className="text-gray-400 hover:text-white text-lg transition"
      >
        &#x2699;
      </button>
    </div>
  )
}
```

**Step 3: Update App.tsx with layout**

Rewrite `src/renderer/src/App.tsx`:

```tsx
import { useState } from 'react'
import Header from './components/Header'
import { useResearch } from './hooks/useResearch'

export default function App() {
  const { research, loading, currentDate, runNow } = useResearch()
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="h-screen w-screen rounded-2xl bg-gray-950/95 backdrop-blur-xl text-white p-4 flex flex-col overflow-hidden border border-white/10">
      <Header
        currentDate={currentDate}
        generatedAt={research?.generatedAt}
        onSettingsClick={() => setShowSettings(!showSettings)}
        onRefresh={runNow}
        loading={loading}
      />

      <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin">
        {loading && !research && (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            리서치를 불러오는 중...
          </div>
        )}

        {!loading && !research && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm gap-2">
            <p>아직 리서치 데이터가 없습니다.</p>
            <p className="text-xs">설정에서 API Key를 입력하고 수동 실행해보세요.</p>
          </div>
        )}

        {research && (
          <>
            {/* TrendSummary, InsightCards, ActionItems will go here */}
            <p className="text-xs text-gray-500">Trends: {research.trends?.length || 0}</p>
          </>
        )}
      </div>
    </div>
  )
}
```

**Step 4: Run dev to verify**

Run: `npm run dev`
Expected: Widget shows header with date, settings gear, refresh button.

**Step 5: Commit**

```bash
git add src/renderer/
git commit -m "feat: add widget layout with Header component and useResearch hook"
```

---

### Task 10: UI - Content Components

**Files:**
- Create: `src/renderer/src/components/TrendSummary.tsx`
- Create: `src/renderer/src/components/InsightCard.tsx`
- Create: `src/renderer/src/components/ActionItems.tsx`
- Create: `src/renderer/src/components/DateNav.tsx`
- Modify: `src/renderer/src/App.tsx`

**Step 1: Create TrendSummary**

Create `src/renderer/src/components/TrendSummary.tsx`:

```tsx
import type { TrendItem } from '../../../../shared/types'

interface Props {
  trends: TrendItem[]
}

export default function TrendSummary({ trends }: Props) {
  if (trends.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold text-blue-400 mb-1.5">&#x1F4CC; 오늘의 핵심 트렌드</h2>
      <ul className="space-y-1">
        {trends.map((trend, i) => (
          <li key={i} className="text-sm text-gray-200 flex gap-2">
            <span className="text-gray-500">&bull;</span>
            <span>{trend.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

**Step 2: Create InsightCard**

Create `src/renderer/src/components/InsightCard.tsx`:

```tsx
import { useState } from 'react'
import type { InsightItem } from '../../../../shared/types'

interface Props {
  insights: InsightItem[]
}

export default function InsightCards({ insights }: Props) {
  if (insights.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold text-yellow-400 mb-1.5">&#x1F4A1; 인사이트</h2>
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <InsightCardItem key={i} insight={insight} />
        ))}
      </div>
    </div>
  )
}

function InsightCardItem({ insight }: { insight: InsightItem }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full text-left bg-white/5 rounded-lg p-3 hover:bg-white/10 transition"
    >
      <div className="flex justify-between items-start">
        <h3 className="text-sm font-medium text-gray-100">{insight.title}</h3>
        <span className="text-gray-500 text-xs ml-2">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="mt-2">
          <p className="text-xs text-gray-300 leading-relaxed">{insight.body}</p>
          {insight.relatedUrls.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {insight.relatedUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline"
                  onClick={e => e.stopPropagation()}
                >
                  [{i + 1}] 원문
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </button>
  )
}
```

**Step 3: Create ActionItems**

Create `src/renderer/src/components/ActionItems.tsx`:

```tsx
import type { ActionItem } from '../../../../shared/types'

interface Props {
  actions: ActionItem[]
}

const categoryEmoji: Record<string, string> = {
  study: '&#x1F4D6;',
  apply: '&#x1F6E0;',
  explore: '&#x1F50D;'
}

const categoryLabel: Record<string, string> = {
  study: '학습',
  apply: '적용',
  explore: '탐색'
}

export default function ActionItems({ actions }: Props) {
  if (actions.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold text-green-400 mb-1.5">&#x1F6E0; 실무 적용 제안</h2>
      <ul className="space-y-1.5">
        {actions.map((action, i) => (
          <li key={i} className="text-sm text-gray-200 flex gap-2 items-start">
            <span
              className="text-xs bg-white/10 rounded px-1.5 py-0.5 shrink-0"
              dangerouslySetInnerHTML={{ __html: `${categoryEmoji[action.category] || ''} ${categoryLabel[action.category] || action.category}` }}
            />
            <span>{action.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

**Step 4: Create DateNav**

Create `src/renderer/src/components/DateNav.tsx`:

```tsx
interface Props {
  currentDate: string
  onDateChange: (date: string) => void
}

export default function DateNav({ currentDate, onDateChange }: Props) {
  const navigate = (days: number) => {
    const date = new Date(currentDate + 'T00:00:00')
    date.setDate(date.getDate() + days)
    onDateChange(date.toISOString().split('T')[0])
  }

  return (
    <div className="flex items-center justify-between pt-2 border-t border-white/10">
      <button
        onClick={() => navigate(-1)}
        className="text-xs text-gray-400 hover:text-white transition px-2 py-1"
      >
        &#9664; 어제
      </button>
      <button
        onClick={() => onDateChange(new Date().toISOString().split('T')[0])}
        className="text-xs text-gray-400 hover:text-white transition px-2 py-1"
      >
        &#x1F4DA; 오늘
      </button>
      <button
        onClick={() => navigate(1)}
        className="text-xs text-gray-400 hover:text-white transition px-2 py-1"
      >
        내일 &#9654;
      </button>
    </div>
  )
}
```

**Step 5: Update App.tsx to wire all components**

Update `src/renderer/src/App.tsx`:

```tsx
import { useState } from 'react'
import Header from './components/Header'
import TrendSummary from './components/TrendSummary'
import InsightCards from './components/InsightCard'
import ActionItems from './components/ActionItems'
import DateNav from './components/DateNav'
import { useResearch } from './hooks/useResearch'

export default function App() {
  const { research, loading, currentDate, loadResearch, runNow } = useResearch()
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="h-screen w-screen rounded-2xl bg-gray-950/95 backdrop-blur-xl text-white p-4 flex flex-col overflow-hidden border border-white/10">
      <Header
        currentDate={currentDate}
        generatedAt={research?.generatedAt}
        onSettingsClick={() => setShowSettings(!showSettings)}
        onRefresh={runNow}
        loading={loading}
      />

      <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin pr-1">
        {loading && !research && (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            리서치를 불러오는 중...
          </div>
        )}

        {!loading && !research && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm gap-2">
            <p>아직 리서치 데이터가 없습니다.</p>
            <p className="text-xs">설정에서 API Key를 입력하고 수동 실행해보세요.</p>
          </div>
        )}

        {research && (
          <>
            <TrendSummary trends={research.trends || []} />
            <InsightCards insights={research.insights || []} />
            <ActionItems actions={research.actions || []} />
          </>
        )}
      </div>

      <DateNav currentDate={currentDate} onDateChange={loadResearch} />
    </div>
  )
}
```

**Step 6: Run dev to verify**

Run: `npm run dev`
Expected: Widget shows all sections. Without data, shows empty state message.

**Step 7: Commit**

```bash
git add src/renderer/
git commit -m "feat: add TrendSummary, InsightCard, ActionItems, DateNav components"
```

---

### Task 11: UI - Settings Screen

**Files:**
- Create: `src/renderer/src/components/Settings.tsx`
- Modify: `src/renderer/src/App.tsx`

**Step 1: Create Settings component**

Create `src/renderer/src/components/Settings.tsx`:

```tsx
import { useState, useEffect } from 'react'
import type { AppConfig, RssSource } from '../../../../shared/types'

interface Props {
  onBack: () => void
  onRunNow: () => void
}

export default function Settings({ onBack, onRunNow }: Props) {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [newKeyword, setNewKeyword] = useState('')
  const [newRssName, setNewRssName] = useState('')
  const [newRssUrl, setNewRssUrl] = useState('')

  useEffect(() => {
    window.api.getConfig().then(setConfig)
  }, [])

  const save = async (updated: Partial<AppConfig>) => {
    if (!config) return
    const newConfig = { ...config, ...updated }
    setConfig(newConfig)
    await window.api.saveConfig(newConfig)
  }

  if (!config) return <div className="text-gray-500 text-sm">로딩 중...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-sm">&larr;</button>
        <h2 className="text-base font-bold">설정</h2>
      </div>

      {/* Schedule */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">&#x23F0; 리서치 시간</label>
        <div className="flex gap-2 items-center">
          <input
            type="number" min={0} max={23}
            value={config.scheduleHour}
            onChange={e => save({ scheduleHour: Number(e.target.value) })}
            className="w-14 bg-white/10 rounded px-2 py-1 text-sm text-white"
          />
          <span className="text-gray-400">시</span>
          <input
            type="number" min={0} max={59}
            value={config.scheduleMinute}
            onChange={e => save({ scheduleMinute: Number(e.target.value) })}
            className="w-14 bg-white/10 rounded px-2 py-1 text-sm text-white"
          />
          <span className="text-gray-400">분</span>
        </div>
      </div>

      {/* API Key */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">&#x1F511; Gemini API Key</label>
        <input
          type="password"
          value={config.geminiApiKey}
          onChange={e => save({ geminiApiKey: e.target.value })}
          placeholder="API Key 입력"
          className="w-full bg-white/10 rounded px-2 py-1.5 text-sm text-white placeholder-gray-600"
        />
      </div>

      {/* RSS Sources */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">&#x1F4E1; RSS 소스</label>
        <div className="space-y-1">
          {config.rssSources.map((source, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={source.enabled}
                onChange={e => {
                  const updated = [...config.rssSources]
                  updated[i] = { ...source, enabled: e.target.checked }
                  save({ rssSources: updated })
                }}
                className="rounded"
              />
              <span className="text-xs text-gray-300 flex-1">{source.name}</span>
              <button
                onClick={() => {
                  const updated = config.rssSources.filter((_, j) => j !== i)
                  save({ rssSources: updated })
                }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                &#x2715;
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-2">
          <input
            value={newRssName}
            onChange={e => setNewRssName(e.target.value)}
            placeholder="이름"
            className="flex-1 bg-white/10 rounded px-2 py-1 text-xs text-white placeholder-gray-600"
          />
          <input
            value={newRssUrl}
            onChange={e => setNewRssUrl(e.target.value)}
            placeholder="RSS URL"
            className="flex-[2] bg-white/10 rounded px-2 py-1 text-xs text-white placeholder-gray-600"
          />
          <button
            onClick={() => {
              if (newRssName && newRssUrl) {
                save({ rssSources: [...config.rssSources, { name: newRssName, url: newRssUrl, enabled: true }] })
                setNewRssName('')
                setNewRssUrl('')
              }
            }}
            className="text-xs text-blue-400 hover:text-blue-300 px-2"
          >
            +
          </button>
        </div>
      </div>

      {/* Keywords */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">&#x1F3F7; 관심 키워드</label>
        <div className="flex flex-wrap gap-1 mb-1">
          {config.keywords.map((kw, i) => (
            <span key={i} className="bg-white/10 rounded-full px-2 py-0.5 text-xs text-gray-300 flex items-center gap-1">
              {kw}
              <button
                onClick={() => save({ keywords: config.keywords.filter((_, j) => j !== i) })}
                className="text-red-400 hover:text-red-300"
              >
                &#x2715;
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newKeyword) {
                save({ keywords: [...config.keywords, newKeyword] })
                setNewKeyword('')
              }
            }}
            placeholder="키워드 추가 (Enter)"
            className="flex-1 bg-white/10 rounded px-2 py-1 text-xs text-white placeholder-gray-600"
          />
        </div>
      </div>

      {/* Notification */}
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400">&#x1F514; macOS 알림</label>
        <button
          onClick={() => save({ notificationEnabled: !config.notificationEnabled })}
          className={`w-10 h-5 rounded-full transition ${config.notificationEnabled ? 'bg-blue-500' : 'bg-gray-600'} relative`}
        >
          <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition ${config.notificationEnabled ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      {/* Manual Run */}
      <button
        onClick={onRunNow}
        className="w-full bg-blue-600 hover:bg-blue-500 rounded-lg py-2 text-sm font-medium transition"
      >
        &#x25B6; 수동 리서치 실행
      </button>
    </div>
  )
}
```

**Step 2: Update App.tsx to toggle Settings**

Update `src/renderer/src/App.tsx` — wrap content in conditional:

```tsx
import { useState } from 'react'
import Header from './components/Header'
import TrendSummary from './components/TrendSummary'
import InsightCards from './components/InsightCard'
import ActionItems from './components/ActionItems'
import DateNav from './components/DateNav'
import Settings from './components/Settings'
import { useResearch } from './hooks/useResearch'

export default function App() {
  const { research, loading, currentDate, loadResearch, runNow } = useResearch()
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="h-screen w-screen rounded-2xl bg-gray-950/95 backdrop-blur-xl text-white p-4 flex flex-col overflow-hidden border border-white/10">
      {showSettings ? (
        <Settings onBack={() => setShowSettings(false)} onRunNow={runNow} />
      ) : (
        <>
          <Header
            currentDate={currentDate}
            generatedAt={research?.generatedAt}
            onSettingsClick={() => setShowSettings(true)}
            onRefresh={runNow}
            loading={loading}
          />

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loading && !research && (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                리서치를 불러오는 중...
              </div>
            )}

            {!loading && !research && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm gap-2">
                <p>아직 리서치 데이터가 없습니다.</p>
                <p className="text-xs">설정에서 API Key를 입력하고 수동 실행해보세요.</p>
              </div>
            )}

            {research && (
              <>
                <TrendSummary trends={research.trends || []} />
                <InsightCards insights={research.insights || []} />
                <ActionItems actions={research.actions || []} />
              </>
            )}
          </div>

          <DateNav currentDate={currentDate} onDateChange={loadResearch} />
        </>
      )}
    </div>
  )
}
```

**Step 3: Run dev to verify**

Run: `npm run dev`
Expected: Settings gear opens settings screen, back arrow returns to main view.

**Step 4: Commit**

```bash
git add src/renderer/
git commit -m "feat: add Settings screen with config management"
```

---

### Task 12: Integration Testing & Polish

**Files:**
- Modify: `src/renderer/src/index.css` (scrollbar styling)
- Verify all IPC channels work end-to-end

**Step 1: Add scrollbar styling**

Update `src/renderer/src/index.css` — add:

```css
@import "tailwindcss";

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: transparent;
  -webkit-app-region: drag;
}

button, a, input, select, textarea {
  -webkit-app-region: no-drag;
}

::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
```

**Step 2: Run all unit tests**

Run: `npx vitest run`
Expected: All tests pass (storage, rss-collector, hn-collector, analyzer, orchestrator)

**Step 3: Manual integration test**

Run: `npm run dev`
Test flow:
1. App opens → empty state visible
2. Open settings → enter Gemini API key
3. Click "수동 리서치 실행"
4. Wait for results to appear
5. Verify trends, insights, actions display correctly
6. Navigate dates with arrows
7. macOS notification appears
8. Tray icon click toggles widget

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: polish UI styling and verify integration"
```

---

### Task 13: Build & Package

**Files:**
- Create: `electron-builder.yml`
- Update: `package.json` build config

**Step 1: Create electron-builder config**

Create `electron-builder.yml`:

```yaml
appId: com.ai-research-widget.app
productName: AI Research Widget
directories:
  buildResources: build
  output: dist
mac:
  category: public.app-category.productivity
  target:
    - dmg
    - zip
dmg:
  artifactName: ${name}-${version}.${ext}
```

**Step 2: Add build script to package.json**

```json
{
  "scripts": {
    "build:mac": "electron-vite build && electron-builder --mac"
  }
}
```

**Step 3: Build**

Run: `npm run build:mac`
Expected: .dmg file created in `dist/` folder

**Step 4: Commit**

```bash
git add electron-builder.yml package.json
git commit -m "feat: add electron-builder config for macOS packaging"
```

---

## Summary

| Task | Description | Est. Steps |
|------|-------------|-----------|
| 1 | Project Scaffolding | 8 |
| 2 | TypeScript Types | 2 |
| 3 | Storage Service (TDD) | 5 |
| 4 | RSS Collector (TDD) | 5 |
| 5 | Hacker News Collector (TDD) | 5 |
| 6 | Gemini Analyzer (TDD) | 5 |
| 7 | Research Orchestrator (TDD) | 5 |
| 8 | Electron Main + Tray + Scheduler | 6 |
| 9 | UI - Layout + Header | 5 |
| 10 | UI - Content Components | 7 |
| 11 | UI - Settings Screen | 4 |
| 12 | Integration Testing & Polish | 4 |
| 13 | Build & Package | 4 |
| **Total** | | **65 steps** |
