import { useState, useEffect, useCallback, useRef } from 'react'

declare global {
  interface Window {
    api: {
      getResearch: (date: string) => Promise<any>
      getTodayResearch: () => Promise<any>
      getResearchDates: () => Promise<string[]>
      getConfig: () => Promise<any>
      saveConfig: (config: any) => Promise<void>
      runResearchNow: () => Promise<{ ok: boolean; error?: string }>
      cancelResearch: () => Promise<void>
      getBookmarks: () => Promise<any[]>
      saveBookmark: (item: any) => Promise<void>
      removeBookmark: (id: string) => Promise<void>
      onResearchComplete: (callback: (result: any) => void) => () => void
      checkUpdate: () => Promise<{ version: string; url: string } | null>
      openUpdateDialog: (info: { version: string; url: string }) => Promise<void>
      saveMarkdown: (filePath: string, content: string) => Promise<void>
      pickFolder: () => Promise<string | null>
      runDiscussion: (research: any) => Promise<any[]>
      openExternalUrl: (url: string) => Promise<boolean>
      deleteResearch: (date: string, index: number) => Promise<void>
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
  const [lastError, setLastError] = useState<string | null>(null)
  const isAddingRef = useRef(false)
  const userInitiatedRef = useRef(false)
  const currentDateRef = useRef(currentDate)
  useEffect(() => { currentDateRef.current = currentDate }, [currentDate])

  const loadResearch = useCallback(async (date: string) => {
    const result = await window.api.getResearch(date)
    setSessions(Array.isArray(result) ? result : result ? [result] : [])
    setCurrentDate(date)
  }, [])

  const runNow = useCallback(async () => {
    isAddingRef.current = false
    userInitiatedRef.current = true
    setLastError(null)
    setLoading(true)
    try {
      await window.api.runResearchNow()
    } catch (err: any) {
      setLastError(err?.message || '리서치 실행 중 오류가 발생했어요.')
      setLoading(false)
      userInitiatedRef.current = false
    }
  }, [])

  const addResearch = useCallback(async () => {
    isAddingRef.current = true
    userInitiatedRef.current = true
    setLastError(null)
    setLoading(true)
    try {
      await window.api.runResearchNow()
    } catch (err: any) {
      setLastError(err?.message || '리서치 실행 중 오류가 발생했어요.')
      setLoading(false)
      userInitiatedRef.current = false
    }
  }, [])

  useEffect(() => {
    window.api.getTodayResearch().then(result => {
      setSessions(Array.isArray(result) ? result : result ? [result] : [])
      setLoading(false)
    })

    const cleanup = window.api.onResearchComplete(async (payload: any) => {
      isAddingRef.current = false
      setLoading(false)
      if (payload === null) {
        setLastError('리서치를 완료하지 못했어요. 네트워크와 AI 키를 확인해 주세요.')
        userInitiatedRef.current = false
        return
      }
      const result = await window.api.getTodayResearch()
      const arr: any[] = Array.isArray(result) ? result : result ? [result] : []
      const today = toLocalDateStr(new Date())
      // Only switch the view to today if the user is already on today, or
      // they explicitly initiated this run. Background completions (scheduler)
      // must not yank a user away from a past-date view they're browsing.
      if (currentDateRef.current === today || userInitiatedRef.current) {
        setSessions(arr)
        if (arr.length > 0) setCurrentDate(today)
      }
      userInitiatedRef.current = false
    })

    return cleanup
  }, [])

  const cancelAdd = useCallback(() => {
    isAddingRef.current = false
    setLoading(false)
    window.api.cancelResearch().catch(() => {})
  }, [])

  const deleteSession = useCallback(async (index: number) => {
    await window.api.deleteResearch(currentDate, index)
    setSessions(prev => prev.filter((_, i) => i !== index))
  }, [currentDate])

  const clear = useCallback(() => {
    setSessions([])
    setLoading(false)
  }, [])

  const research = sessions.length > 0 ? sessions[0] : null
  const clearError = useCallback(() => setLastError(null), [])

  return { research, sessions, loading, currentDate, lastError, loadResearch, runNow, addResearch, cancelAdd, clear, deleteSession, clearError }
}
