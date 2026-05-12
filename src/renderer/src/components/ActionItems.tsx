import BoldText from './BoldText'
import OneLineHeadline from './OneLineHeadline'

interface ActionItem {
  text: string
  category: 'study' | 'apply' | 'explore'
}

interface Props {
  actions: ActionItem[]
  headline?: string
}

const categoryStyle: Record<string, { bg: string; color: string }> = {
  study: { bg: '#D0E8FF', color: '#2563C9' },
  apply: { bg: '#C8F0D8', color: '#15803D' },
  explore: { bg: '#FFE4B8', color: '#B85C00' }
}

const categoryLabel: Record<string, string> = {
  study: '학습',
  apply: '적용',
  explore: '탐색'
}

const categoryOrder: Record<string, number> = { study: 0, explore: 1, apply: 2 }

export default function ActionItems({ actions, headline }: Props) {
  if (actions.length === 0) return null

  const sorted = [...actions].sort((a, b) => (categoryOrder[a.category] ?? 9) - (categoryOrder[b.category] ?? 9))

  return (
    <div>
      <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#3182F6', marginBottom: '6px', letterSpacing: '-0.2px' }}>실무 적용 제안</h2>
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
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sorted.map((action, i) => {
          const cs = categoryStyle[action.category] || { bg: '#F2F4F6', color: '#4E5968' }
          return (
            <li key={i} style={{
              fontSize: '17px',
              color: '#333D4B',
              lineHeight: 1.6,
              letterSpacing: '0em',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              wordBreak: 'keep-all'
            }}>
              <span style={{
                fontSize: '13px',
                fontWeight: 600,
                background: cs.bg,
                color: cs.color,
                borderRadius: '6px',
                padding: '3px 10px',
                flexShrink: 0,
                marginTop: '3px',
                letterSpacing: '0px'
              }}>
                {categoryLabel[action.category] || action.category}
              </span>
              <span><BoldText text={action.text} /></span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
