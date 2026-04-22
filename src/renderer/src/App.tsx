import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Header from './components/Header'
import CategoryTabs from './components/CategoryTabs'
import TrendSummary from './components/TrendSummary'
import InsightCards from './components/InsightCard'
import ActionItems from './components/ActionItems'
import DateNav from './components/DateNav'
import Settings from './components/Settings'
import Onboarding from './components/Onboarding'
import { useResearch } from './hooks/useResearch'
import DiscussionChat from './components/DiscussionChat'
import DiscussionPage from './components/DiscussionPage'
import { CatIcon, CaterpillarIcon, DocListIcon } from './components/icons'
import { Agentation } from 'agentation'

function toMarkdown(research: any): string {
  let md = `# 리서치 결과 (${research.date})\n\n`
  if (research.trends?.length) {
    md += `## 핵심 트렌드\n`
    research.trends.forEach((t: any) => { md += `- ${t.text}\n` })
    md += '\n'
  }
  if (research.insights?.length) {
    md += `## 인사이트\n`
    research.insights.forEach((ins: any) => {
      md += `### ${ins.title}\n${ins.body}\n\n`
    })
  }
  if (research.actions?.length) {
    md += `## 실무 적용 제안\n`
    research.actions.forEach((a: any) => { md += `- [${a.category}] ${a.text}\n` })
  }
  return md
}

function toSlackHtml(research: any): { plain: string; html: string } {
  const strip = (s: string) => s.replace(/\*\*/g, '')
  const nums = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣']

  let plain = `📌 AI/UX 리서치 — ${research.date}\n\n`
  let html = `<b>📌 AI/UX 리서치 — ${research.date}</b><br><br>`

  if (research.trends?.length) {
    plain += `🔍 트렌드\n\n`
    html += `<b>🔍 트렌드</b><br><br>`
    research.trends.forEach((t: any, i: number) => {
      const text = strip(t.text)
      plain += `${nums[i] || '•'} ${text}\n\n`
      html += `${nums[i] || '•'} ${text}<br><br>`
    })
  }

  if (research.insights?.length) {
    plain += `💡 인사이트\n\n`
    html += `<b>💡 인사이트</b><br><br>`
    research.insights.forEach((ins: any) => {
      const body = strip(ins.body)
      plain += `${ins.title}\n${body}\n\n`
      html += `<b>${ins.title}</b><br>${body}<br><br>`
    })
  }

  if (research.actions?.length) {
    plain += `🎯 이걸 해보면 좋겠다\n\n`
    html += `<b>🎯 이걸 해보면 좋겠다</b><br><br>`
    research.actions.forEach((a: any) => {
      const text = strip(a.text)
      plain += `▸ ${text}\n\n`
      html += `▸ ${text}<br><br>`
    })
  }

  return { plain: plain.trim(), html }
}

