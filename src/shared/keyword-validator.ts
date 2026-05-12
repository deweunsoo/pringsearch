export interface KeywordValidation {
  valid: boolean
  reason?: string
}

export function validateKeyword(keyword: string): KeywordValidation {
  const trimmed = keyword.trim()
  if (!trimmed) {
    return { valid: false, reason: '키워드를 입력해주세요' }
  }

  if (/^[ㄱ-ㅎㅏ-ㅣ\s]+$/.test(trimmed)) {
    return { valid: false, reason: '완성된 글자로 입력해주세요' }
  }

  const compact = trimmed.replace(/\s+/g, '')
  const hasKorean = /[가-힯]/.test(compact)
  const hasEnglish = /[a-zA-Z]/.test(compact)

  if (!hasKorean && !hasEnglish) {
    return { valid: false, reason: '한글 또는 영문 키워드를 입력해주세요' }
  }

  if (hasKorean && !hasEnglish) {
    const koreanCount = (compact.match(/[가-힯]/g) || []).length
    if (koreanCount < 2) {
      return { valid: false, reason: '한글 키워드는 2자 이상으로 입력해주세요' }
    }
  }

  if (hasEnglish && !hasKorean) {
    const englishCount = (compact.match(/[a-zA-Z]/g) || []).length
    if (englishCount < 3) {
      return { valid: false, reason: '영문 키워드는 3자 이상으로 입력해주세요' }
    }
  }

  return { valid: true }
}
