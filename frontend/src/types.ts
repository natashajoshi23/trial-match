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
  minimum_age: string | null
  maximum_age: string | null
  start_date: string | null
  primary_completion_date: string | null
}

export interface MatchResponse {
  matches: TrialMatchResult[]
  total_trials_fetched: number
  total_trials_scored: number
  patient_lat: number | null
  patient_lon: number | null
}

// ── Researcher / find-sites ──────────────────────────────────────────────────

export interface ResearcherSearchRequest {
  conditions: string[]
  zip_code: string
  country: string
  phases: string[]
  sponsor_types: string[]
  study_types: string[]
  intervention_types: string[]
  healthy_volunteers_only: boolean
  top_k: number
  max_distance_miles: number | null
}

export interface SiteContactResult {
  name: string | null
  role: string | null
  phone: string | null
  email: string | null
}

export interface TrialSiteResult {
  nct_id: string
  brief_title: string
  overall_status: string | null
  phases: string[]
  conditions: string[]
  brief_summary: string | null
  start_date: string | null
  primary_completion_date: string | null
  healthy_volunteers: boolean | null
  minimum_age: string | null
  maximum_age: string | null
  nearest_facility: string | null
  nearest_city: string | null
  nearest_state: string | null
  nearest_country: string | null
  nearest_distance_miles: number | null
  nearest_lat: number | null
  nearest_lon: number | null
  site_contacts: SiteContactResult[]
  overall_contacts: SiteContactResult[]
  investigators: SiteContactResult[]
  total_sites: number
  countries_at_sites: string[]
  sponsor_type: string | null
  study_type: string | null
  intervention_types: string[]
}

export interface ResearcherSearchResponse {
  results: TrialSiteResult[]
  total_fetched: number
  patient_lat: number | null
  patient_lon: number | null
  geo_warning: string | null
}
