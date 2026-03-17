# Pringsearch

프로덕트 디자이너가 만든 AI 리서치 트렌드를 매일 자동으로 수집하고 분석하여 같은 시간에 알림을 주는 macOS 데스크탑 위젯입니다.

## 주요 기능

### 자동 리서치
- RSS 피드와 Hacker News에서 관심 키워드 기반으로 기사를 자동 수집
- Claude AI가 수집된 기사를 분석하여 핵심 트렌드, 인사이트, 실무 적용 제안을 생성
- 매일 설정한 시간에 자동 실행 (수동 실행도 가능)
- "리서치 더하기"로 같은 기사에서 새로운 관점의 분석을 추가로 생성

### AI 토론
- 4명의 AI 캐릭터가 리서치 결과를 바탕으로 토론
  - **Gemini 사원** - 2년차 기획자, MZ세대 말투
  - **GPT 대리** - 5년차 디자이너, AI 업무 효율화에 진심
  - **Claude 과장** - 10년차 풀스택 개발자, 기술적 솔루션 제시
  - **Perplexity 사장** - 데이터 기반 결론, 의사결정자
- "토론 더하기"로 대화를 이어갈 수 있음

### 기타
- 날짜별 리서치 히스토리 탐색
- 리서치 탭 삭제 관리
- 결과 복사 및 마크다운 저장
- 북마크 기능

## 설치

### 터미널에서 설치 (권장)

```bash
curl -fsSL https://raw.githubusercontent.com/deweunsoo/pringsearch/main/install.sh | bash
```

### 직접 다운로드

[최신 릴리즈](https://github.com/deweunsoo/pringsearch/releases/latest)에서 `.dmg` 파일을 다운로드하여 설치하세요.

> macOS Gatekeeper 경고가 뜨면: 앱을 **우클릭** → **열기** → **열기** 클릭

## 기술 스택

- **Electron** + **electron-vite**
- **React** + **TypeScript**
- **Claude API** (Anthropic)

## 개발 환경 셋업

```bash
# 리포지토리 클론
git clone https://github.com/deweunsoo/pringsearch.git
cd pringsearch

# 의존성 설치
npm install

# 개발 모드 실행
npm run dev

# 빌드
npm run build
```

## 설정

앱 내 설정 화면에서 다음을 구성할 수 있습니다:

- 관심 키워드
- RSS 소스 추가/삭제
- 자동 실행 스케줄 시간
- Anthropic API 키 (선택)
