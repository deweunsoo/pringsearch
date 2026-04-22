# Multi-Category Research Design

**Date:** 2026-04-22
**Status:** Draft
**Author:** spring.lee + Claude

## Summary

Pringsearch currently runs a **single research pipeline per execution** using a flat `config.keywords` array. This spec introduces **category-scoped research**: the user's onboarding categories (e.g. "AI Agent", "UX Design") each drive an independent research run with its own keywords, sessions, trends, insights, and actions. The UI gains a top-level category tab row above the existing session tabs, and the daily notification summarizes all categories with the single most-important issue surfaced.

## Goals

- Each onboarding category produces its own independent research stream
- Scheduled runs execute all categories in parallel; partial failure is tolerated
- UI: top-level **category tabs** sit above the existing session tabs; selecting a category filters session tabs to that category's sessions
- Single summary notification per scheduled run, highlighting the AI-selected top issue across categories
- Existing pre-spec data preserved in a `Legacy` category (no destructive migration)

## Non-Goals

- Body extraction of article content (covered by a separate, paused spec — will be layered on top of this design in a later iteration)
- Per-category AI provider/model overrides
- Per-category scheduling
- Cross-category trend clustering

## User Flow

1. User opens onboarding → selects preset categories (AI Agent, UX Design, etc.) + optional custom keywords
2. Onboarding writes `config.categories: Category[]` (custom keywords land in a `Custom` category)
3. At scheduled time (or manual run), `MultiCategoryOrchestrator` runs each category's `ResearchOrchestrator` in parallel
4. `TopIssuePicker` (1 extra AI call on category headlines) chooses the day's highest-impact issue
5. Results saved per-category to storage with the same date; single notification fires with top-issue headline
6. UI shows category tabs at top (selected category persists across app opens); session tabs below show only the active category's sessions for the current date

## Architecture

```
runResearch()  [main/index.ts]
    ↓
MultiCategoryOrchestrator.run(config, existingResultsToday)
    ├─ Promise.allSettled:
    │    config.categories.map(cat => orchestrator.run(config, cat, existingResultsToday[cat.name]))
    │    → ResearchResult[] (one per successful category, each tagged with .category)
    │
    └─ TopIssuePicker.pick(results)
         → TopIssue { categoryName, headline, body }
    ↓
{ results: ResearchResult[], topIssue: TopIssue }
    ↓
for each result: storage.saveResearch(result)   (existing API, per-category row)
    ↓
Single notification:  title = "오늘의 리서치 준비 완료"
                       body  = topIssue.headline
    ↓
IPC 'research-complete' carries results + topIssue to renderer
```

## Components

### New

| File | Purpose | Key Interface |
|---|---|---|
| `src/main/services/multi-category-orchestrator.ts` | Orchestrates N per-category `ResearchOrchestrator` runs; invokes `TopIssuePicker` | `run(config, existingByCategory): Promise<{ results: ResearchResult[], topIssue: TopIssue }>` |
| `src/main/services/top-issue-picker.ts` | Asks AI to choose the single highest-impact headline across categories | `pick(results: ResearchResult[]): Promise<TopIssue>` |
| `src/renderer/src/components/CategoryTabs.tsx` | Horizontal scrollable tab bar rendered above session tabs | Props: `{ categories, activeCategory, onChange }` |

### Modified

| File | Change |
|---|---|
| `src/main/services/orchestrator.ts` | `run()` signature: `(config, category: Category, existingResults?)` — single-category scope. Uses `category.keywords` only. Written result carries `.category = category.name` |
| `src/main/services/storage.ts` | `saveResearch`/`loadResearch` preserve `category` field. New `migrateConfig(oldConfig)` + `migrateResearch(oldResult)` for one-shot migration on load. Legacy sessions get `category: 'Legacy'` |
| `src/shared/types.ts` | Add `Category`, `TopIssue`. `AppConfig`: replace `keywords: string[]` with `categories: Category[]`. `ResearchResult`: add `category: string` |
| `src/main/index.ts` | `runResearch()` now calls `MultiCategoryOrchestrator`; per-result save loop; single notification with `topIssue` |
| `src/renderer/src/App.tsx` | `activeCategory` state; sessions filtered by category; `<CategoryTabs>` above session tab row |
| `src/renderer/src/hooks/useResearch.ts` | Returns `sessionsByCategory: Record<string, ResearchResult[]>` and `categories` |
| `src/renderer/src/components/Onboarding.tsx` | Writes `config.categories` (grouped per preset; custom input lands in `Custom` category) |
| `src/renderer/src/components/Settings.tsx` | Per-category keyword editor (grouped by category name) |

