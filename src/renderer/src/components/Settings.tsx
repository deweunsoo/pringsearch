import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface RssSource {
  name: string
  url: string
  enabled: boolean
}

interface AppConfig {
  scheduleHour: number
  scheduleMinute: number
  anthropicApiKey: string
  rssSources: RssSource[]
  keywords: string[]
  notificationEnabled: boolean
  openAtLogin: boolean
  setupCompleted: boolean
  dataPath: string
  fetchPeriodDays: number
  downloadPath?: string
}

interface Props {
  onBack: () => void
  onRunNow: () => void
}

export default function Settings({ onBack, onRunNow }: Props) {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [newKeyword, setNewKeyword] = useState('')
  const [newRssName, setNewRssName] = useState('')
  const [newRssUrl, setNewRssUrl] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [aiProvider, setAiProvider] = useState<{ provider: string; path: string | null } | null>(null)

  useEffect(() => {
    window.api.getConfig().then(setConfig)
    window.api.detectAi().then(setAiProvider)
  }, [])

  const save = async (updated: Partial<AppConfig>) => {
    if (!config) return
    const newConfig = { ...config, ...updated }
    setConfig(newConfig)
    await window.api.saveConfig(newConfig)
  }

  if (!config) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, fontSize: '15px', color: '#8B95A1' }}>
      로딩 중...
    </div>
  )

  return (
    <>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '2.5px',
        marginBottom: '12px'
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
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#6b7280', letterSpacing: '0.5px', margin: 0 }}>설정</h2>
        </div>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            color: '#8B95A1',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          닫기
        </button>
      </div>

      <div className="scrollable" style={{ overflowY: 'auto', flex: 1, minHeight: 0, paddingBottom: '12px' }}>

        {/* 리서치 시간 */}
        <SectionCard>
          <SectionLabel>매일 이 시간에 알려드려요</SectionLabel>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AmPmToggle
              isAm={config.scheduleHour < 12}
              onChange={isAm => {
                const h12 = config.scheduleHour % 12 || 12
                save({ scheduleHour: isAm ? (h12 === 12 ? 0 : h12) : (h12 === 12 ? 12 : h12 + 12) })
              }}
            />
            <TimeInput
              value={config.scheduleHour % 12 || 12}
              max={12}
              min={1}
              onChange={v => {
                const isAm = config.scheduleHour < 12
                save({ scheduleHour: isAm ? (v === 12 ? 0 : v) : (v === 12 ? 12 : v + 12) })
              }}
            />
            <span style={{ fontSize: '14px', color: '#6B7684', fontWeight: 500 }}>시</span>
            <TimeInput
              value={config.scheduleMinute}
              max={59}
              min={0}
              onChange={v => save({ scheduleMinute: v })}
            />
            <span style={{ fontSize: '14px', color: '#6B7684', fontWeight: 500 }}>분</span>
          </div>
        </SectionCard>

        {/* 수집 기간 */}
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#8B95A1', letterSpacing: '-0.1px' }}>최근 며칠치를 볼까요?</span>
            <Tooltip text="선택한 기간 내에 올라온 글만 모아서 분석해요. 기간이 길수록 더 많은 글을 한번에 확인할 수 있어요." />
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[3, 7, 14, 30].map(d => (
              <button
                key={d}
                onClick={() => save({ fetchPeriodDays: d })}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  letterSpacing: '-0.2px',
                  transition: 'all 0.15s',
                  background: (config.fetchPeriodDays || 7) === d ? '#4E5968' : '#F2F4F6',
                  color: (config.fetchPeriodDays || 7) === d ? '#fff' : '#8B95A1'
                }}
              >
                {d}일
              </button>
            ))}
          </div>
        </SectionCard>

        {/* RSS 소스 */}
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#8B95A1', letterSpacing: '-0.1px' }}>어디서 글을 가져올까요?</span>
            <span style={{ fontSize: '12px', color: '#B0B8C1', fontWeight: 500 }}>{config.rssSources.length}/10</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {config.rssSources.map((source, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 0',
                  borderBottom: i < config.rssSources.length - 1 ? '1px solid #F2F4F6' : 'none'
                }}
              >
                <CustomCheckbox
                  checked={source.enabled}
                  onChange={checked => {
                    const updated = [...config.rssSources]
                    updated[i] = { ...source, enabled: checked }
                    save({ rssSources: updated })
                  }}
                />
                <span style={{ fontSize: '15px', color: '#333D4B', flex: 1, letterSpacing: '-0.2px' }}>{source.name}</span>
                <button
                  onClick={() => save({ rssSources: config.rssSources.filter((_, j) => j !== i) })}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#B0B8C1',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
            <input
              value={newRssName}
              onChange={e => setNewRssName(e.target.value)}
              placeholder="예: TechCrunch"
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              value={newRssUrl}
              onChange={e => setNewRssUrl(e.target.value)}
              placeholder="주소 붙여넣기"
              style={{ ...inputStyle, flex: 2 }}
            />
            <button
              disabled={config.rssSources.length >= 10}
              onClick={() => {
                if (newRssName && newRssUrl && config.rssSources.length < 10) {
                  save({ rssSources: [...config.rssSources, { name: newRssName, url: newRssUrl, enabled: true }] })
                  setNewRssName('')
                  setNewRssUrl('')
                }
              }}
              style={{
                background: config.rssSources.length >= 10 ? '#D1D6DB' : '#4E5968',
                border: 'none',
                borderRadius: '10px',
                cursor: config.rssSources.length >= 10 ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                color: '#fff',
                padding: '0 14px',
                flexShrink: 0,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                opacity: config.rssSources.length >= 10 ? 0.5 : 1
              }}
            >
              +
            </button>
          </div>
        </SectionCard>

        {/* 관심 키워드 */}
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#8B95A1', letterSpacing: '-0.1px' }}>관심 키워드</span>
            <span style={{ fontSize: '12px', color: '#B0B8C1', fontWeight: 500 }}>{config.keywords.length}/10</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {config.keywords.map((kw, i) => (
              <span key={i} style={{
                background: '#F2F4F6',
                borderRadius: '8px',
                padding: '6px 10px 6px 12px',
                fontSize: '14px',
                color: '#4E5968',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                letterSpacing: '-0.2px'
              }}>
                {kw}
                <button
                  onClick={() => save({ keywords: config.keywords.filter((_, j) => j !== i) })}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#B0B8C1',
                    padding: '0 0 0 2px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M4 4L10 10M10 4L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </span>
            ))}
          </div>
          <input
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newKeyword.trim() && config.keywords.length < 10) {
                save({ keywords: [...config.keywords, newKeyword.trim()] })
                setNewKeyword('')
              }
            }}
            placeholder="키워드 추가 (Enter)"
            style={inputStyle}
          />
        </SectionCard>

        {/* AI 엔진 */}
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#8B95A1', letterSpacing: '-0.1px' }}>AI 엔진</span>
            <Tooltip text="기사 분석에 사용할 AI를 자동으로 감지해요. Claude Code나 Gemini CLI가 설치되어 있으면 자동으로 사용됩니다." />
          </div>
          {aiProvider && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              background: aiProvider.provider !== 'none' ? '#EBF8EE' : '#FFF3E0',
              borderRadius: '10px',
              marginBottom: config.anthropicApiKey ? '0' : '10px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: aiProvider.provider !== 'none' ? '#22C55E' : '#F59E0B',
                flexShrink: 0
              }} />
              <span style={{ fontSize: '14px', color: '#333D4B', letterSpacing: '-0.2px' }}>
                {aiProvider.provider === 'claude' && 'Claude CLI 자동 감지됨'}
                {aiProvider.provider === 'gemini' && 'Gemini CLI 자동 감지됨'}
                {aiProvider.provider === 'api-key' && 'API 키 사용 중'}
                {aiProvider.provider === 'none' && 'AI CLI를 찾을 수 없어요'}
              </span>
            </div>
          )}
          {(!aiProvider || aiProvider.provider === 'none' || config.anthropicApiKey) && (
            <div style={{ marginTop: '10px' }}>
              <span style={{ fontSize: '12px', color: '#8B95A1', letterSpacing: '-0.1px' }}>
                {aiProvider?.provider === 'none' ? 'API 키를 직접 입력해주세요' : 'API 키 (선택사항)'}
              </span>
              <input
                value={config.anthropicApiKey || ''}
                onChange={e => save({ anthropicApiKey: e.target.value })}
                placeholder="sk-ant-..."
                type="password"
                style={{ ...inputStyle, marginTop: '6px' }}
              />
            </div>
          )}
        </SectionCard>

        {/* macOS 알림 & 자동 시작 */}
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: '#333D4B', letterSpacing: '-0.2px' }}>macOS 알림</span>
            <ToggleSwitch
              checked={config.notificationEnabled}
              onChange={v => save({ notificationEnabled: v })}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '15px', fontWeight: 500, color: '#333D4B', letterSpacing: '-0.2px' }}>로그인 시 자동 시작</span>
              <p style={{ fontSize: '12px', color: '#8B95A1', margin: '4px 0 0', letterSpacing: '-0.2px' }}>잠자기 중에도 설정한 시간에 알림을 받을 수 있어요</p>
            </div>
            <ToggleSwitch
              checked={config.openAtLogin ?? false}
              onChange={v => save({ openAtLogin: v })}
            />
          </div>
        </SectionCard>


      </div>

      {/* 하단 버튼 */}
      <button
        onClick={() => {
          setShowToast(true)
          setTimeout(() => setShowToast(false), 1800)
        }}
        style={{
          width: '100%',
          padding: '14px',
          background: '#3182F6',
          color: '#fff',
          fontSize: '16px',
          fontWeight: 600,
          borderRadius: '12px',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
          letterSpacing: '-0.2px',
          transition: 'background 0.15s',
          marginTop: '8px'
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#1B64DA')}
        onMouseLeave={e => (e.currentTarget.style.background = '#3182F6')}
      >
        {showToast ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.25)'
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            저장 완료
          </span>
        ) : '저장'}
      </button>
    </>
  )
}

