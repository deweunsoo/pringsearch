import { useState, useEffect, useCallback, useRef } from 'react'

declare global {
  interface Window {
    api: {
      getResearch: (date: string) => Promise<any>
      getTodayResearch: () => Promise<any>
      getResearchDates: () => Promise<string[]>
      getConfig: () => Promise<any>
      saveConfig: (config: any) => Promise<void>
      runResearchNow: () => Promise<void>
      getBookmarks: () => Promise<any[]>
      saveBookmark: (item: any) => Promise<void>
      removeBookmark: (id: string) => Promise<void>
      onResearchComplete: (callback: (result: any) => void) => () => void
      saveMarkdown: (filePath: string, content: string) => Promise<void>
      pickFolder: () => Promise<string | null>
      runDiscussion: (research: any) => Promise<any[]>
    }
  }
}

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function useResearch() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(() => toLocalDateStr(new Date()))
  const loadingStartRef = { current: 0 }
  const isAddingRef = useRef(false)

  const loadResearch = useCallback(async (date: string) => {
    const result = await window.api.getResearch(date)
    setSessions(Array.isArray(result) ? result : result ? [result] : [])
    setCurrentDate(date)
  }, [])

  const runNow = useCallback(async () => {
    isAddingRef.current = false
    setSessions([])
    setLoading(true)
    loadingStartRef.current = Date.now()
    await window.api.runResearchNow()
  }, [])

  const addResearch = useCallback(async () => {
    isAddingRef.current = true
    setLoading(true)
    loadingStartRef.current = Date.now()
    await window.api.runResearchNow()
  }, [])

  useEffect(() => {
    window.api.getTodayResearch().then(result => {
      setSessions(Array.isArray(result) ? result : result ? [result] : [])
      setLoading(false)
    })

    const cleanup = window.api.onResearchComplete(result => {
      const elapsed = Date.now() - loadingStartRef.current
      const minDelay = Math.max(0, 5000 - elapsed)
      setTimeout(() => {
        if (result) {
          if (isAddingRef.current) {
            setSessions(prev => [...prev, result])
          } else {
            setSessions([result])
          }
          setCurrentDate(result.date)
        }
        isAddingRef.current = false
        setLoading(false)
      }, minDelay)
    })

    return cleanup
  }, [])

  const cancelAdd = useCallback(() => {
    isAddingRef.current = false
    setLoading(false)
  }, [])

  const clear = useCallback(() => {
    setSessions([])
    setLoading(false)
  }, [])

  const research = sessions.length > 0 ? sessions[0] : null

  return { research, sessions, loading, currentDate, loadResearch, runNow, addResearch, cancelAdd, clear }
}
