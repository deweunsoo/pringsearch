import { assessExternalUrl } from '../../../shared/url-safety'
import Tooltip from './Tooltip'

interface Props {
  url: string
}

export default function LinkSafetyBadge({ url }: Props) {
  const assessment = assessExternalUrl(url)
  const tone = assessment.level === 'blocked'
    ? { color: '#E5484D', bg: '#FFF1F1', border: '#FFC9C9' }
    : assessment.trust === 'trusted'
      ? { color: '#008A3D', bg: '#F0FFF5', border: '#B9F6CA' }
      : { color: '#8B5E00', bg: '#FFF8E6', border: '#FFE1A6' }

  const icon = assessment.level === 'blocked' ? (
    <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  ) : assessment.trust === 'trusted' ? (
    <path d="M3 6.2l2.2 2L9 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  ) : (
    <>
      <path d="M6 3.2v3.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="6" cy="8.7" r="0.85" fill="currentColor" />
    </>
  )

  const tooltipText = assessment.reasons.length > 0
    ? assessment.reasons.join('\n')
    : '신뢰 소스 목록에 있는 도메인이에요.'

  return (
    <Tooltip text={tooltipText}>
      <span
        className="link-safety-badge"
        style={{
          color: tone.color,
          background: tone.bg,
          border: `1px solid ${tone.border}`,
        }}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          {icon}
        </svg>
      </span>
    </Tooltip>
  )
}