/* ── Sub-components ── */

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos({ top: rect.top - 6, left: rect.left + rect.width / 2 })
    }
    setShow(true)
  }

  return (
    <span
      ref={ref}
      style={{ display: 'inline-flex', alignItems: 'center', cursor: 'default' }}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: '#8B95A1',
        fontSize: '12px',
        fontWeight: 700,
        color: '#fff',
        lineHeight: 1
      }}>?</span>
      {show && createPortal(
        <div style={{
          position: 'fixed',
          top: pos.top,
          left: Math.max(110, Math.min(pos.left, window.innerWidth - 110)),
          transform: 'translate(-50%, -100%)',
          background: '#333D4B',
          color: '#fff',
          fontSize: '12px',
          fontWeight: 400,
          lineHeight: 1.5,
          padding: '8px 12px',
          borderRadius: '8px',
          width: '200px',
          whiteSpace: 'normal',
          letterSpacing: '-0.2px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          {text}
        </div>,
        document.body
      )}
    </span>
  )
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '14px',
      padding: '16px',
      marginBottom: '10px',
      border: '1px solid #F2F4F6'
    }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '13px',
      fontWeight: 600,
      color: '#8B95A1',
      marginBottom: '10px',
      letterSpacing: '-0.1px'
    }}>
      {children}
    </div>
  )
}

