export interface PatientProfile {
  age: number
  sex: 'male' | 'female' | 'other'
  condition: string
  zip_code: string
  country: string
  ecog_status: number | null
  biomarkers: string[]
  current_medications: string[]
  prior_treatments: string[]
  comorbidities: string[]
  additional_notes: string
}

export interface MatchRequest {
  patient: PatientProfile
  top_k: number
  max_distance_miles: number | null
}

export interface ScoreBreakdown {
  semantic: number
  eligibility: number
  geo: number
  final: number
}

export interface TrialMatchResult {
  nct_id: string
  brief_title: string
  final_score: number
  headline: string
  summary: string
  why_eligible: string[]
  why_uncertain: string[]
  why_excluded: string[]
  score_breakdown: ScoreBreakdown
  distance_miles: number | null
  hard_excluded: boolean
  llm_narrative: string | null
  overall_status: string | null
  phases: string[]
  conditions: string[]
  locations_count: number
  countries_at_sites: string[]
}

export interface MatchResponse {
  matches: TrialMatchResult[]
  total_trials_fetched: number
  total_trials_scored: number
  patient_lat: number | null
  patient_lon: number | null
}
