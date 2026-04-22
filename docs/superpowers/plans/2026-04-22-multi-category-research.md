# Multi-Category Research Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split single research pipeline into per-category independent runs with top-level category tabs in the UI and a single daily summary notification surfacing the most-important issue.

**Architecture:** New `MultiCategoryOrchestrator` fans out to one `ResearchOrchestrator.run()` per `Category`, then passes the N results to a new `TopIssuePicker` (extra AI call) for the day's headline. Config shape migrates from `keywords: string[]` to `categories: Category[]`; pre-existing research sessions default to a `Legacy` category.

**Tech Stack:** TypeScript, Electron 40, React 19, electron-vite, vitest, Tailwind, rss-parser, Claude/Gemini CLI.

**Spec:** `docs/superpowers/specs/2026-04-22-multi-category-research-design.md`

---

## Chunk 1: Shared types + storage migration

### Task 1: Add `Category`, `TopIssue` types; modify `AppConfig`, `ResearchResult`

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Edit types**

Replace `keywords: string[]` with `categories: Category[]` in `AppConfig`. Add `category: string` field to `ResearchResult`. Add new `Category` and `TopIssue` interfaces.

```ts
export interface Category {
  name: string
  keywords: string[]
}

export interface TopIssue {
  categoryName: string
  headline: string
  body: string
}
```

Update `AppConfig`: remove `keywords: string[]`, add `categories: Category[]`.
Update `ResearchResult`: add `category: string` (required).

- [ ] **Step 2: Verify typecheck compiles (expect errors in dependent files)**

Run: `cd /Users/spring.lee/dev/pringsearch && npx tsc --noEmit 2>&1 | head -40`
Expected: compile errors in files referencing `config.keywords` — this is OK; fixed in later tasks.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat(types): add Category, TopIssue; migrate AppConfig.categories and ResearchResult.category"
```

---

### Task 2: Migrate `storage.loadConfig` and `storage.loadResearch`

**Files:**
- Modify: `src/main/services/storage.ts`
- Modify: `src/main/services/storage.test.ts`

- [ ] **Step 1: Write failing tests**

Add these test cases to `storage.test.ts`:
1. `migrateConfig: flat keywords → matched preset categories + Custom bucket for unmatched`
2. `migrateConfig: already-migrated config passes through untouched`
3. `migrateConfig: empty/missing categories yields empty array (no crash)`
4. `loadResearch: legacy record without category gets category = 'Legacy'`

Mock fs reads using vitest's existing pattern from `storage.test.ts`. Use the onboarding preset list (copied into storage.ts as private const or imported from a shared constants file) for matching.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/spring.lee/dev/pringsearch && npx vitest run src/main/services/storage.test.ts`
Expected: 4 new tests FAIL (no migration logic yet).

- [ ] **Step 3: Implement `migrateConfig` and research migration**

In `storage.ts`:

```ts
const ONBOARDING_PRESETS: Category[] = [
  { name: 'AI Agent', keywords: ['AI Agent', 'LLM', 'AI Coding', 'Generative AI'] },
  { name: 'UX Design', keywords: ['UX Design', 'Design System', 'Generative UI', 'AI Design Tools'] },
  { name: 'Product', keywords: ['Product Management', 'Growth', 'User Research', 'A/B Test'] },
  { name: 'Startup', keywords: ['Startup', 'SaaS', 'Fundraising', 'AI Business'] },
  { name: 'Marketing', keywords: ['AI Marketing', 'Content AI', 'Growth Hacking', 'SEO'] },
  { name: 'Web3', keywords: ['Stablecoin', 'DeFi', 'Web3', 'Fintech'] },
]

function migrateConfig(raw: any): AppConfig {
  if (Array.isArray(raw.categories)) return raw as AppConfig
  const legacyKeywords: string[] = Array.isArray(raw.keywords) ? raw.keywords : []
  const matched: Category[] = []
  const claimed = new Set<string>()
  for (const preset of ONBOARDING_PRESETS) {
    const hit = preset.keywords.filter(k => legacyKeywords.includes(k))
    if (hit.length > 0) {
      matched.push({ name: preset.name, keywords: hit })
      hit.forEach(k => claimed.add(k))
    }
  }
  const custom = legacyKeywords.filter(k => !claimed.has(k))
  if (custom.length > 0) matched.push({ name: 'Custom', keywords: custom })
  const { keywords: _drop, ...rest } = raw
  return { ...rest, categories: matched }
}
```

