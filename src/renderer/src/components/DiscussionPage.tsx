import { useRef, useEffect, useState } from 'react'
import logoGemini from '../assets/logo-gemini.png'
import logoOpenAI from '../assets/logo-openai.png'
import logoClaude from '../assets/logo-claude.png'
import logoPerplexity from '../assets/logo-perplexity.png'

interface DiscussionMessage {
  role: string
  text: string
}

interface Props {
  discussions: Record<number, DiscussionMessage[]>
  sessionTimes: string[]
  onBack: () => void
  onStartDiscussion: (sessionIdx: number) => Promise<void>
  discussionLoading: boolean
  activeSessionIdx: number
  currentDate: string
}

const BOT_LOGOS: Record<string, string> = {
  'Gemini 사원': logoGemini,
  'GPT 대리': logoOpenAI,
  'Claude 과장': logoClaude,
  'Perplexity 사장': logoPerplexity,
  '사원': logoGemini,
  '대리': logoOpenAI,
  '과장': logoClaude,
  '사장': logoPerplexity,
}

const BOT_META: Record<string, { color: string; initial: string; badge: string }> = {
  'Gemini 사원': { color: '#4285F4', initial: 'G', badge: '사원' },
  'GPT 대리':    { color: '#10A37F', initial: 'O', badge: '대리' },
  'Claude 과장': { color: '#D97706', initial: 'C', badge: '과장' },
  'Perplexity 사장': { color: '#7C3AED', initial: 'P', badge: '사장' },
  // 이전 데이터 호환
  '사원': { color: '#4285F4', initial: 'G', badge: '사원' },
  '대리': { color: '#10A37F', initial: 'O', badge: '대리' },
  '과장': { color: '#D97706', initial: 'C', badge: '과장' },
  '사장': { color: '#7C3AED', initial: 'P', badge: '사장' },
}

function getBotMeta(role: string) {
  return BOT_META[role] || { color: '#6B7280', initial: role[0], badge: '' }
}

function getBotDisplayName(role: string) {
  if (BOT_META[role]) return role
  // 이전 데이터: "사원" → "Gemini 사원"
  const map: Record<string, string> = { '사원': 'Gemini 사원', '대리': 'GPT 대리', '과장': 'Claude 과장', '사장': 'Perplexity 사장' }
  return map[role] || role
}

