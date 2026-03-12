import { useState, useEffect, useRef } from 'react'

interface DiscussionMessage {
  role: '사원' | '대리' | '과장' | '사장'
  text: string
}

interface DiscussionChatProps {
  messages: DiscussionMessage[]
  loading: boolean
  onStart: () => void
}

const CHARACTER_COLORS: Record<string, string> = {
  '사원': '#3B82F6',
  '대리': '#059669',
  '과장': '#D97706',
  '사장': '#7C3AED',
}

const RIGHT_ROLES = new Set(['대리', '사장'])

export default function DiscussionChat({ messages, loading, onStart }: DiscussionChatProps) {
  const [visibleCount, setVisibleCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(0)

  useEffect(() => {
    if (messages.length === 0) {
      setVisibleCount(0)
      prevLengthRef.current = 0
      return
    }

    if (messages.length !== prevLengthRef.current) {
      prevLengthRef.current = messages.length
      setVisibleCount(0)

      let count = 0
      const interval = setInterval(() => {
        count++
        setVisibleCount(count)
        if (count >= messages.length) clearInterval(interval)
      }, 800)

      return () => clearInterval(interval)
    }
  }, [messages])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [visibleCount])

  const allVisible = visibleCount >= messages.length && messages.length > 0

  if (messages.length === 0 && !loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        padding: '24px 20px',
        borderTop: '1px solid #F2F4F6',
      }}>
        <button
          onClick={onStart}
          onMouseEnter={e => (e.currentTarget.style.background = '#F2F4F6')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: 'transparent',
            border: '1px dashed #D1D6DB',
            borderRadius: '12px',
            padding: '14px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#8B95A1',
            cursor: 'pointer',
            letterSpacing: '-0.2px',
            transition: 'background 0.15s',
            width: '100%',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4.5h12M2 8h8M2 11.5h10" stroke="#8B95A1" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          토론 시작
        </button>
        <p style={{ fontSize: '13px', color: '#B0B8C1', margin: 0, letterSpacing: '-0.2px' }}>
          4명의 동료가 리서치 결과를 토론합니다
        </p>
      </div>
    )
  }

  if (loading && messages.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '32px 20px',
        borderTop: '1px solid #F2F4F6',
      }}>
        <div className="spinner" style={{
          width: '24px',
          height: '24px',
          border: '2.5px solid #E5E7EB',
          borderTopColor: '#3B82F6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontSize: '14px', color: '#8B95A1', margin: 0, letterSpacing: '-0.2px' }}>
          토론 준비 중...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{
      borderTop: '1px solid #F2F4F6',
      padding: '16px 0 0',
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: 600,
        color: '#4E5968',
        padding: '0 20px 12px',
        letterSpacing: '-0.2px',
      }}>
        리서치 토론
      </div>

      <div
        ref={containerRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '0 20px 16px',
          maxHeight: '400px',
          overflowY: 'auto',
        }}
      >
        {messages.slice(0, visibleCount).map((msg, i) => {
          const isRight = RIGHT_ROLES.has(msg.role)
          const color = CHARACTER_COLORS[msg.role] || '#6B7280'

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: isRight ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: '8px',
                animation: 'fadeSlideIn 0.3s ease-out',
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 700,
                color: '#FFFFFF',
                flexShrink: 0,
              }}>
                {msg.role[0]}
              </div>

              <div style={{
                maxWidth: '75%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isRight ? 'flex-end' : 'flex-start',
              }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color,
                  marginBottom: '3px',
                  letterSpacing: '-0.2px',
                }}>
                  {msg.role}
                </span>
                <div style={{
                  background: isRight ? '#F8F9FA' : '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: isRight ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  lineHeight: '1.55',
                  color: '#333D4B',
                  letterSpacing: '-0.2px',
                }}>
                  {msg.text}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {allVisible && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '0 20px 16px',
        }}>
          <button
            onClick={onStart}
            onMouseEnter={e => (e.currentTarget.style.background = '#F2F4F6')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            style={{
              background: 'transparent',
              border: '1px solid #D1D6DB',
              borderRadius: '8px',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#8B95A1',
              cursor: 'pointer',
              letterSpacing: '-0.2px',
              transition: 'background 0.15s',
            }}
          >
            다시 토론하기
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
