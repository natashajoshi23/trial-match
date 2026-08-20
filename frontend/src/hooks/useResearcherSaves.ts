import { useState, useCallback } from 'react'
import type { TrialSiteResult } from '../types'

export interface SavedSite extends TrialSiteResult {
  savedAt: number
  notes: string
}

const KEY = 'trial-match-researcher-saves'

function normalize(s: Partial<SavedSite>): SavedSite {
  return {
    nct_id: s.nct_id ?? '',
    brief_title: s.brief_title ?? '',
    overall_status: s.overall_status ?? null,
    phases: s.phases ?? [],
    conditions: s.conditions ?? [],
    brief_summary: s.brief_summary ?? null,
    start_date: s.start_date ?? null,
    primary_completion_date: s.primary_completion_date ?? null,
    healthy_volunteers: s.healthy_volunteers ?? null,
    minimum_age: s.minimum_age ?? null,
    maximum_age: s.maximum_age ?? null,
    nearest_facility: s.nearest_facility ?? null,
    nearest_city: s.nearest_city ?? null,
    nearest_state: s.nearest_state ?? null,
    nearest_country: s.nearest_country ?? null,
    nearest_distance_miles: s.nearest_distance_miles ?? null,
    nearest_lat: s.nearest_lat ?? null,
    nearest_lon: s.nearest_lon ?? null,
    site_contacts: s.site_contacts ?? [],
    overall_contacts: s.overall_contacts ?? [],
    investigators: s.investigators ?? [],
    total_sites: s.total_sites ?? 0,
    countries_at_sites: s.countries_at_sites ?? [],
    sponsor_type: s.sponsor_type ?? null,
    study_type: s.study_type ?? null,
    intervention_types: s.intervention_types ?? [],
    savedAt: s.savedAt ?? Date.now(),
    notes: s.notes ?? '',
  }
}

function load(): SavedSite[] {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? '[]') as Partial<SavedSite>[]).map(normalize)
  } catch {
    return []
  }
}

function persist(saves: SavedSite[]) {
  localStorage.setItem(KEY, JSON.stringify(saves))
}

export function useResearcherSaves() {
  const [saves, setSaves] = useState<SavedSite[]>(load)

  const isSaved = useCallback(
    (nct_id: string) => saves.some(s => s.nct_id === nct_id),
    [saves]
  )

  const save = useCallback((trial: TrialSiteResult) => {
    setSaves(prev => {
      if (prev.some(s => s.nct_id === trial.nct_id)) return prev
      const next: SavedSite[] = [{ ...trial, savedAt: Date.now(), notes: '' }, ...prev]
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

  return { saves, isSaved, save, unsave, updateNotes, clearAll }
}
