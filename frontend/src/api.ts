import type { MatchRequest, MatchResponse } from './types'

export async function fetchMatches(req: MatchRequest): Promise<MatchResponse> {
  const resp = await fetch('/api/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? `HTTP ${resp.status}`)
  }
  return resp.json() as Promise<MatchResponse>
}
