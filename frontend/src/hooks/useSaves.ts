import { useState, useCallback } from 'react'
import type { TrialMatchResult } from '../types'

export interface SavedTrial {
  nct_id: string
  brief_title: string
  final_score: number
  headline: string
  hard_excluded: boolean
  phases: string[]
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
    hard_excluded: s.hard_excluded ?? false,
    phases: s.phases ?? [],
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
      const next: SavedTrial[] = [{
        nct_id: trial.nct_id,
        brief_title: trial.brief_title,
        final_score: trial.final_score,
        headline: trial.headline,
        hard_excluded: trial.hard_excluded,
        phases: trial.phases,
        savedAt: Date.now(),
        patientLabel: '',
        notes: '',
      }, ...prev]
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