function AmPmToggle({ isAm, onChange }: { isAm: boolean; onChange: (isAm: boolean) => void }) {
  const base: React.CSSProperties = {
    padding: '8px 14px',
    fontSize: '16px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    letterSpacing: '-0.2px',
    transition: 'all 0.15s'
  }
  return (
    <div style={{ display: 'flex', background: '#F2F4F6', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
      <button
        onClick={() => onChange(true)}
        style={{ ...base, background: isAm ? '#4E5968' : 'transparent', color: isAm ? '#fff' : '#8B95A1', borderRadius: '10px 0 0 10px' }}
      >
        오전
      </button>
      <button
        onClick={() => onChange(false)}
        style={{ ...base, background: !isAm ? '#4E5968' : 'transparent', color: !isAm ? '#fff' : '#8B95A1', borderRadius: '0 10px 10px 0' }}
      >
        오후
      </button>
    </div>
  )
}

function TimeInput({ value, max, min = 0, onChange }: { value: number; max: number; min?: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{
        ...inputStyle,
        width: '56px',
        textAlign: 'center',
        fontWeight: 600,
        fontSize: '16px',
        padding: '8px 4px'
      }}
    />
  )
}

function CustomCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: '22px',
        height: '22px',
        borderRadius: '6px',
        border: checked ? 'none' : '1.5px solid #D1D6DB',
        background: checked ? '#3182F6' : '#fff',
        cursor: 'pointer',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.15s'
      }}
    >
      {checked && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3.5 7L6 9.5L10.5 4.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: '48px',
        height: '28px',
        borderRadius: '14px',
        background: checked ? '#3182F6' : '#D1D6DB',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        padding: 0,
        flexShrink: 0
      }}
    >
      <div style={{
        width: '22px',
        height: '22px',
        background: '#fff',
        borderRadius: '50%',
        position: 'absolute',
        top: '3px',
        left: checked ? '23px' : '3px',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
      }} />
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#F2F4F6',
  border: '1px solid transparent',
  borderRadius: '10px',
  padding: '10px 14px',
  fontSize: '15px',
  color: '#333D4B',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  letterSpacing: '-0.2px',
  transition: 'border-color 0.15s'
}
