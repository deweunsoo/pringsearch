import { useState, useEffect } from 'react'

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
  dataPath: string
}

interface Props {
  onBack: () => void
  onRunNow: () => void
}

const label: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: 'rgba(0,0,0,0.5)',
  display: 'block',
  marginBottom: '6px'
}

const input: React.CSSProperties = {
  background: 'rgba(0,0,0,0.06)',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: '10px',
  padding: '8px 12px',
  fontSize: '15px',
  color: 'rgba(0,0,0,0.8)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box'
}

const section: React.CSSProperties = {
  marginBottom: '20px'
}

export default function Settings({ onBack, onRunNow }: Props) {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [newKeyword, setNewKeyword] = useState('')
  const [newRssName, setNewRssName] = useState('')
  const [newRssUrl, setNewRssUrl] = useState('')

  useEffect(() => {
    window.api.getConfig().then(setConfig)
  }, [])

  const save = async (updated: Partial<AppConfig>) => {
    if (!config) return
    const newConfig = { ...config, ...updated }
    setConfig(newConfig)
    await window.api.saveConfig(newConfig)
  }

  if (!config) return <div style={{ fontSize: '15px', color: 'rgba(0,0,0,0.4)' }}>로딩 중...</div>

  return (
    <>
    {/* Header - 상단 고정 */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexShrink: 0 }}>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'rgba(0,0,0,0.5)', padding: 0 }}
      >
        &larr;
      </button>
      <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>설정</h2>
    </div>

    <div className="scrollable" style={{ overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: '0px' }}>

      {/* 리서치 시간 */}
      <div style={section}>
        <span style={label}>리서치 시간</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number" min={0} max={23}
            value={config.scheduleHour}
            onChange={e => save({ scheduleHour: Number(e.target.value) })}
            style={{ ...input, width: '64px', textAlign: 'center' }}
          />
          <span style={{ fontSize: '15px', color: 'rgba(0,0,0,0.5)' }}>시</span>
          <input
            type="number" min={0} max={59}
            value={config.scheduleMinute}
            onChange={e => save({ scheduleMinute: Number(e.target.value) })}
            style={{ ...input, width: '64px', textAlign: 'center' }}
          />
          <span style={{ fontSize: '15px', color: 'rgba(0,0,0,0.5)' }}>분</span>
        </div>
      </div>

      {/* Claude API Key */}
      <div style={section}>
        <span style={label}>Claude API Key</span>
        <input
          type="password"
          value={config.anthropicApiKey}
          onChange={e => save({ anthropicApiKey: e.target.value })}
          placeholder="API Key 입력"
          style={input}
        />
      </div>

      {/* RSS 소스 */}
      <div style={section}>
        <span style={label}>RSS 소스</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {config.rssSources.map((source, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', background: 'rgba(255,255,255,0.35)', borderRadius: '8px' }}>
              <input
                type="checkbox"
                checked={source.enabled}
                onChange={e => {
                  const updated = [...config.rssSources]
                  updated[i] = { ...source, enabled: e.target.checked }
                  save({ rssSources: updated })
                }}
                style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '15px', color: 'rgba(0,0,0,0.7)', flex: 1 }}>{source.name}</span>
              <button
                onClick={() => save({ rssSources: config.rssSources.filter((_, j) => j !== i) })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'rgba(220,60,60,0.7)', padding: 0 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
          <input
            value={newRssName}
            onChange={e => setNewRssName(e.target.value)}
            placeholder="이름"
            style={{ ...input, flex: 1 }}
          />
          <input
            value={newRssUrl}
            onChange={e => setNewRssUrl(e.target.value)}
            placeholder="RSS URL"
            style={{ ...input, flex: 2 }}
          />
          <button
            onClick={() => {
              if (newRssName && newRssUrl) {
                save({ rssSources: [...config.rssSources, { name: newRssName, url: newRssUrl, enabled: true }] })
                setNewRssName('')
                setNewRssUrl('')
              }
            }}
            style={{ background: 'rgba(59,130,246,0.15)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '18px', color: '#3b82f6', padding: '6px 14px', flexShrink: 0 }}
          >
            +
          </button>
        </div>
      </div>

      {/* 관심 키워드 */}
      <div style={section}>
        <span style={label}>관심 키워드</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {config.keywords.map((kw, i) => (
            <span key={i} style={{
              background: 'rgba(255,255,255,0.5)',
              borderRadius: '20px',
              padding: '5px 12px',
              fontSize: '14px',
              color: 'rgba(0,0,0,0.65)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(255,255,255,0.4)'
            }}>
              {kw}
              <button
                onClick={() => save({ keywords: config.keywords.filter((_, j) => j !== i) })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'rgba(220,60,60,0.6)', padding: 0 }}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <input
          value={newKeyword}
          onChange={e => setNewKeyword(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && newKeyword) {
              save({ keywords: [...config.keywords, newKeyword] })
              setNewKeyword('')
            }
          }}
          placeholder="키워드 추가 (Enter)"
          style={input}
        />
      </div>

      {/* macOS 알림 */}
      <div style={{ ...section, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '15px', fontWeight: 500, color: 'rgba(0,0,0,0.5)' }}>macOS 알림</span>
        <button
          onClick={() => save({ notificationEnabled: !config.notificationEnabled })}
          style={{
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            background: config.notificationEnabled ? '#3b82f6' : 'rgba(0,0,0,0.15)',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s'
          }}
        >
          <div style={{
            width: '20px',
            height: '20px',
            background: '#fff',
            borderRadius: '50%',
            position: 'absolute',
            top: '2px',
            left: config.notificationEnabled ? '22px' : '2px',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }} />
        </button>
      </div>

    </div>

    {/* 저장 - 하단 고정 */}
    <button
      onClick={onRunNow}
      style={{
        width: '100%',
        padding: '12px',
        background: '#3b82f6',
        color: '#fff',
        fontSize: '16px',
        fontWeight: 600,
        borderRadius: '12px',
        border: 'none',
        cursor: 'pointer',
        marginTop: '12px',
        flexShrink: 0
      }}
    >
      저장
    </button>
    </>
  )
}