## Data Structures

```ts
// shared/types.ts additions
export interface Category {
  name: string           // e.g. "AI Agent"
  keywords: string[]     // e.g. ["AI Agent","LLM","AI Coding"]
}

export interface TopIssue {
  categoryName: string
  headline: string
  body: string
}

// Modified
export interface AppConfig {
  categories: Category[]   // NEW — replaces `keywords`
  // ... existing: scheduleHour, scheduleMinute, notificationEnabled,
  //              openAtLogin, fetchPeriodDays, anthropicApiKey, rssSources ...
}

export interface ResearchResult {
  date: string
  generatedAt: string
  category: string          // NEW — required
  trendHeadline: string
  insightHeadline: string
  actionHeadline: string
  trends: TrendItem[]
  insights: InsightItem[]
  actions: ActionItem[]
  rawArticles: RawArticle[]
}
```

### Storage Layout (on disk)

Unchanged file structure. `ai-research-widget/research/<YYYY-MM-DD>.json` stores `ResearchResult[]` — sessions from all categories interleaved. Filtering by `.category` happens at load time.

Config file: `ai-research-widget/config.json` now holds `categories: Category[]`. First load detects legacy flat `keywords` and runs `migrateConfig`.

## Migration

**Config migration (one-shot, on `storage.loadConfig()`):**
```
if (config.keywords && !config.categories) {
  // Map keywords to presets from Onboarding.tsx (hard-coded preset list)
  // Unmatched keywords → single { name: 'Custom', keywords: [...unmatched] }
  // Matched keywords → preserved preset categories
  config.categories = [...inferredPresets, ...(customKeywords ? [{ name: 'Custom', keywords: customKeywords }] : [])]
  delete config.keywords
  save()
}
```

**Research migration (on `storage.loadResearch(date)`):**
```
result.category ??= 'Legacy'   // pre-spec sessions surface under the 'Legacy' tab
```

No destructive migration. User sees their old data under a `Legacy` category tab alongside new category tabs.

## Error Handling

| Failure | Behavior |
|---|---|
| One category's orchestrator throws | `Promise.allSettled` — logged, that category skipped, other categories proceed |
| All categories fail | Bubble up to `runResearch()` — existing `catch` path sends `research-complete: null`, no notification (same as today) |
| `TopIssuePicker` AI call fails or returns unparseable output | Fallback: use `results[0].trends[0]` as the top issue (first successful category's first trend) |
| RSS/HN collector returns 0 articles for a category | Existing "no new articles → reuse existing" fallback applies per-category |
| Config migration throws | Log error, reset to default config (single `Custom` category with empty keywords → user re-onboards) |
| Research migration misses `.category` | Defaults to `'Legacy'` — never blocks load |

## UI Changes

- **CategoryTabs** (new, above session tabs):
  - Horizontal row, scrollable when overflow
  - Each tab: category name; active underline/background matching existing `리서치 N` style
  - Tab count = `config.categories.length` (+ `Legacy` if migrated research exists)
- **Session tabs** (existing):
  - Now sourced from `sessionsByCategory[activeCategory]` instead of flat `sessions`
  - Empty state: "이 카테고리에는 아직 리서치가 없어요" when `sessions.length === 0`
- **Active category persistence**: `localStorage` key `activeCategory` preserved across app opens
- **Onboarding**: preset cards store group metadata; custom keyword input produces `Custom` category
- **Settings**: keyword editor grouped by category; add/remove keyword within a group; add/remove category

## Notification

- Title: `오늘의 리서치 준비 완료`
- Body: `[${topIssue.categoryName}] ${topIssue.headline}`
- Fires once per scheduled run (not per category)

## Testing Strategy

| File | Scope |
|---|---|
| `orchestrator.test.ts` (updated) | Single-category signature; verify `.category` set on result |
| `multi-category-orchestrator.test.ts` (new) | N categories run in parallel; `allSettled` partial failure; `TopIssuePicker` integration with mock |
| `top-issue-picker.test.ts` (new) | Mock AI; happy path + fallback path when AI fails |
| `storage.test.ts` (updated) | `migrateConfig` cases: flat keywords → categories; empty config; already-migrated config; `migrateResearch` Legacy default |

Renderer components not unit-tested (existing convention). Manual smoke via dev mode.

## Rollout

1. Bump version to `1.8.0` (breaking config shape, even with migration)
2. Pack → replace `/Applications/Pringsearch.app` → smoke test in dev
3. `npm run dist` → v1.8.0 GitHub Release (DMG + zip + `latest-mac.yml`)
4. Existing users receive "new version available" prompt (auto-updater already handles)
