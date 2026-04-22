import type { FC } from 'react'

interface Props {
  categories: string[]
  active: string
  onChange: (name: string) => void
  showBorder?: boolean
}

const CategoryTabs: FC<Props> = ({ categories, active, onChange, showBorder }) => {
  if (categories.length === 0) return null
  return (
    <div
      className="hide-scrollbar"
      style={{
        display: 'flex',
        gap: 4,
        overflowX: 'auto',
        padding: '4px 4px 6px 0',
        flexShrink: 0,
        borderBottom: showBorder ? '1px solid #E5E7EB' : 'none',
      }}
    >
      {categories.map(name => {
        const isActive = name === active
        return (
          <button
            key={name}
            onClick={() => onChange(name)}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F2F4F6' }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            style={{
              padding: '5px 10px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: isActive ? 600 : 500,
              background: isActive ? '#191F28' : 'transparent',
              color: isActive ? '#FFFFFF' : '#8B95A1',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.2px',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {name}
          </button>
        )
      })}
    </div>
  )
}

export default CategoryTabs
