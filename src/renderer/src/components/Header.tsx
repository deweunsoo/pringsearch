import { ChartIcon, ChatIcon } from './icons'

interface HeaderProps {
  currentDate: string
  generatedAt?: string
  onSettingsClick: () => void
  onChatClick: () => void
  onClear: () => void
  loading: boolean
  scrolled?: boolean
  chatCount?: number
}

const SettingsIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.26.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/>
  </svg>
)

export default function Header({ onSettingsClick, onChatClick, onClear, loading, scrolled, chatCount }: HeaderProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
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
        <h1 style={{ fontSize: '15px', fontWeight: 500, color: '#6b7280', letterSpacing: '0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          Pringsearch
          {import.meta.env.DEV && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#F59E0B', background: '#FEF3C7', borderRadius: '4px', padding: '1px 5px', letterSpacing: '0.5px' }}>DEV</span>
          )}
        </h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          className="header-icon-btn"
          onClick={onClear}
          disabled={loading}
          style={{ opacity: loading ? 0.5 : 1 }}
          data-tooltip="초기화"
        >
          <ChartIcon />
        </button>
        <button
          className="header-icon-btn"
          onClick={onChatClick}
          style={{ color: 'var(--color-gray-8)', position: 'relative' }}
          data-tooltip="토론"
        >
          <ChatIcon size={23} />
          {chatCount !== undefined && chatCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '2px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#3B82F6',
            }} />
          )}
        </button>
        <button
          className="header-icon-btn"
          onClick={onSettingsClick}
          style={{ color: 'var(--color-gray-8)' }}
          data-tooltip="설정"
        >
          <SettingsIcon />
        </button>
      </div>
    </div>
  )
}
