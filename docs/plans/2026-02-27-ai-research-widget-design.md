# AI Research Widget - Design Document

## Overview

매일 아침 자동으로 AI 및 UX/UI 디자인 관련 최신 리서치를 수집하고, Gemini API로 요약/인사이트를 생성하여 macOS 데스크탑 위젯으로 보여주는 도구.

## Requirements

- 매일 오전 10:30에 자동 리서치 실행
- 복합 소스에서 데이터 수집 (RSS, Hacker News, Gemini Search Grounding)
- Gemini API로 요약, 인사이트 도출, 실무 적용 제안 생성
- macOS 데스크탑 위젯으로 항상 화면에 표시
- macOS 네이티브 알림으로 리서치 완료 통지
- 히스토리 탐색 (이전 날짜 리서치 확인)
- 설정 커스터마이징 (시간, 소스, 키워드)

## Architecture

```
Electron App (Main Process)
├── Scheduler (node-cron, 매일 10:30)
├── Collector (RSS + Hacker News + Gemini Search Grounding)
├── Analyzer (Gemini API - 요약/인사이트/액션)
├── Storage (로컬 JSON 파일)
├── Notifier (macOS Notification)
└── Tray (트레이 아이콘)

Electron App (Renderer Process)
├── Widget Window (380x520, frameless, always-on-top)
├── Header (타이틀, 설정 버튼)
├── TrendSummary (핵심 트렌드 3줄)
├── InsightCard (인사이트 카드, 펼침/접힘)
├── ActionItems (실무 적용 제안)
├── DateNav (날짜 이동)
└── Settings (설정 화면)
```

## Data Sources

| Source | Method | Target |
|--------|--------|--------|
| RSS Feeds | rss-parser | MIT Tech Review, The Verge AI, TechCrunch AI, UX Collective, NN Group, Smashing Magazine |
| Hacker News | Public API | AI/Design 관련 상위 스토리 (score 50+) |
| Gemini Search Grounding | Gemini API built-in | 최신 웹 검색 보완 |

## Collection Strategy

- RSS: 최근 24시간 내 글만 필터링
- Hacker News: score 50+ AI/Design 스토리
- 중복 제거: URL 기반 dedup
- Gemini API 호출: 하루 2~3회 (무료 티어 일 1,500회 내)

## Gemini API Usage

- 1차 호출: 수집 데이터 → 요약 + 트렌드 분석
- 2차 호출: 요약 결과 → 인사이트 도출 + 실무 적용 제안
- Model: Gemini 2.0 Flash (무료 티어)
- Google Search Grounding으로 추가 웹 검색

## Widget UI

- Window: 380x520px, frameless, always-on-top, border-radius 16px
- Position: 화면 우측 하단 (드래그 이동 가능)
- Sections: Header → TrendSummary → InsightCards → ActionItems → DateNav
- Interactions: 카드 펼침/접힘, 설정 화면, 날짜 이동, 트레이 최소화

## Settings

- 리서치 시간 설정
- Gemini API Key (macOS Keychain 저장)
- RSS 소스 관리 (추가/삭제/토글)
- 관심 키워드 관리
- macOS 알림 ON/OFF
- 데이터 저장 경로
- 수동 리서치 실행 버튼

## Tech Stack

| Role | Technology |
|------|-----------|
| Framework | Electron 33+ |
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Build | Vite |
| Scheduler | node-cron |
| RSS | rss-parser |
| AI | @google/generative-ai (Gemini) |
| Storage | Local JSON files |
| Security | electron-keytar (Keychain) |
| Packaging | electron-builder |

## Project Structure

```
ai-research-widget/
├── electron/
│   ├── main.ts
│   ├── tray.ts
│   ├── preload.ts
│   └── scheduler.ts
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── TrendSummary.tsx
│   │   ├── InsightCard.tsx
│   │   ├── ActionItems.tsx
│   │   ├── DateNav.tsx
│   │   └── Settings.tsx
│   ├── services/
│   │   ├── collector.ts
│   │   ├── analyzer.ts
│   │   ├── storage.ts
│   │   └── notifier.ts
│   └── types/
│       └── index.ts
├── data/
│   └── research-YYYY-MM-DD.json
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── electron-builder.yml
```

## macOS Notification

- Trigger: 리서치 완료 시
- Title: "오늘의 AI 리서치 도착"
- Body: 핵심 트렌드 1줄 미리보기
- Click action: 위젯 윈도우 포커스

## Data Storage

- 경로: `~/ai-research-widget/data/research-YYYY-MM-DD.json`
- 설정: `~/ai-research-widget/config.json`
- API Key: macOS Keychain (electron-keytar)
