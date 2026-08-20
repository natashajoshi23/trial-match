import { useState, useCallback } from 'react'
import type { TrialMatchResult } from '../types'

export interface SavedTrial extends TrialMatchResult {
  savedAt: number
  patientLabel: string
  notes: string
}

const KEY = 'trial-match-saves'

function normalize(s: Partial<SavedTrial>): SavedTrial {
  return {
    nct_id: s.nct_id ?? '',
    brief_title: s.brief_title ?? '',
    final_score: s.final_score ?? 0,
    headline: s.headline ?? '',
    summary: s.summary ?? '',
    why_eligible: s.why_eligible ?? [],
    why_uncertain: s.why_uncertain ?? [],
    why_excluded: s.why_excluded ?? [],
    score_breakdown: s.score_breakdown ?? { semantic: 0, eligibility: 0, geo: 0, final: 0 },
    distance_miles: s.distance_miles ?? null,
    hard_excluded: s.hard_excluded ?? false,
    llm_narrative: s.llm_narrative ?? null,
    overall_status: s.overall_status ?? null,
    phases: s.phases ?? [],
    conditions: s.conditions ?? [],
    locations_count: s.locations_count ?? 0,
    countries_at_sites: s.countries_at_sites ?? [],
    minimum_age: s.minimum_age ?? null,
    maximum_age: s.maximum_age ?? null,
    start_date: s.start_date ?? null,
    primary_completion_date: s.primary_completion_date ?? null,
    savedAt: s.savedAt ?? Date.now(),
    patientLabel: s.patientLabel ?? '',
    notes: s.notes ?? '',
  }
}

function load(): SavedTrial[] {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? '[]') as Partial<SavedTrial>[]).map(normalize)
  } catch {
    return []
  }
}

function persist(saves: SavedTrial[]) {
  localStorage.setItem(KEY, JSON.stringify(saves))
}

export function useSaves() {
  const [saves, setSaves] = useState<SavedTrial[]>(load)

  const isSaved = useCallback(
    (nct_id: string) => saves.some(s => s.nct_id === nct_id),
    [saves]
  )

  const save = useCallback((trial: TrialMatchResult) => {
    setSaves(prev => {
      if (prev.some(s => s.nct_id === trial.nct_id)) return prev
      const next: SavedTrial[] = [{ ...trial, savedAt: Date.now(), patientLabel: '', notes: '' }, ...prev]
      persist(next)
      return next
    })
  }, [])

  const unsave = useCallback((nct_id: string) => {
    setSaves(prev => {
      const next = prev.filter(s => s.nct_id !== nct_id)
      persist(next)
      return next
    })
  }, [])

  const updatePatientLabel = useCallback((nct_id: string, label: string) => {
    setSaves(prev => {
      const next = prev.map(s => s.nct_id === nct_id ? { ...s, patientLabel: label } : s)
      persist(next)
      return next
    })
  }, [])

  const updateNotes = useCallback((nct_id: string, notes: string) => {
    setSaves(prev => {
      const next = prev.map(s => s.nct_id === nct_id ? { ...s, notes } : s)
      persist(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setSaves([])
    localStorage.removeItem(KEY)
  }, [])

  return { saves, isSaved, save, unsave, updatePatientLabel, updateNotes, clearAll }
}
