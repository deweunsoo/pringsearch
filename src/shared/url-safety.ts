export type UrlSafetyLevel = 'normal' | 'caution' | 'blocked'
export type UrlTrustStatus = 'trusted' | 'unknown'

export interface UrlSafetyAssessment {
  level: UrlSafetyLevel
  trust: UrlTrustStatus
  url: string | null
  host: string | null
  label: string
  reasons: string[]
}

const BLOCKED_DOWNLOAD_EXTENSIONS = new Set([
  '.app',
  '.bat',
  '.cmd',
  '.dmg',
  '.exe',
  '.jar',
  '.msi',
  '.pkg',
  '.ps1',
  '.scr',
  '.sh',
  '.zip',
])

const SHORTENER_HOSTS = new Set([
  'bit.ly',
  'buff.ly',
  'cutt.ly',
  'goo.gl',
  'is.gd',
  'ow.ly',
  'rebrand.ly',
  't.co',
  'tinyurl.com',
])

const TRUSTED_HOSTS = new Set([
  'arstechnica.com',
  'arxiv.org',
  'bbc.com',
  'coindesk.com',
  'developer.apple.com',
  'github.com',
  'medium.com',
  'news.ycombinator.com',
  'nngroup.com',
  'nytimes.com',
  'reddit.com',
  'smashingmagazine.com',
  'stackoverflow.com',
  'techcrunch.com',
  'technologyreview.com',
  'theverge.com',
  'wired.com',
  'x.com',
  'youtube.com',
])

function isIpv4(host: string): boolean {
  const parts = host.split('.')
  if (parts.length !== 4) return false
  return parts.every(part => {
    if (!/^\d+$/.test(part)) return false
    const n = Number(part)
    return n >= 0 && n <= 255
  })
}

function isPrivateIpv4(host: string): boolean {
  if (!isIpv4(host)) return false
  const [a, b] = host.split('.').map(Number)
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  )
}

function isLocalHost(host: string): boolean {
  const h = host.toLowerCase()
  return h === 'localhost' || h.endsWith('.localhost') || h === '0.0.0.0' || h === '::1' || isPrivateIpv4(h)
}

function getExtension(pathname: string): string {
  const clean = pathname.toLowerCase().replace(/\/+$/, '')
  const dot = clean.lastIndexOf('.')
  if (dot === -1) return ''
  return clean.slice(dot)
}

function isTrustedHost(host: string): boolean {
  return Array.from(TRUSTED_HOSTS).some(trusted => host === trusted || host.endsWith(`.${trusted}`))
}

export function assessExternalUrl(raw: string): UrlSafetyAssessment {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return {
      level: 'blocked',
      trust: 'unknown',
      url: null,
      host: null,
      label: '차단',
      reasons: ['링크 형식이 올바르지 않아요.'],
    }
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
  const reasons: string[] = []
  const trusted = isTrustedHost(host)
  let level: UrlSafetyLevel = trusted ? 'normal' : 'caution'
  let label = trusted ? '신뢰 소스' : '확인 불가'

  if (parsed.protocol !== 'https:') {
    return {
      level: 'blocked',
      trust: 'unknown',
      url: parsed.toString(),
      host,
      label: '차단',
      reasons: ['암호화된 https 링크가 아니라서 열지 않았어요.'],
    }
  }

  if (isLocalHost(host)) {
    return {
      level: 'blocked',
      trust: 'unknown',
      url: parsed.toString(),
      host,
      label: '차단',
      reasons: ['내 컴퓨터나 내부 네트워크로 연결되는 주소예요.'],
    }
  }

  const extension = getExtension(parsed.pathname)
  if (BLOCKED_DOWNLOAD_EXTENSIONS.has(extension)) {
    return {
      level: 'blocked',
      trust: trusted ? 'trusted' : 'unknown',
      url: parsed.toString(),
      host,
      label: '차단',
      reasons: [`${extension} 파일로 바로 연결되는 링크예요.`],
    }
  }

  if (!trusted) {
    reasons.push('신뢰 소스 목록에 없는 도메인이라 안전 여부를 확인할 수 없어요.')
  }

  if (SHORTENER_HOSTS.has(host)) {
    level = 'caution'
    label = '주의'
    reasons.push('단축 URL이라 실제 목적지를 확인하기 어려워요.')
  }

  if (host.includes('xn--')) {
    level = 'caution'
    label = '주의'
    reasons.push('도메인에 국제화 문자 변환 표기가 포함되어 있어요.')
  }

  if (host.length > 80 || host.split('.').length >= 5) {
    level = 'caution'
    label = '주의'
    reasons.push('도메인이 비정상적으로 길거나 복잡해요.')
  }

  if (isIpv4(host)) {
    level = 'caution'
    label = '주의'
    reasons.push('도메인 이름 대신 숫자 IP 주소를 사용해요.')
  }

  return {
    level,
    trust: trusted ? 'trusted' : 'unknown',
    url: parsed.toString(),
    host,
    label,
    reasons,
  }
}
