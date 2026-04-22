import { useState, useEffect, useRef } from 'react'
import { CatIcon } from './icons'

interface Props {
  onComplete: () => void
}

interface InterestPreset {
  id: string
  label: string
  emoji: string
  rss: { name: string; url: string; enabled: boolean }[]
  keywords: string[]
}

const PRESETS: InterestPreset[] = [
  {
    id: 'ai-dev',
    label: 'AI / 개발',
    emoji: '🤖',
    rss: [
      { name: 'MIT Tech Review - AI', url: 'https://www.technologyreview.com/feed/', enabled: true },
      { name: 'TechCrunch - AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', enabled: true },
      { name: 'The Verge - AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', enabled: true },
    ],
    keywords: ['AI Agent', 'LLM', 'AI Coding', 'Generative AI'],
  },
  {
    id: 'design',
    label: 'UX / 디자인',
    emoji: '🎨',
    rss: [
      { name: 'UX Collective', url: 'https://uxdesign.cc/feed', enabled: true },
      { name: 'NN Group', url: 'https://www.nngroup.com/feed/rss/', enabled: true },
      { name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/', enabled: true },
    ],
    keywords: ['UX Design', 'Design System', 'Generative UI', 'AI Design Tools'],
  },
  {
    id: 'product',
    label: '프로덕트 / PM',
    emoji: '📊',
    rss: [
      { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', enabled: true },
      { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', enabled: true },
    ],
    keywords: ['Product Management', 'Growth', 'User Research', 'A/B Test'],
  },
  {
    id: 'startup',
    label: '스타트업 / 비즈니스',
    emoji: '🚀',
    rss: [
      { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', enabled: true },
      { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', enabled: true },
    ],
    keywords: ['Startup', 'SaaS', 'Fundraising', 'AI Business'],
  },
  {
    id: 'marketing',
    label: '마케팅',
    emoji: '📣',
    rss: [
      { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', enabled: true },
      { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', enabled: true },
    ],
    keywords: ['AI Marketing', 'Content AI', 'Growth Hacking', 'SEO'],
  },
  {
    id: 'crypto',
    label: '크립토 / 핀테크',
    emoji: '💰',
    rss: [
      { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', enabled: true },
      { name: 'TechCrunch - Fintech', url: 'https://techcrunch.com/category/fintech/feed/', enabled: true },
    ],
    keywords: ['Stablecoin', 'DeFi', 'Web3', 'Fintech'],
  },
]

export default function Onboarding({ onComplete }: Props) {
  const [hour, setHour] = useState(10)
  const [minute, setMinute] = useState(30)
  const [isAm, setIsAm] = useState(true)
  const [openAtLogin, setOpenAtLogin] = useState(true)
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [customKeywords, setCustomKeywords] = useState<string[]>([])
  const [customInput, setCustomInput] = useState('')
  const [step, setStep] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 약간의 지연 후 실제 렌더된 높이 측정
    const timer = setTimeout(() => {
      if (containerRef.current) {
        // 자식 요소들의 실제 높이 합산
        let totalH = 0
        const children = containerRef.current.children
        for (let i = 0; i < children.length; i++) {
          totalH += (children[i] as HTMLElement).offsetHeight
        }
        window.api.resizeWindow(Math.max(520, totalH + 80))
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [step, customKeywords])

  const totalSteps = 3

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const save = async () => {
    const scheduleHour = isAm ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12)
    const config = await window.api.getConfig()

    const selected = PRESETS.filter(p => selectedInterests.includes(p.id))
    const rssMap = new Map<string, { name: string; url: string; enabled: boolean }>()
    const keywordSet = new Set<string>()

    for (const preset of selected) {
      for (const rss of preset.rss) rssMap.set(rss.url, rss)
      for (const kw of preset.keywords) keywordSet.add(kw)
    }
    for (const kw of customKeywords) keywordSet.add(kw)

    const categories = Array.from(keywordSet).map(kw => ({ name: kw, keywords: [kw] }))

    await window.api.saveConfig({
      ...config,
      scheduleHour,
      scheduleMinute: minute,
      openAtLogin,
      setupCompleted: true,
      ...(selected.length > 0 || customKeywords.length > 0
        ? {
            rssSources: Array.from(rssMap.values()),
            categories,
          }
        : {}),
    })
    onComplete()
  }

  const ProgressDots = ({ current }: { current: number }) => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '32px' }}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} style={{ width: '24px', height: '6px', borderRadius: '3px', background: i === current ? '#3182F6' : '#E5E8EB' }} />
      ))}
    </div>
  )

  return (
    <div ref={containerRef} style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 28px',
      fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif',
      WebkitAppRegion: 'drag' as any,
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '14px 16px',
        WebkitAppRegion: 'drag' as any,
      }}>
        <div className="traffic-lights" style={{ WebkitAppRegion: 'no-drag' as any }}>
          <button
            className="traffic-btn"
            onClick={() => (window as any).api.windowClose()}
            style={{ background: '#FF5F57' }}
            aria-label="Close"
          >
            <svg viewBox="0 0 12 12" fill="none" stroke="#4D0000" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3.5 3.5l5 5M8.5 3.5l-5 5"/>
            </svg>
          </button>
          <button
            className="traffic-btn"
            onClick={() => (window as any).api.windowMinimize()}
            style={{ background: '#FEBC2E' }}
            aria-label="Minimize"
          >
            <svg viewBox="0 0 12 12" fill="none" stroke="#995700" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2.5 6h7"/>
            </svg>
          </button>
          <button
            className="traffic-btn"
            onClick={() => (window as any).api.windowMaximize()}
            style={{ background: '#28C840' }}
            aria-label="Maximize"
          >
            <svg viewBox="0 0 12 12" fill="none" stroke="#006500" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.5 2.5L9.5 9.5"/><polyline points="5.5,9.5 9.5,9.5 9.5,5.5"/><polyline points="6.5,2.5 2.5,2.5 2.5,6.5"/>
            </svg>
          </button>
        </div>
        <span style={{ fontSize: '15px', fontWeight: 500, color: '#6b7280', letterSpacing: '0.5px', marginLeft: '14px' }}>Pringsearch</span>
      </div>

      {/* Step 0: 환영 */}
      {step === 0 && (
        <div style={{ textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
          <div className="cat-bounce" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
            <CatIcon size={80} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#333D4B', marginBottom: '8px', letterSpacing: '0px' }}>
            Pringsearch에 오신 걸 환영해요
          </h1>
          <p style={{ fontSize: '18px', color: '#4b5563', lineHeight: 1.4, letterSpacing: '0px', margin: 0, textAlign: 'center' }}>
            매일 트렌드를 요약해서<br />설정한 시간에 알려드려요
          </p>
          <button
            onClick={() => setStep(1)}
            style={{
              marginTop: '28px',
              padding: '14px 48px',
              background: '#3182F6',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '-0.2px',
              WebkitAppRegion: 'no-drag' as any,
            }}
          >
            시작하기
          </button>
        </div>
      )}

      {/* Step 1: 관심사 선택 */}
      {step === 1 && (
        <div style={{ width: '100%', maxWidth: '360px', animation: 'fadeIn 0.4s ease' }}>
          <ProgressDots current={0} />
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#333D4B', letterSpacing: '-0.3px', margin: 0 }}>
              어떤 분야에 관심 있으세요?
            </h2>
            <p style={{ fontSize: '18px', color: '#4b5563', marginTop: '6px', letterSpacing: '-0.2px' }}>
              선택에 맞춰 소스와 키워드를 설정해드려요
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            WebkitAppRegion: 'no-drag' as any,
          }}>
            {PRESETS.map(preset => {
              const selected = selectedInterests.includes(preset.id)
              return (
                <button
                  key={preset.id}
                  onClick={() => toggleInterest(preset.id)}
                  style={{
                    padding: '10px 12px',
                    background: selected ? '#EBF3FE' : '#fff',
                    border: selected ? '2px solid #3182F6' : '2px solid #E5E7EB',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '15px',
                    fontWeight: selected ? 600 : 500,
                    color: selected ? '#3182F6' : '#4E5968',
                    letterSpacing: '-0.2px',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{preset.emoji}</span>
                  {preset.label}
                </button>
              )
            })}
          </div>

          {/* 직접 입력 */}
          <div style={{ marginTop: '12px', WebkitAppRegion: 'no-drag' as any }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: customKeywords.length > 0 ? '8px' : '0' }}>
              {customKeywords.map((kw, i) => (
                <span key={i} style={{
                  background: '#F2F4F6',
                  borderRadius: '8px',
                  padding: '5px 10px 5px 12px',
                  fontSize: '14px',
                  color: '#4E5968',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  letterSpacing: '-0.2px',
                }}>
                  {kw}
                  <button
                    onClick={() => setCustomKeywords(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B0B8C1', padding: '0 0 0 2px', fontSize: '11px', display: 'flex', alignItems: 'center' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M4 4L10 10M10 4L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <input
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && customInput.trim()) {
                  setCustomKeywords(prev => [...prev, customInput.trim()])
                  setCustomInput('')
                }
              }}
              placeholder="기타 관심사 직접 입력 (Enter)"
              style={{
                background: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '15px',
                color: '#333D4B',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
                letterSpacing: '-0.2px',
              }}
            />
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={selectedInterests.length === 0 && customKeywords.length === 0}
            style={{
              marginTop: '20px',
              width: '100%',
              padding: '14px',
              background: (selectedInterests.length > 0 || customKeywords.length > 0) ? '#3182F6' : '#D1D6DB',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
              borderRadius: '12px',
              border: 'none',
              cursor: (selectedInterests.length > 0 || customKeywords.length > 0) ? 'pointer' : 'not-allowed',
              letterSpacing: '-0.2px',
              WebkitAppRegion: 'no-drag' as any,
            }}
          >
            다음
          </button>
        </div>
      )}

      {/* Step 2: 시간 설정 */}
      {step === 2 && (
        <div style={{ width: '100%', maxWidth: '360px', animation: 'fadeIn 0.4s ease' }}>
          <ProgressDots current={1} />
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#333D4B', letterSpacing: '-0.3px', margin: 0 }}>
              몇 시에 알려드릴까요?
            </h2>
            <p style={{ fontSize: '18px', color: '#4b5563', marginTop: '6px', letterSpacing: '-0.2px' }}>
              매일 이 시간에 리서치 결과를 보내드려요
            </p>
          </div>

          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #F2F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            WebkitAppRegion: 'no-drag' as any,
          }}>
            <div style={{ display: 'flex', background: '#F2F4F6', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, height: '44px' }}>
              <button
                onClick={() => setIsAm(true)}
                style={{
                  padding: '0 16px',
                  height: '44px',
                  fontSize: '16px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: isAm ? '#4E5968' : 'transparent',
                  color: isAm ? '#fff' : '#8B95A1',
                  borderRadius: '10px 0 0 10px',
                  letterSpacing: '-0.2px',
                }}
              >오전</button>
              <button
                onClick={() => setIsAm(false)}
                style={{
                  padding: '0 16px',
                  height: '44px',
                  fontSize: '16px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: !isAm ? '#4E5968' : 'transparent',
                  color: !isAm ? '#fff' : '#8B95A1',
                  borderRadius: '0 10px 10px 0',
                  letterSpacing: '-0.2px',
                }}
              >오후</button>
            </div>
            <input
              type="number"
              min={1} max={12}
              value={hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}
              onChange={e => setHour(Math.max(1, Math.min(12, Number(e.target.value))))}
              style={{
                background: '#F2F4F6',
                border: '1px solid transparent',
                borderRadius: '10px',
                padding: '0 4px',
                height: '44px',
                fontSize: '16px',
                fontWeight: 600,
                color: '#333D4B',
                width: '56px',
                textAlign: 'center',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <span style={{ fontSize: '16px', color: '#6B7684', fontWeight: 500 }}>시</span>
            <input
              type="number"
              min={0} max={59}
              value={minute}
              onChange={e => setMinute(Math.max(0, Math.min(59, Number(e.target.value))))}
              style={{
                background: '#F2F4F6',
                border: '1px solid transparent',
                borderRadius: '10px',
                padding: '0 4px',
                height: '44px',
                fontSize: '16px',
                fontWeight: 600,
                color: '#333D4B',
                width: '56px',
                textAlign: 'center',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <span style={{ fontSize: '16px', color: '#6B7684', fontWeight: 500 }}>분</span>
          </div>

          <button
            onClick={() => setStep(3)}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '14px',
              background: '#3182F6',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '-0.2px',
              WebkitAppRegion: 'no-drag' as any,
            }}
          >
            다음
          </button>
        </div>
      )}

      {/* Step 3: 자동 시작 */}
      {step === 3 && (
        <div style={{ width: '100%', maxWidth: '360px', animation: 'fadeIn 0.4s ease' }}>
          <ProgressDots current={2} />
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#333D4B', letterSpacing: '-0.3px', margin: 0 }}>
              자동으로 시작할까요?
            </h2>
            <p style={{ fontSize: '18px', color: '#4b5563', marginTop: '6px', letterSpacing: '-0.2px' }}>
              켜두면 Mac 시작 시 자동으로 실행되고<br />잠자기 중에도 제시간에 알림을 받을 수 있어요
            </p>
          </div>

          <div style={{ WebkitAppRegion: 'no-drag' as any }}>
            <button
              onClick={() => setOpenAtLogin(true)}
              style={{
                width: '100%',
                padding: '18px 20px',
                background: openAtLogin ? '#EBF3FE' : '#fff',
                border: openAtLogin ? '2px solid #3182F6' : '1px solid #E5E7EB',
                borderRadius: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginBottom: '10px',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: '28px', height: '28px',
                borderRadius: '50%',
                background: openAtLogin ? '#3182F6' : '#E5E8EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3.5 7L6 9.5L10.5 4.5" stroke={openAtLogin ? '#fff' : '#8B95A1'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#333D4B', letterSpacing: '-0.2px' }}>자동 시작 (권장)</div>
                <div style={{ fontSize: '13px', color: '#8B95A1', marginTop: '2px', letterSpacing: '-0.2px' }}>놓치는 알림 없이 매일 받아볼 수 있어요</div>
              </div>
            </button>

            <button
              onClick={() => setOpenAtLogin(false)}
              style={{
                width: '100%',
                padding: '18px 20px',
                background: !openAtLogin ? '#F7F8FA' : '#fff',
                border: !openAtLogin ? '2px solid #8B95A1' : '1px solid #E5E7EB',
                borderRadius: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: '28px', height: '28px',
                borderRadius: '50%',
                background: !openAtLogin ? '#4E5968' : '#E5E8EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 3l6 6M9 3l-6 6" stroke={!openAtLogin ? '#fff' : '#8B95A1'} strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#333D4B', letterSpacing: '-0.2px' }}>직접 열기</div>
                <div style={{ fontSize: '13px', color: '#8B95A1', marginTop: '2px', letterSpacing: '-0.2px' }}>앱을 직접 실행했을 때만 동작해요</div>
              </div>
            </button>
          </div>

          <button
            onClick={save}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '14px',
              background: '#3182F6',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '-0.2px',
              WebkitAppRegion: 'no-drag' as any,
            }}
          >
            완료
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