export default function App() {
  const { research, sessions, loading, currentDate, loadResearch, runNow, addResearch, cancelAdd, clear, deleteSession } = useResearch()
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState<string | false>(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [activeCategory, setActiveCategory] = useState<string>(() =>
    localStorage.getItem('activeCategory') || ''
  )
  useEffect(() => {
    if (activeCategory) localStorage.setItem('activeCategory', activeCategory)
  }, [activeCategory])
  const [configCategoryNames, setConfigCategoryNames] = useState<string[]>([])
  useEffect(() => {
    window.api.getConfig().then((c: any) => {
      setConfigCategoryNames((c?.categories || []).map((x: any) => x.name))
    })
  }, [])
  const categoryNames = useMemo(() => {
    const ordered: string[] = []
    for (const n of configCategoryNames) if (!ordered.includes(n)) ordered.push(n)
    for (const s of sessions) {
      const n = s.category
      if (!n || n === 'Legacy') continue
      if (!ordered.includes(n)) ordered.push(n)
    }
    return ordered
  }, [sessions, configCategoryNames])
  useEffect(() => {
    if (categoryNames.length === 0) return
    if (!categoryNames.includes(activeCategory)) setActiveCategory(categoryNames[0])
  }, [categoryNames, activeCategory])
  const categorySessionsWithIdx = useMemo(
    () => sessions.map((s, gi) => ({ s, gi })).filter(x => (x.s.category || 'Legacy') === activeCategory),
    [sessions, activeCategory]
  )
  const categorySessions = useMemo(() => categorySessionsWithIdx.map(x => x.s), [categorySessionsWithIdx])
  useEffect(() => {
    if (activeTab >= categorySessions.length && categorySessions.length > 0) {
      setActiveTab(categorySessions.length - 1)
    }
  }, [activeTab, categorySessions.length])
  const [downloadPath, setDownloadPath] = useState<string | null>(null)
  const [updateInfo, setUpdateInfo] = useState<{ version: string; url: string } | null>(null)
  useEffect(() => {
    const check = () => window.api.checkUpdate().then(info => setUpdateInfo(info))
    check()
    const id = setInterval(check, 5 * 60 * 1000)
    window.addEventListener('focus', check)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', check)
    }
  }, [])
  const [discussions, setDiscussions] = useState<Record<number, any[]>>(() => {
    try {
      const saved = localStorage.getItem(`discussions-${new Date().toISOString().slice(0, 10)}`)
      return saved ? JSON.parse(saved) : {}
    } catch { return {} }
  })
  const [discussionLoading, setDiscussionLoading] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const shareRef = useRef<HTMLDivElement>(null)

  const syncHeight = useCallback(() => {
    if (showOnboarding) {
      window.api.resizeWindow(520)
      return
    }
    if (showSettings && settingsRef.current) {
      const h = settingsRef.current.scrollHeight
      window.api.resizeWindow(h + 40)
    } else if (sessions.length > 0 && contentRef.current) {
      const contentH = contentRef.current.scrollHeight
      window.api.resizeWindow(contentH + 140)
    } else if (!loading && !research) {
      window.api.resizeWindow(520)
    }
  }, [research, sessions, loading, showSettings, showOnboarding, activeTab])

  useEffect(() => {
    requestAnimationFrame(syncHeight)
  }, [research, sessions, loading, showSettings, showOnboarding, syncHeight])


  useEffect(() => {
    window.api.getConfig().then((config: any) => {
      if (config?.downloadPath) setDownloadPath(config.downloadPath)
      setShowOnboarding(!config?.setupCompleted)
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey) return
      const map: Record<string, string> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }
      const dir = map[e.key]
      if (dir) {
        e.preventDefault()
        window.api.snapWindow(dir)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (Object.keys(discussions).length > 0) {
      localStorage.setItem(`discussions-${currentDate}`, JSON.stringify(discussions))
    }
  }, [discussions, currentDate])

  useEffect(() => {
    if (!showShareMenu) return
    const handleClick = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShowShareMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showShareMenu])

  useEffect(() => {
    if (sessions.length > 0) {
      setActiveTab(sessions.length - 1)
    } else {
      setActiveTab(0)
    }
  }, [sessions.length])

  useEffect(() => {
    if (!loading && activeTab >= sessions.length && sessions.length > 0) {
      setActiveTab(sessions.length - 1)
    }
  }, [loading, sessions.length, activeTab])

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0 })
    }
  }, [activeTab])

  const mergedSessions = useCallback(() => {
    if (sessions.length === 0) return null
    const s = sessions[activeTab]
    if (!s) return null
    return {
      date: s.date,
      trends: s.trends || [],
      insights: s.insights || [],
      actions: s.actions || [],
      trendHeadline: s.trendHeadline,
      insightHeadline: s.insightHeadline,
      actionHeadline: s.actionHeadline,
    }
  }, [sessions, activeTab])

  const handleCopy = () => {
    const merged = mergedSessions()
    if (!merged) return
    navigator.clipboard.writeText(toMarkdown(merged))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="glass-panel"
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif',
        letterSpacing: '-0.3px',
        WebkitFontSmoothing: 'antialiased'
      }}
    >
      {showOnboarding ? (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#F2F4F6', margin: '-6px -16px -16px', padding: '6px 16px 16px', borderRadius: '20px' }}>
          <Onboarding onComplete={() => setShowOnboarding(false)} />
        </div>
      ) : showSettings ? (
        <div ref={settingsRef} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#F2F4F6', margin: '-6px -16px -16px', padding: '6px 16px 16px', borderRadius: '20px' }}>
          <Settings onBack={() => {
            setShowSettings(false)
            window.api.getConfig().then((c: any) => {
              if (c?.downloadPath) setDownloadPath(c.downloadPath)
              setConfigCategoryNames((c?.categories || []).map((x: any) => x.name))
            })
          }} onRunNow={runNow} />
        </div>
      ) : showChat ? (
        <DiscussionPage
          discussions={discussions}
          sessionTimes={sessions.map(s => s.generatedAt ? (() => { const d = new Date(s.generatedAt); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` })() : '')}
          onBack={() => setShowChat(false)}
          currentDate={currentDate}
          activeSessionIdx={activeTab < sessions.length ? activeTab : Math.max(0, sessions.length - 1)}
          discussionLoading={discussionLoading}
          onStartDiscussion={async (idx: number) => {
            if (!sessions[idx]) return
            setDiscussionLoading(true)
            try {
              const session = sessions[idx]
              const result = await window.api.runDiscussion({
                trends: session.trends || [],
                insights: session.insights || [],
                actions: session.actions || [],
              })
              setDiscussions(prev => ({ ...prev, [idx]: [...(prev[idx] || []), ...result] }))
            } catch (e) {
              console.error('Discussion failed:', e)
            } finally {
              setDiscussionLoading(false)
            }
          }}
        />
      ) : (
        <>
          <Header
            currentDate={currentDate}
            generatedAt={research?.generatedAt}
            onSettingsClick={() => setShowSettings(true)}
            onChatClick={() => setShowChat(true)}
            onClear={clear}
            loading={loading}
            scrolled={scrolled}
            chatCount={Object.values(discussions).filter(d => d.length > 0).length}
            hasUpdate={!!updateInfo}
            onUpdateClick={() => updateInfo && window.api.openUpdateDialog(updateInfo)}
          />

          <CategoryTabs
            categories={categoryNames}
            active={activeCategory}
            onChange={name => { setActiveCategory(name); setActiveTab(0) }}
            showBorder={!(categorySessions.length > 1 || (loading && categorySessions.length > 0))}
          />

          {(categorySessions.length > 1 || (loading && categorySessions.length > 0)) && (
            <div className="hide-scrollbar" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              padding: '6px 20px 6px 0',
              borderBottom: '1px solid #E5E7EB',
              overflowX: 'auto',
              flexShrink: 0,
            }}>
              {categorySessionsWithIdx.map(({ gi }, i) => {
                const isActive = activeTab === i
                return (
                  <div
                    key={gi}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <button
                      onClick={() => setActiveTab(i)}
                      style={{
                        padding: '5px 28px 5px 12px',
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? '#333D4B' : '#8B95A1',
                        background: isActive ? '#F2F4F6' : 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        letterSpacing: '-0.2px',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#E5E7EB' }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                    >
                      리서치 {i + 1}
                    </button>
                    {categorySessions.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSession(gi)
                          if (activeTab >= i && activeTab > 0) setActiveTab(activeTab - 1)
                        }}
                        style={{
                          position: 'absolute',
                          right: '4px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '16px',
                          height: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#D1D5DB',
                          border: 'none',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          padding: 0,
                          color: '#FFFFFF',
                          fontSize: '14px',
                          lineHeight: 1,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#9CA3AF' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#D1D5DB' }}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                )
              })}
              {loading && categorySessions.length > 0 && (
                <button
                  onClick={() => setActiveTab(categorySessions.length)}
                  style={{
                    padding: '5px 12px',
                    fontSize: '13px',
                    fontWeight: activeTab === categorySessions.length ? 600 : 400,
                    color: activeTab === categorySessions.length ? '#333D4B' : '#8B95A1',
                    background: activeTab === categorySessions.length ? '#F2F4F6' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.2px',
                  }}
                >
                  리서치 {categorySessions.length + 1}<span style={{ fontSize: '11px', color: '#B0B8C1', marginLeft: '4px' }}>분석중</span>
                </button>
              )}
            </div>
          )}

          <div ref={contentRef} className="scrollable" onScroll={e => {
            const el = e.target as HTMLDivElement
            setScrolled(el.scrollTop > 0)
          }} style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {loading && sessions.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '4px' }}>
                <div style={{ position: 'relative', marginBottom: '24px' }}>
                  <div style={{ opacity: 0.35 }}>
                    <DocListIcon size={80} />
                  </div>
                  <div className="caterpillar-walk" style={{ position: 'absolute', top: '30px' }}>
                    <CaterpillarIcon size={56} />
                  </div>
                </div>
                <p style={{ fontSize: '20px', fontWeight: 600, color: '#1f2937', margin: 0 }}>자료를 가져오는 중...</p>
                <p style={{ fontSize: '16px', color: '#9ca3af', margin: 0, marginTop: '-2px' }}>자료를 확인하고 있어요.</p>
              </div>
            )}

            {!loading && categorySessions.length === 0 && (
              currentDate === new Date().toISOString().slice(0, 10) ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px' }}>
                  <div className="cat-bounce"><CatIcon size={70} /></div>
                  <p style={{ fontSize: '18px', color: '#4b5563', textAlign: 'center', lineHeight: 1.6, marginTop: '8px' }}>
                    아직 리서치 시간이 아닙니다.<br />
                    지금 리서치를 시작하시겠어요?
                  </p>
                  <button
                    onClick={runNow}
                    style={{
                      marginTop: '8px',
                      padding: '14px 36px',
                      background: '#3b82f6',
                      color: '#ffffff',
                      fontSize: '17px',
                      fontWeight: 600,
                      borderRadius: '9999px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    리서치 실행
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                  <p style={{ fontSize: '16px', color: '#8B95A1', textAlign: 'center' }}>
                    해당 날짜에는 리서치한 결과가 없습니다.
                  </p>
                </div>
              )
            )}

            {categorySessions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingTop: '16px', paddingBottom: '70px' }}>
                {activeTab < categorySessions.length ? (
                  <>
                    <TrendSummary trends={categorySessions[activeTab].trends || []} headline={categorySessions[activeTab].trendHeadline} />
                    <InsightCards insights={categorySessions[activeTab].insights || []} headline={categorySessions[activeTab].insightHeadline} />
                    <ActionItems actions={categorySessions[activeTab].actions || []} headline={categorySessions[activeTab].actionHeadline} />
                  </>
                ) : loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '48px 0' }}>
                    <div style={{ position: 'relative', marginBottom: '24px' }}>
                      <div style={{ opacity: 0.35 }}>
                        <DocListIcon size={80} />
                      </div>
                      <div className="caterpillar-walk" style={{ position: 'absolute', top: '30px' }}>
                        <CaterpillarIcon size={56} />
                      </div>
                    </div>
                    <p style={{ fontSize: '20px', fontWeight: 600, color: '#1f2937', margin: 0 }}>추가 리서치 중...</p>
                    <p style={{ fontSize: '16px', color: '#9ca3af', margin: 0 }}>새로운 자료를 확인하고 있어요.</p>
                    <button
                      onClick={() => { cancelAdd(); setActiveTab(Math.max(0, categorySessions.length - 1)) }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F2F4F6')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      style={{
                        marginTop: '16px',
                        background: 'transparent',
                        border: '1px solid #D1D6DB',
                        borderRadius: '8px',
                        padding: '8px 20px',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#8B95A1',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                    >
                      중단하기
                    </button>
                  </div>
                ) : null}
                {!loading && (
                  <div>
                    <button
                      onClick={() => {
                        setActiveTab(categorySessions.length)
                        addResearch()
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F2F4F6')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: '100%',
                        background: 'transparent',
                        border: '1px dashed #D1D6DB',
                        borderRadius: '12px',
                        padding: '14px',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#8B95A1',
                        cursor: 'pointer',
                        letterSpacing: '-0.2px',
                        transition: 'background 0.15s'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 3v10M3 8h10" stroke="#8B95A1" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                      리서치 더하기
                    </button>
                    <p style={{ fontSize: '15px', color: '#8B95A1', textAlign: 'center', margin: '20px 0 0', letterSpacing: '-0.2px' }}>
                      다른 시각으로 한 번 더 읽어보세요
                    </p>
                  </div>
                )}
              </div>
            )}

            {!loading && categorySessions.length > 0 && (
            <div style={{
              position: 'sticky',
              bottom: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px 0 14px'
            }}>
              <div ref={shareRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F2F4F6')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '10px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#4E5968',
                    cursor: 'pointer',
                    letterSpacing: '-0.2px',
                    transition: 'background 0.15s',
                    boxShadow: '0 3px 16px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <rect x="5.5" y="2" width="8" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M10.5 12V13.5a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 4 4.5h1" stroke="currentColor" strokeWidth="1.4"/>
                    </svg>
                    {(copied || shared) ? (copied || shared) : '복사하기'}
                  </span>
                </button>
                {showShareMenu && (
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '6px',
                    background: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    zIndex: 10
                  }}>
                    <button
                      onClick={() => {
                        handleCopy()
                        setShowShareMenu(false)
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F2F4F6')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      style={{ display: 'block', width: '100%', padding: '10px 16px', fontSize: '14px', fontWeight: 500, color: '#333D4B', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', letterSpacing: '-0.2px' }}
                    >
                      <span style={{ marginRight: '10px' }}>📝</span>마크다운 복사
                    </button>
                    <div style={{ height: '1px', background: '#F2F4F6' }} />
                    <button
                      onClick={async () => {
                        const merged = mergedSessions()
                        if (!merged) return
                        const { plain, html } = toSlackHtml(merged)
                        await navigator.clipboard.write([
                          new ClipboardItem({
                            'text/plain': new Blob([plain], { type: 'text/plain' }),
                            'text/html': new Blob([html], { type: 'text/html' })
                          })
                        ])
                        setShared('복사됨!')
                        setShowShareMenu(false)
                        setTimeout(() => setShared(false), 2000)
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F2F4F6')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      style={{ display: 'block', width: '100%', padding: '10px 16px', fontSize: '14px', fontWeight: 500, color: '#333D4B', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', letterSpacing: '-0.2px' }}
                    >
                      <span style={{ marginRight: '10px' }}>💬</span>내용 복사
                    </button>
                    <div style={{ height: '1px', background: '#F2F4F6' }} />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('https://deweunsoo.github.io/pringsearch/')
                        setShared('URL 복사됨!')
                        setShowShareMenu(false)
                        setTimeout(() => setShared(false), 2000)
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F2F4F6')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      style={{ display: 'block', width: '100%', padding: '10px 16px', fontSize: '14px', fontWeight: 500, color: '#333D4B', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', letterSpacing: '-0.2px' }}
                    >
                      <span style={{ marginRight: '10px' }}>🔗</span>URL 복사
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={async () => {
                  const merged = mergedSessions()
                  if (!merged) return
                  const now = new Date()
                  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
                  const defaultName = `리서치-${dateStr}.md`
                  await window.api.saveMarkdown(defaultName, toMarkdown(merged))
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F2F4F6')}
                onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#4E5968',
                  cursor: 'pointer',
                  letterSpacing: '-0.2px',
                  transition: 'background 0.15s',
                  boxShadow: '0 3px 16px rgba(0, 0, 0, 0.1)'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v8M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M1.5 10.5v1.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  저장하기
                </span>
              </button>
            </div>
          )}
          </div>

          <DateNav currentDate={currentDate} onDateChange={(date) => {
            setActiveTab(0)
            try {
              const saved = localStorage.getItem(`discussions-${date}`)
              setDiscussions(saved ? JSON.parse(saved) : {})
            } catch { setDiscussions({}) }
            loadResearch(date)
          }} />
        </>
      )}
      {import.meta.env.DEV && <Agentation />}
    </div>
  )
}
