import { useState, useCallback } from 'react'
import type { ResearcherSearchRequest, ResearcherSearchResponse } from '../types'

export function useResearcher() {
  const [data, setData] = useState<ResearcherSearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (req: ResearcherSearchRequest) => {
    setData(null)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/find-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(detail.detail ?? `Error ${res.status}`)
      }
      setData(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, setData, loading, error, search }
}
