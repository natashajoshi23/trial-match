import { useState, useCallback } from 'react'
import { fetchMatches } from '../api'
import type { MatchRequest, MatchResponse } from '../types'

export function useMatch() {
  const [data, setData] = useState<MatchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const match = useCallback(async (req: MatchRequest) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchMatches(req)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, match }
}