export default function DiscussionPage({ discussions, sessionTimes, onBack, onStartDiscussion, discussionLoading, activeSessionIdx, currentDate }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoStarted, setAutoStarted] = useState(false)
  const hasExisting = discussions[activeSessionIdx] && discussions[activeSessionIdx].length > 0
  const [visibleCount, setVisibleCount] = useState(hasExisting ? discussions[activeSessionIdx].length : 0)
  const prevLengthRef = useRef(hasExisting ? discussions[activeSessionIdx].length : 0)

  const entries = Object.entries(discussions)
    .map(([idx, msgs]) => ({ idx: Number(idx), msgs }))
    .filter(e => e.msgs.length > 0)
    .sort((a, b) => a.idx - b.idx)

  // 현재 보여줄 메시지 목록
  const allMessages = entries.flatMap(e => e.msgs)

  // Auto-start discussion if none exist
  useEffect(() => {
    if (!autoStarted && !discussionLoading && !hasExisting) {
      setAutoStarted(true)
      onStartDiscussion(activeSessionIdx)
    }
  }, [])

  // 새 메시지가 추가되면 (토론 더하기) visibleCount 유지하고 애니메이션 시작
  useEffect(() => {
    if (allMessages.length > prevLengthRef.current && prevLengthRef.current > 0) {
      // 새 메시지 추가됨 - visibleCount는 그대로, 애니메이션으로 새 메시지 표시
    }
    prevLengthRef.current = allMessages.length
  }, [allMessages.length])

  // 메시지가 로드되면 하나씩 순차 표시
  useEffect(() => {
    if (allMessages.length > 0 && visibleCount < allMessages.length) {
      const timer = setTimeout(() => {
        setVisibleCount(prev => prev + 1)
      }, visibleCount === 0 ? 800 : 1500 + Math.random() * 1500)
      return () => clearTimeout(timer)
    }
  }, [allMessages.length, visibleCount])

  // 새 메시지 도착 시 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [visibleCount])

  const visibleMessages = allMessages.slice(0, visibleCount)
  const isTyping = visibleCount < allMessages.length && allMessages.length > 0
  const nextBot = isTyping ? allMessages[visibleCount] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: '2.5px', marginBottom: '12px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="traffic-lights">
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
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#6b7280', letterSpacing: '0.5px', margin: 0 }}>
            리서치 토론 <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, marginLeft: '8px' }}>{currentDate} · 리서치 {activeSessionIdx + 1}</span>
          </h2>
        </div>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px', display: 'flex', alignItems: 'center',
            color: '#8B95A1', fontSize: '14px', fontWeight: 500,
          }}
        >
          닫기
        </button>
      </div>

      {/* 채팅 영역 */}
      <div
        ref={scrollRef}
        className="scrollable"
        style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px 16px 20px' }}
      >
        {discussionLoading && !hasExisting && allMessages.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '4px', padding: '48px 20px',
          }}>
            <div style={{
              width: '28px', height: '28px', marginBottom: '24px',
              border: '2.5px solid #E5E7EB', borderTopColor: '#3B82F6',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ fontSize: '20px', fontWeight: 600, color: '#1f2937', margin: 0 }}>
              토론 준비중...
            </p>
            <p style={{ fontSize: '16px', color: '#9ca3af', margin: 0 }}>
              우리 봇들이 리서치 결과에 대해 토론 준비를 하고 있어요!
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : allMessages.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 20px', gap: '8px',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '4px' }}>💬</div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#333D4B', margin: 0 }}>
              리서치 결과가 없습니다
            </p>
            <p style={{ fontSize: '13px', color: '#8B95A1', margin: 0 }}>
              먼저 리서치를 실행해주세요
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {visibleMessages.map((msg, i) => {
              const meta = getBotMeta(msg.role)
              const displayName = getBotDisplayName(msg.role)
              const prevRole = i > 0 ? visibleMessages[i - 1].role : null
              const isFirstInGroup = msg.role !== prevRole

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', gap: '8px', alignItems: 'flex-start',
                    marginTop: isFirstInGroup ? '12px' : '2px',
                    animation: 'msgSlideIn 0.3s ease-out',
                  }}
                >
                  {/* 아바타 */}
                  {isFirstInGroup ? (
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '10px',
                      overflow: 'hidden', flexShrink: 0, position: 'relative',
                    }}>
                      {BOT_LOGOS[msg.role]
                        ? <img src={BOT_LOGOS[msg.role]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', background: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#fff' }}>{meta.initial}</div>
                      }
                    </div>
                  ) : (
                    <div style={{ width: '32px', flexShrink: 0 }} />
                  )}

                  {/* 메시지 */}
                  <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {isFirstInGroup && (
                      <span style={{
                        fontSize: '12px', fontWeight: 600, color: '#4E5968',
                        letterSpacing: '-0.2px', marginBottom: '2px',
                      }}>
                        {displayName}
                      </span>
                    )}
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: isFirstInGroup ? '4px 16px 16px 16px' : '16px',
                      padding: '10px 14px',
                      fontSize: '17px', lineHeight: '1.6', color: '#191F28',
                      letterSpacing: '-0.2px', wordBreak: 'keep-all',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* 타이핑 인디케이터 */}
            {(isTyping || discussionLoading) && nextBot && (
              <div style={{
                display: 'flex', gap: '8px', alignItems: 'flex-start',
                marginTop: '12px', animation: 'msgSlideIn 0.3s ease-out',
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '10px',
                  overflow: 'hidden', flexShrink: 0,
                }}>
                  {BOT_LOGOS[nextBot.role]
                    ? <img src={BOT_LOGOS[nextBot.role]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', background: getBotMeta(nextBot.role).color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#fff' }}>{getBotMeta(nextBot.role).initial}</div>
                  }
                </div>
                <div>
                  <span style={{
                    fontSize: '12px', fontWeight: 600, color: '#4E5968',
                    letterSpacing: '-0.2px',
                  }}>
                    {getBotDisplayName(nextBot.role)}
                  </span>
                  <div style={{
                    background: '#FFFFFF', borderRadius: '4px 16px 16px 16px',
                    padding: '12px 16px', marginTop: '4px',
                    display: 'flex', gap: '4px', alignItems: 'center',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#8B95A1', animation: 'dotBounce 1.4s infinite ease-in-out' }} />
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#8B95A1', animation: 'dotBounce 1.4s infinite ease-in-out 0.15s' }} />
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#8B95A1', animation: 'dotBounce 1.4s infinite ease-in-out 0.3s' }} />
                  </div>
                </div>
              </div>
            )}

            {/* 토론 더하기 로딩 */}
            {discussionLoading && !isTyping && visibleCount > 0 && visibleCount >= allMessages.length && (
              <div style={{
                display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center',
                width: '100%', marginTop: '16px', animation: 'msgSlideIn 0.3s ease-out',
              }}>
                <div style={{
                  width: '28px', height: '28px',
                  border: '2.5px solid #E5E7EB', borderTopColor: '#3B82F6',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                }} />
                <p style={{ fontSize: '14px', color: '#8B95A1', margin: 0 }}>토론을 이어가는 중...</p>
              </div>
            )}

            {/* 토론 더하기 버튼 */}
            {!isTyping && !discussionLoading && visibleCount > 0 && visibleCount >= allMessages.length && (
              <div style={{ marginTop: '28px', animation: 'msgSlideIn 0.3s ease-out' }}>
                <button
                  onClick={() => onStartDiscussion(activeSessionIdx)}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F2F4F6')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '6px', width: '100%', background: 'transparent',
                    border: '1px dashed #D1D6DB', borderRadius: '12px',
                    padding: '14px', fontSize: '14px', fontWeight: 600,
                    color: '#8B95A1', cursor: 'pointer', letterSpacing: '-0.2px',
                    transition: 'background 0.15s',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3v10M3 8h10" stroke="#8B95A1" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  토론 더하기
                </button>
                <p style={{ fontSize: '15px', color: '#8B95A1', textAlign: 'center', margin: '20px 0 0', letterSpacing: '-0.2px' }}>
                  다른 관점으로 한 번 더 토론해보세요
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes msgSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
