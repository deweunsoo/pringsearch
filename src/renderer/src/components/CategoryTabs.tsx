import type { FC } from 'react'

interface Props {
  categories: string[]
  active: string
  onChange: (name: string) => void
}

const CategoryTabs: FC<Props> = ({ categories, active, onChange }) => {
  if (categories.length <= 1) return null
  return (
    <div
      className="hide-scrollbar"
      style={{
        display: 'flex',
        gap: 2,
        overflowX: 'auto',
        padding: '8px 16px 0',
        flexShrink: 0,
      }}
    >
      {categories.map(name => {
        const isActive = name === active
        return (
          <button
            key={name}
            onClick={() => onChange(name)}
            style={{
              padding: '6px 12px',
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
