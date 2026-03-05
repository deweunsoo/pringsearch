import { ChartIcon } from './icons'

interface HeaderProps {
  currentDate: string
  generatedAt?: string
  onSettingsClick: () => void
  onClear: () => void
  loading: boolean
  scrolled?: boolean
}

const SettingsIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.26.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/>
  </svg>
)

export default function Header({ onSettingsClick, onClear, loading, scrolled }: HeaderProps) {
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
          PRINGSEARCH
          <svg width="20" height="19" viewBox="0 0 32 31" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="15.8125" cy="17" rx="14.5" ry="13.5" fill="#FDB731"/>
            <path d="M9.04221 1.13304L3.75781 9.5L13.2578 4L10.6403 1.00853C10.1999 0.505286 9.39929 0.567667 9.04221 1.13304Z" fill="#FDB731"/>
            <path d="M22.1944 1.05704L27.4897 9L17.9897 3.78947L20.6278 0.933252C21.067 0.457728 21.8354 0.518444 22.1944 1.05704Z" fill="#FDB731"/>
            <circle cx="11.4453" cy="14.3125" r="1.8125" fill="#000006"/>
            <circle cx="19.1328" cy="14.3125" r="1.8125" fill="#000006"/>
            <path d="M12.5625 20.6875L15.8125 18.375L17.7188 19.6875" stroke="#FE5B00" strokeLinecap="round"/>
            <path d="M16.2521 18.7063C16.0148 18.9619 15.6102 18.9619 15.3729 18.7063L14.3201 17.5728C13.9635 17.1889 14.2358 16.5645 14.7597 16.5645L16.8653 16.5645C17.3892 16.5645 17.6615 17.1889 17.3049 17.5728L16.2521 18.7063Z" fill="#FE5B00"/>
            <path d="M3.75 17.1875L0.5 16.625M3.75 20.3125L0.5 21.0625" stroke="#000006" strokeLinecap="round"/>
            <path d="M27.8022 17.1875L31 16.625M27.8022 20.3125L31 21.0625" stroke="#000006" strokeLinecap="round"/>
          </svg>
        </h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          className="header-icon-btn"
          onClick={onClear}
          disabled={loading}
          style={{ opacity: loading ? 0.5 : 1 }}
          data-tooltip="Clear"
        >
          <ChartIcon />
        </button>
        <button
          className="header-icon-btn"
          onClick={onSettingsClick}
          style={{ color: 'var(--color-gray-8)' }}
          data-tooltip="Setting"
        >
          <SettingsIcon />
        </button>
      </div>
    </div>
  )
}
