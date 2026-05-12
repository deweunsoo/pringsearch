import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

interface Props {
  text: string
  style?: CSSProperties
  maxFontSize?: number
  minFontSize?: number
}

export default function OneLineHeadline({ text, style, maxFontSize = 24, minFontSize = 14 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(maxFontSize)
  const [scaleX, setScaleX] = useState(1)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const fit = () => {
      const availableWidth = container.clientWidth
      if (!availableWidth) return

      const probe = document.createElement('span')
      probe.style.position = 'absolute'
      probe.style.visibility = 'hidden'
      probe.style.whiteSpace = 'nowrap'
      probe.style.fontWeight = String(style?.fontWeight ?? 700)
      probe.style.letterSpacing = String(style?.letterSpacing ?? '0')
      probe.style.fontFamily = window.getComputedStyle(container).fontFamily
      probe.textContent = text
      document.body.appendChild(probe)

      let chosen = minFontSize
      for (let size = maxFontSize; size >= minFontSize; size--) {
        probe.style.fontSize = `${size}px`
        if (probe.getBoundingClientRect().width <= availableWidth) {
          chosen = size
          break
        }
      }
      probe.style.fontSize = `${chosen}px`
      const measuredWidth = probe.getBoundingClientRect().width
      document.body.removeChild(probe)

      setFontSize(chosen)
      setScaleX(measuredWidth > availableWidth && measuredWidth > 0 ? availableWidth / measuredWidth : 1)
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(container)
    return () => ro.disconnect()
  }, [text, style?.fontWeight, style?.letterSpacing])

  return (
    <div ref={containerRef} style={{ width: '100%', overflow: 'hidden', margin: style?.margin }}>
      <p
        style={{
          ...style,
          margin: 0,
          fontSize: `${fontSize}px`,
          whiteSpace: 'nowrap',
          transform: scaleX < 1 ? `scaleX(${scaleX})` : undefined,
          transformOrigin: 'left center',
        }}
      >
        {text}
      </p>
    </div>
  )
}