In `loadResearch`, after parsing each record:
```ts
result.category ??= 'Legacy'
```

Export `migrateConfig` for testing. `loadConfig` wraps read with migrate.

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/main/services/storage.test.ts`
Expected: all storage tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/services/storage.ts src/main/services/storage.test.ts
git commit -m "feat(storage): migrate config.keywords → categories and default Legacy on load"
```

---

## Chunk 2: Orchestrator single-category refactor

### Task 3: Change `ResearchOrchestrator.run` signature to take a Category

**Files:**
- Modify: `src/main/services/orchestrator.ts`
- Modify: `src/main/services/orchestrator.test.ts`

- [ ] **Step 1: Update tests first**

Change `orchestrator.test.ts` so every call to `orchestrator.run(config, ...)` now passes a `category: Category` as the second arg. Test that the returned result has `.category === category.name`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/main/services/orchestrator.test.ts`
Expected: test signature mismatch failures.

- [ ] **Step 3: Refactor `run()`**

```ts
async run(config: AppConfig, category: Category, existingResults?: ResearchResult[]): Promise<ResearchResult> {
  const fetchDays = config.fetchPeriodDays || 7
  const keywords = category.keywords
  const [rssArticles, hnArticles] = await Promise.all([
    this.rssCollector.collect(config.rssSources, fetchDays),
    this.hnCollector.collect(keywords)
  ])
  // ... existing dedupe logic unchanged ...
  const analysis = await this.analyzer.analyze(articlesToAnalyze, keywords, existingTrends, existingInsights, existingActions)
  return {
    date: today,
    generatedAt: new Date().toISOString(),
    category: category.name,   // NEW
    rawArticles: articlesToAnalyze,
    ...analysis,
  }
}
```

RSS collector still receives `config.rssSources` (global); only `keywords` narrows to category.

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/main/services/orchestrator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/services/orchestrator.ts src/main/services/orchestrator.test.ts
git commit -m "refactor(orchestrator): scope run() to a single Category"
```

---

## Chunk 3: TopIssuePicker

### Task 4: New service `top-issue-picker.ts` + tests

**Files:**
- Create: `src/main/services/top-issue-picker.ts`
- Create: `src/main/services/top-issue-picker.test.ts`

- [ ] **Step 1: Write failing tests**

`top-issue-picker.test.ts`:
1. Happy path: given 3 results with non-empty `trendHeadline`/`trends`, AI returns JSON `{categoryName, headline, body}`, picker returns typed `TopIssue`.
2. AI returns unparseable text → fallback to `results[0].trends[0].text` + `results[0].category`.
3. Empty results array → throws or returns an explicit "no results" TopIssue (implementer decides; test pins behavior).

Mock `ClaudeAnalyzer.callAi` (or the bare `runCli`/`callGpt`) with vi.fn returning a canned string.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/main/services/top-issue-picker.test.ts`
Expected: module-not-found.

- [ ] **Step 3: Implement `TopIssuePicker`**

```ts
import type { ResearchResult, TopIssue } from '../../shared/types'
import { ClaudeAnalyzer } from './analyzer'

export class TopIssuePicker {
  constructor(private analyzer: ClaudeAnalyzer) {}

