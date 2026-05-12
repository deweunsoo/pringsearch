import BoldText from './BoldText'
import LinkSafetyBadge from './LinkSafetyBadge'
import OneLineHeadline from './OneLineHeadline'

interface TrendItem {
  keywords?: string[]
  text: string
  relatedUrls: string[]
}

interface Props {
  trends: TrendItem[]
  headline?: string
}

export default function TrendSummary({ trends, headline }: Props) {
  if (trends.length === 0) return null

  return (
    <div>
      <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#3182F6', marginBottom: '6px', letterSpacing: '-0.2px' }}>핵심 트렌드</h2>
      {headline && (
        <OneLineHeadline
          text={headline.replace(/\*\*/g, '')}
          style={{
            fontWeight: 700,
            color: '#191F28',
            lineHeight: 1.4,
            letterSpacing: '0em',
            margin: '0 0 16px 0',
          }}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {trends.map((trend, i) => (
          <div
            key={i}
            className="trend-item"
            onClick={() => trend.relatedUrls?.[0] && window.api.openExternalUrl(trend.relatedUrls[0])}
            style={{ cursor: trend.relatedUrls?.[0] ? 'pointer' : 'default' }}
          >
            <div>
              {(() => {
                const colonIdx = trend.text.indexOf(':')
                if (colonIdx === -1) return (
                  <p style={{ fontSize: '17px', color: '#333D4B', lineHeight: 1.6, letterSpacing: '0em', wordBreak: 'keep-all', margin: 0 }}>
                    <BoldText text={trend.text} />
                  </p>
                )
                const title = trend.text.slice(0, colonIdx).replace(/\*\*/g, '')
                const body = trend.text.slice(colonIdx + 1).trim()
                return (
                  <>
                    <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#333D4B', lineHeight: 1.6, letterSpacing: '0em', margin: '0 0 4px 0', wordBreak: 'keep-all' }}>{title}</h3>
                    <p style={{ fontSize: '17px', color: '#4E5968', lineHeight: 1.6, letterSpacing: '0em', wordBreak: 'keep-all', margin: 0 }}>
                      <BoldText text={body} />
                    </p>
                  </>
                )
              })()}
              {(trend.keywords?.[0] || trend.relatedUrls?.[0]) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
                  {trend.keywords?.[0] && (
                    <span className="trend-keyword-chip">{trend.keywords[0]}</span>
                  )}
                  {trend.relatedUrls?.[0] && (
                    <LinkSafetyBadge url={trend.relatedUrls[0]} />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
