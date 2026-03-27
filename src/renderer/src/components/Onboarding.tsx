import { useState } from 'react'
import { CatIcon } from './icons'

interface Props {
  onComplete: () => void
}

export default function Onboarding({ onComplete }: Props) {
  const [hour, setHour] = useState(10)
  const [minute, setMinute] = useState(30)
  const [isAm, setIsAm] = useState(true)
  const [openAtLogin, setOpenAtLogin] = useState(true)
  const [step, setStep] = useState(0)

  const save = async () => {
    const scheduleHour = isAm ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12)
    const config = await window.api.getConfig()
    await window.api.saveConfig({
      ...config,
      scheduleHour,
      scheduleMinute: minute,
      openAtLogin,
      setupCompleted: true
    })
    onComplete()
  }

  return (
    <div style={{
      height: '100vh',
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

      {step === 0 && (
        <div style={{ textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
            <CatIcon size={80} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#333D4B', marginBottom: '8px', letterSpacing: '-0.3px' }}>
            Pringsearch에 오신 걸 환영해요
          </h1>
          <p style={{ fontSize: '18px', color: '#4b5563', lineHeight: 1.6, letterSpacing: '-0.2px', margin: 0, textAlign: 'center' }}>
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

      {step === 1 && (
        <div style={{ width: '100%', maxWidth: '360px', animation: 'fadeIn 0.4s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '32px' }}>
            <div style={{ width: '24px', height: '6px', borderRadius: '3px', background: '#3182F6' }} />
            <div style={{ width: '24px', height: '6px', borderRadius: '3px', background: '#E5E8EB' }} />
          </div>
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
            <div style={{ display: 'flex', background: '#F2F4F6', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
              <button
                onClick={() => setIsAm(true)}
                style={{
                  padding: '10px 16px',
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
                  padding: '10px 16px',
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
                padding: '10px 4px',
                fontSize: '18px',
                fontWeight: 600,
                color: '#333D4B',
                width: '56px',
                textAlign: 'center',
                outline: 'none',
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
                padding: '10px 4px',
                fontSize: '18px',
                fontWeight: 600,
                color: '#333D4B',
                width: '56px',
                textAlign: 'center',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '16px', color: '#6B7684', fontWeight: 500 }}>분</span>
          </div>

          <button
            onClick={() => setStep(2)}
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

      {step === 2 && (
        <div style={{ width: '100%', maxWidth: '360px', animation: 'fadeIn 0.4s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '32px' }}>
            <div style={{ width: '24px', height: '6px', borderRadius: '3px', background: '#E5E8EB' }} />
            <div style={{ width: '24px', height: '6px', borderRadius: '3px', background: '#3182F6' }} />
          </div>
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
                width: '40px', height: '40px',
                borderRadius: '12px',
                background: openAtLogin ? '#3182F6' : '#F2F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10l4 4 8-8" stroke={openAtLogin ? '#fff' : '#8B95A1'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
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
                width: '40px', height: '40px',
                borderRadius: '12px',
                background: '#F2F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M6 6l8 8M14 6l-8 8" stroke="#8B95A1" strokeWidth="2" strokeLinecap="round"/>
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