  async pick(results: ResearchResult[]): Promise<TopIssue> {
    if (results.length === 0) throw new Error('No results to pick from')
    const summaries = results.map(r =>
      `카테고리: ${r.category}\nTrend: ${r.trendHeadline}\nInsight: ${r.insightHeadline}`
    ).join('\n\n')
    const prompt = `다음은 ${results.length}개 카테고리의 오늘 리서치 요약이야. 이 중 가장 임팩트 큰 이슈 1개를 JSON으로 답해. 형식: {"categoryName":"...","headline":"...","body":"..."}\n\n${summaries}`
    try {
      const text = await this.analyzer.callAi(prompt)
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('no json')
      const parsed = JSON.parse(match[0])
      if (!parsed.categoryName || !parsed.headline) throw new Error('missing fields')
      return parsed
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
```

Note: `ClaudeAnalyzer.callAi` is currently private — expose it as public, or extract a shared helper. Check current visibility before implementing.

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/main/services/top-issue-picker.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/services/top-issue-picker.ts src/main/services/top-issue-picker.test.ts src/main/services/analyzer.ts
git commit -m "feat(top-issue-picker): AI picks daily headline across categories"
```

---

## Chunk 4: MultiCategoryOrchestrator

### Task 5: New service + tests

**Files:**
- Create: `src/main/services/multi-category-orchestrator.ts`
- Create: `src/main/services/multi-category-orchestrator.test.ts`

- [ ] **Step 1: Write failing tests**

1. 3 categories, all succeed → returns 3 results + TopIssue.
2. 1 of 3 categories throws → `allSettled` drops it; returns 2 results + TopIssue from those 2.
3. All categories fail → throws (propagates to caller).
4. `existingResultsToday` grouped by category and passed to each orchestrator's `run`.

Mock `ResearchOrchestrator` and `TopIssuePicker`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/main/services/multi-category-orchestrator.test.ts`
Expected: module-not-found.

- [ ] **Step 3: Implement**

```ts
import { ResearchOrchestrator } from './orchestrator'
import { TopIssuePicker } from './top-issue-picker'
import type { AppConfig, Category, ResearchResult, TopIssue } from '../../shared/types'

export class MultiCategoryOrchestrator {
  constructor(
    private orchestrator: ResearchOrchestrator,
    private picker: TopIssuePicker,
  ) {}

  async run(
    config: AppConfig,
    existingByCategory: Record<string, ResearchResult[]> = {},
  ): Promise<{ results: ResearchResult[]; topIssue: TopIssue }> {
    const settled = await Promise.allSettled(
      config.categories.map(cat =>
        this.orchestrator.run(config, cat, existingByCategory[cat.name] || []),
      ),
    )
    const results = settled
      .filter((s): s is PromiseFulfilledResult<ResearchResult> => s.status === 'fulfilled')
      .map(s => s.value)
    if (results.length === 0) throw new Error('All categories failed')
    const topIssue = await this.picker.pick(results)
    return { results, topIssue }
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/main/services/multi-category-orchestrator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/services/multi-category-orchestrator.ts src/main/services/multi-category-orchestrator.test.ts
git commit -m "feat(multi-category-orchestrator): fan out per-category runs with topIssue"
```

---

## Chunk 5: Main process wiring

### Task 6: Update `runResearch` in main/index.ts

**Files:**
- Modify: `src/main/index.ts`

- [ ] **Step 1: Update `runResearch()` body**

Replace the current single-orchestrator pipeline with multi-category:

```ts
const orchestrator = new ResearchOrchestrator(config.anthropicApiKey)
const analyzer = (orchestrator as any).analyzer ?? new ClaudeAnalyzer(config.anthropicApiKey || '')
const picker = new TopIssuePicker(analyzer)
const multi = new MultiCategoryOrchestrator(orchestrator, picker)

// Group existing today sessions by category for dedupe per-category
const existingByCategory: Record<string, ResearchResult[]> = {}
for (const r of existingResults) {
  (existingByCategory[r.category] ||= []).push(r)
}

const { results, topIssue } = await multi.run(config, existingByCategory)

for (const r of results) {
  if (r.trends.length > 0 || r.insights.length > 0) {
    storage.saveResearch(r)
  }
}

mainWindow?.webContents.send('research-complete', { results, topIssue })

if (config.notificationEnabled) {
  const n = new Notification({
    title: '오늘의 리서치 준비 완료',
    body: `[${topIssue.categoryName}] ${topIssue.headline}`,
  })
  n.show()
}
```

Keep `researchRunning` guard and `/tmp/pringsearch.log` logging.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: PASS (or only known renderer-side issues handled later).

- [ ] **Step 3: Commit**

```bash
git add src/main/index.ts
git commit -m "feat(main): runResearch drives MultiCategoryOrchestrator + single-summary notification"
```

---

## Chunk 6: Renderer data layer + CategoryTabs

### Task 7: Update `useResearch` hook to return `sessionsByCategory`

**Files:**
- Modify: `src/renderer/src/hooks/useResearch.ts`

- [ ] **Step 1: Add grouping**

After fetching `sessions`, compute:
```ts
const sessionsByCategory = useMemo(() => {
  const map: Record<string, ResearchResult[]> = {}
  for (const s of sessions) (map[s.category || 'Legacy'] ||= []).push(s)
  return map
}, [sessions])

const categories = useMemo(() => Object.keys(sessionsByCategory), [sessionsByCategory])
```

Return both alongside existing fields.

- [ ] **Step 2: Update IPC handler for `research-complete`**

Previously: `payload: ResearchResult | null`
Now: `payload: { results: ResearchResult[], topIssue: TopIssue } | null`
Merge each result into `sessions`.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/hooks/useResearch.ts
git commit -m "feat(hook): useResearch exposes sessionsByCategory"
```

---

### Task 8: Create `CategoryTabs` component

**Files:**
- Create: `src/renderer/src/components/CategoryTabs.tsx`

- [ ] **Step 1: Implement**

```tsx
import type { FC } from 'react'

interface Props {
  categories: string[]
  active: string
  onChange: (name: string) => void
}

export const CategoryTabs: FC<Props> = ({ categories, active, onChange }) => (
  <div
    className="hide-scrollbar"
    style={{
      display: 'flex',
      gap: 4,
      overflowX: 'auto',
      padding: '4px 0',
      flexShrink: 0,
    }}
  >
    {categories.map(name => {
      const isActive = name === active
      return (
        <button
          key={name}
          onClick={() => onChange(name)}
          style={{
            padding: '4px 10px',
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: isActive ? 600 : 400,
            background: isActive ? '#F2F4F6' : 'transparent',
            color: isActive ? '#191F28' : '#6b7280',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s',
          }}
        >
          {name}
        </button>
      )
    })}
  </div>
)
```

Match the visual vocabulary of the existing session-tab buttons in `App.tsx` (same rounded pill, same gray palette).

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/CategoryTabs.tsx
git commit -m "feat(ui): CategoryTabs component"
```

---

### Task 9: Wire CategoryTabs + filter session tabs by category in App.tsx

**Files:**
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Add activeCategory state (persisted)**

```ts
const [activeCategory, setActiveCategory] = useState<string>(() =>
  localStorage.getItem('activeCategory') || ''
)
useEffect(() => { localStorage.setItem('activeCategory', activeCategory) }, [activeCategory])
```

Default to first category on first load:
```ts
useEffect(() => {
  if (!activeCategory && categories.length > 0) setActiveCategory(categories[0])
}, [categories, activeCategory])
```

- [ ] **Step 2: Swap `sessions` for `sessionsByCategory[activeCategory]`**

Wherever `sessions` is currently read for tab rendering, use the filtered array. Rename local var (e.g. `categorySessions`) for clarity.

- [ ] **Step 3: Render `<CategoryTabs>` above the session tab row**

Place inside the glass-panel, above the existing session tab container.

- [ ] **Step 4: Verify in dev**

Run: check that categories show up as tabs, switching filters the session row. (`npm run dev` already running in background.)

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat(ui): category tab row above session tabs"
```

---

## Chunk 7: Onboarding + Settings

### Task 10: Onboarding writes `config.categories`

**Files:**
- Modify: `src/renderer/src/components/Onboarding.tsx`

- [ ] **Step 1: Replace finalization**

Current logic builds a flat `Set<string>` of keywords. Change to building `Category[]`:

```ts
const categories: Category[] = []
for (const preset of selectedPresets) {
  categories.push({ name: preset.title, keywords: [...preset.keywords] })
}
const customKws = /* user-added keywords not from any preset */
if (customKws.length > 0) {
  categories.push({ name: 'Custom', keywords: customKws })
}
await window.api.saveConfig({ ...existingConfig, categories, /* ... */ })
```

- [ ] **Step 2: Remove legacy `keywords: Array.from(...)` line**

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/Onboarding.tsx
git commit -m "feat(onboarding): save config.categories instead of flat keywords"
```

---

### Task 11: Settings edits per-category

**Files:**
- Modify: `src/renderer/src/components/Settings.tsx`

- [ ] **Step 1: Group keyword editor by category**

Render each category name as a section header; inside, list its keywords with ✕ remove buttons and an "add keyword" input.

Add buttons: "add category" (prompt for name) and "remove category" per section.

- [ ] **Step 2: Save writes `categories`**

`saveConfig({ ...config, categories })`.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/Settings.tsx
git commit -m "feat(settings): per-category keyword editor"
```

---

## Chunk 8: Version bump + build + release

### Task 12: Bump to 1.8.0 and verify

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Edit version**

```json
"version": "1.8.0"
```

- [ ] **Step 2: Run full test suite**

Run: `cd /Users/spring.lee/dev/pringsearch && npx vitest run`
Expected: all tests PASS.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Full dev smoke**

- Kill `/Applications/Pringsearch.app` if running
- `npm run dev` should already be running; if not, relaunch
- Manually verify: onboarding flow writes categories; category tabs appear; switching tabs filters sessions; manual run produces a ResearchResult per category; summary notification fires once

- [ ] **Step 5: Commit version bump**

```bash
git add package.json
git commit -m "chore: bump version to 1.8.0"
```

---

### Task 13: Pack + replace installed app + smoke

- [ ] **Step 1: Pack**

Run: `npm run pack`
Expected: `dist/mac-arm64/Pringsearch.app` built.

- [ ] **Step 2: Replace**

```bash
pkill -x Pringsearch 2>/dev/null || true
sleep 1
rm -rf /Applications/Pringsearch.app
ditto /Users/spring.lee/dev/pringsearch/dist/mac-arm64/Pringsearch.app /Applications/Pringsearch.app
open /Applications/Pringsearch.app
```

- [ ] **Step 3: Smoke**

Verify category tabs + summary notification in the packaged build.

---

### Task 14: DMG + GitHub Release

- [ ] **Step 1: Full dist**

Run: `npm run dist`
Expected: `dist/pringsearch-1.8.0.dmg`, `.zip`, `.blockmap`, `latest-mac.yml`.

- [ ] **Step 2: Push and tag**

```bash
git push origin main
git tag v1.8.0
git push origin v1.8.0
```

- [ ] **Step 3: Create release**

```bash
gh release create v1.8.0 \
  --title "v1.8.0" \
  --notes "$(cat <<'EOF'
## 변경 사항

### 주요 기능
- **카테고리별 리서치**: 온보딩에서 선택한 카테고리마다 독립된 리서치가 매일 자동 실행됩니다
- **상단 카테고리 탭**: 카테고리별 탭으로 결과를 분리해 볼 수 있습니다
- **단일 요약 알림**: 모든 카테고리 중 가장 임팩트 큰 이슈 1개로 요약된 알림을 받습니다

### 개선
- 툴팁이 탭에 가려지던 문제 수정
- 앱 배경을 불투명 화이트로 변경 (가독성 향상)

### 마이그레이션
- 기존 리서치 데이터는 "Legacy" 카테고리로 자동 이동합니다
- 기존 키워드는 매칭되는 프리셋 카테고리에 자동 배치됩니다
EOF
)" \
  dist/pringsearch-1.8.0.dmg \
  dist/pringsearch-1.8.0.dmg.blockmap \
  dist/Pringsearch-1.8.0-arm64-mac.zip \
  dist/Pringsearch-1.8.0-arm64-mac.zip.blockmap \
  dist/latest-mac.yml
```

---

## Done Criteria

- All vitest tests pass
- `npx tsc --noEmit` clean
- Dev build: category tabs visible, onboarding writes `categories`, scheduled run produces N results + 1 notification
- `/Applications/Pringsearch.app` v1.8.0 replaces v1.7.1
- GitHub Release v1.8.0 published with DMG+zip+`latest-mac.yml`
- `docs/superpowers/specs/2026-04-22-multi-category-research-design.md` committed
