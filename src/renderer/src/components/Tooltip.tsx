import { useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  text: string
  children: ReactNode
}

export default function Tooltip({ text, children }: Props) {
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
      {children}
      {show && createPortal(
        <div style={{
          position: 'fixed',
          top: pos.top,
          left: Math.max(110, Math.min(pos.left, window.innerWidth - 110)),
          transform: 'translate(-50%, -100%)',
          background: '#333D4B',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 400,
          lineHeight: 1.5,
          padding: '10px 14px',
          borderRadius: '8px',
          width: '200px',
          whiteSpace: 'pre-line',
          letterSpacing: '-0.2px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          pointerEvents: 'none',
        }}>
          {text}
        </div>,
        document.body,
      )}
    </span>
  )
}
