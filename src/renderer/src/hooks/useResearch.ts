import { useState, useEffect, useCallback } from 'react'

declare global {
  interface Window {
    api: {
      getResearch: (date: string) => Promise<any>
      getTodayResearch: () => Promise<any>
      getResearchDates: () => Promise<string[]>
      getConfig: () => Promise<any>
      saveConfig: (config: any) => Promise<void>
      runResearchNow: () => Promise<void>
      onResearchComplete: (callback: (result: any) => void) => () => void
    }
  }
}

export function useResearch() {
  const [research, setResearch] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split('T')[0])
  const loadingStartRef = { current: 0 }

  const loadResearch = useCallback(async (date: string) => {
    setLoading(true)
    const result = await window.api.getResearch(date)
    setResearch(result)
    setCurrentDate(date)
    setLoading(false)
  }, [])

  const runNow = useCallback(async () => {
    setResearch(null)
    setLoading(true)
    loadingStartRef.current = Date.now()
    await window.api.runResearchNow()
  }, [])

  useEffect(() => {
    window.api.getTodayResearch().then(result => {
      setResearch(result)
      setLoading(false)
    })

    const cleanup = window.api.onResearchComplete(result => {
      const elapsed = Date.now() - loadingStartRef.current
      const minDelay = Math.max(0, 5000 - elapsed)
      setTimeout(() => {
        if (result) {
          setResearch(result)
          setCurrentDate(result.date)
        }
        setLoading(false)
      }, minDelay)
    })

    return cleanup
  }, [])

  return { research, loading, currentDate, loadResearch, runNow }
}
