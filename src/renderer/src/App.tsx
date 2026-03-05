import { useState } from 'react'
import Header from './components/Header'
import TrendSummary from './components/TrendSummary'
import InsightCards from './components/InsightCard'
import ActionItems from './components/ActionItems'
import DateNav from './components/DateNav'
import Settings from './components/Settings'
import { useResearch } from './hooks/useResearch'
import { CatIcon, CaterpillarIcon, DocListIcon } from './components/icons'

export default function App() {
  const { research, loading, currentDate, loadResearch, runNow } = useResearch()
  const [showSettings, setShowSettings] = useState(false)

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
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {showSettings ? (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Settings onBack={() => setShowSettings(false)} onRunNow={runNow} />
        </div>
      ) : (
        <>
          <Header
            currentDate={currentDate}
            generatedAt={research?.generatedAt}
            onSettingsClick={() => setShowSettings(true)}
            onRefresh={runNow}
            loading={loading}
          />

          <div className="scrollable" style={{ flex: 1, overflowY: 'auto', marginRight: '-20px', paddingRight: '20px' }}>
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '4px' }}>
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

            {!loading && !research && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
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
            )}

            {!loading && research && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <TrendSummary trends={research.trends || []} />
                <InsightCards insights={research.insights || []} />
                <ActionItems actions={research.actions || []} />
              </div>
            )}
          </div>

          <DateNav currentDate={currentDate} onDateChange={loadResearch} />
        </>
      )}
    </div>
  )
}
