import { useState, lazy, Suspense } from 'react'
import type { ResearcherSearchResponse, TrialSiteResult, SiteContactResult } from '../types'

const MapView = lazy(() => import('./MapView'))

interface Props {
  data: ResearcherSearchResponse | null
  loading: boolean
  error: string | null
  isSaved: (nct_id: string) => boolean
  onSave: (trial: TrialSiteResult) => void
  onUnsave: (nct_id: string) => void
}

type StatusFilter = 'all' | 'accepting' | 'opening_soon'
type SortBy = 'distance' | 'phase_asc' | 'phase_desc'
type ViewMode = 'list' | 'map'

function phaseNum(trial: TrialSiteResult): number {
  for (const p of trial.phases) {
    const m = p.match(/(\d+)/)
    if (m) return parseInt(m[1])
  }
  return 99
}

export default function SiteResults({ data, loading, error, isSaved, onSave, onUnsave }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [contactOnly, setContactOnly] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>('distance')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [emailTrial, setEmailTrial] = useState<TrialSiteResult | null>(null)
  const [detailTrial, setDetailTrial] = useState<TrialSiteResult | null>(null)

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (!data) return null
  if (data.results.length === 0) return <EmptyResults />

  const filtered = data.results.filter(r => {
    const s = (r.overall_status ?? '').toUpperCase()
    if (statusFilter === 'accepting' && s !== 'RECRUITING') return false
    if (statusFilter === 'opening_soon' && s !== 'NOT_YET_RECRUITING') return false
    if (contactOnly) {
      const hasContact = [...r.investigators, ...r.site_contacts, ...r.overall_contacts].some(c => c.email || c.phone)
      if (!hasContact) return false
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'phase_asc') return phaseNum(a) - phaseNum(b)
    if (sortBy === 'phase_desc') return phaseNum(b) - phaseNum(a)
    const da = a.nearest_distance_miles ?? Infinity
    const db = b.nearest_distance_miles ?? Infinity
    return da - db
  })

  const pill = (active: boolean) => ({
    padding: '5px 14px', borderRadius: 999, fontSize: '0.73rem', fontWeight: 700,
    border: 'none', cursor: 'pointer' as const,
    background: active ? '#1B3A52' : '#EEE8DE',
    color: active ? '#FFFFFF' : '#4A6070',
    fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.12s',
  })

  return (
    <div>
      {/* Filter + sort + view bar */}
      <div style={{
        background: '#FFFFFF', border: '1.5px solid #E2D9C8', borderRadius: 12,
        padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center',
        gap: 8, flexWrap: 'wrap', fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8A9BA8', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Status</span>
        <button style={pill(statusFilter === 'all')} onClick={() => setStatusFilter('all')}>All</button>
        <button style={pill(statusFilter === 'accepting')} onClick={() => setStatusFilter('accepting')}>Recruiting</button>
        <button style={pill(statusFilter === 'opening_soon')} onClick={() => setStatusFilter('opening_soon')}>Opening soon</button>
        <div style={{ width: 1, height: 20, background: '#E2D9C8', margin: '0 4px' }} />
        <button
          style={{ ...pill(contactOnly), background: contactOnly ? '#E8701A' : '#EEE8DE', color: contactOnly ? '#FFFFFF' : '#4A6070' }}
          onClick={() => setContactOnly(v => !v)}
        >
          Has contact info
        </button>

        {/* Sort */}
        <div style={{ width: 1, height: 20, background: '#E2D9C8', margin: '0 4px' }} />
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8A9BA8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sort</span>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortBy)}
          style={{
            padding: '4px 8px', borderRadius: 8, border: '1.5px solid #E2D9C8',
            fontSize: '0.72rem', color: '#1B3A52', fontWeight: 600,
            fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#FBF7F0',
            cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="distance">Nearest first</option>
          <option value="phase_asc">Phase (1 → 4)</option>
          <option value="phase_desc">Phase (4 → 1)</option>
        </select>

        {/* View toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button
            onClick={() => setViewMode('list')}
            title="List view"
            style={{ ...pill(viewMode === 'list'), padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
            List
          </button>
          <button
            onClick={() => setViewMode('map')}
            title="Map view"
            style={{ ...pill(viewMode === 'map'), padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
            Map
          </button>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#8A9BA8' }}>
          {filtered.length} of {data.results.length}
        </span>
      </div>

      {data.geo_warning && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: '#FFF8EC', border: '1px solid #F5D68A',
          borderRadius: 10, padding: '10px 14px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#B45309" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p style={{ fontSize: '0.78rem', color: '#92400E', lineHeight: 1.5, margin: 0 }}>{data.geo_warning}</p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 24px', color: '#8A9BA8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <p style={{ fontWeight: 700, color: '#1B3A52', marginBottom: 6 }}>No results match these filters</p>
          <p style={{ fontSize: '0.82rem' }}>Try removing a filter to see more trials.</p>
        </div>
      ) : viewMode === 'map' ? (
        <Suspense fallback={<div style={{ height: 480, background: '#F5F5F0', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A9BA8', fontSize: '0.85rem' }}>Loading map…</div>}>
          <MapView trials={sorted} patientLat={data.patient_lat} patientLon={data.patient_lon} />
        </Suspense>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {sorted.map(r => (
            <ProfileCard
              key={r.nct_id}
              trial={r}
              saved={isSaved(r.nct_id)}
              onSave={() => onSave(r)}
              onUnsave={() => onUnsave(r.nct_id)}
              patientLat={data.patient_lat}
              patientLon={data.patient_lon}
              onEmail={() => setEmailTrial(r)}
              onDetail={() => setDetailTrial(r)}
            />
          ))}
        </div>
      )}

      {emailTrial && (
        <EmailTemplateModal trial={emailTrial} onClose={() => setEmailTrial(null)} />
      )}
      {detailTrial && (
        <TrialDetailModal trial={detailTrial} onClose={() => setDetailTrial(null)} />
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .contact-btn:hover { background: #EEF4FA !important; }
        .email-btn:hover { background: #E8F5E9 !important; color: #1B6B3A !important; }
      `}</style>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function collaboratorStatus(raw: string | null): { label: string; color: string; bg: string; dot: string } {
  const s = (raw ?? '').toUpperCase()
  if (s === 'RECRUITING')
    return { label: 'Accepting collaborators', color: '#166534', bg: '#DCFCE7', dot: '#22C55E' }
  if (s === 'NOT_YET_RECRUITING')
    return { label: 'Opening soon', color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B' }
  if (s === 'ACTIVE_NOT_RECRUITING')
    return { label: 'Fully enrolled', color: '#1E40AF', bg: '#DBEAFE', dot: '#3B82F6' }
  if (s === 'COMPLETED')
    return { label: 'Study complete', color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF' }
  return { label: 'Not accepting', color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF' }
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')
}

const AVATAR_COLORS: [string, string][] = [
  ['#1B3A52', '#3B82F6'], ['#134E4A', '#10B981'], ['#4C1D95', '#8B5CF6'],
  ['#7C2D12', '#F97316'], ['#1E3A5F', '#0EA5E9'], ['#3B0764', '#A855F7'],
]
function avatarColor(name: string): [string, string] {
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

function fmt(d: string): string {
  const [y, m] = d.split('-')
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${mon[(parseInt(m) - 1) % 12]} ${y}`
}

function dedupeContacts(contacts: SiteContactResult[]): SiteContactResult[] {
  const seen = new Set<string>()
  return contacts.filter(c => {
    const key = `${c.name ?? ''}|${c.email ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const SPONSOR_LABELS: Record<string, string> = {
  INDUSTRY: 'Industry-sponsored (Pharma / Biotech)',
  NIH: 'NIH-funded study',
  FED: 'Government-funded study',
  U_S_FED: 'U.S. Federal government study',
  INDIV: 'Investigator-initiated study',
  NETWORK: 'Collaborative network study',
  OTH: 'Academic / non-profit sponsored',
}

const IV_LABELS: Record<string, string> = {
  DRUG: 'Drug', BIOLOGICAL: 'Biological', DEVICE: 'Device',
  BEHAVIORAL: 'Behavioral', PROCEDURE: 'Procedure', RADIATION: 'Radiation',
  DIETARY_SUPPLEMENT: 'Dietary Supplement', COMBINATION_PRODUCT: 'Combination Product',
  DIAGNOSTIC_TEST: 'Diagnostic Test', GENETIC: 'Genetic', OTHER: 'Other',
}

function buildJots(trial: TrialSiteResult): string[] {
  const jots: string[] = []

  // What it's studying — pull first clean sentence from summary
  if (trial.brief_summary) {
    const sentences = trial.brief_summary.match(/[^.!?]+[.!?]+/g) ?? []
    const first = sentences.find(s => {
      const t = s.trim()
      return t.length > 30 && t.length < 220 && !/^\s*(this study|this trial|the purpose|the primary)/i.test(t)
    }) ?? sentences.find(s => s.trim().length > 30) ?? sentences[0]
    if (first) jots.push(first.trim())
  }

  // Sponsor type
  if (trial.sponsor_type) {
    const label = SPONSOR_LABELS[trial.sponsor_type.replace(/-/g, '_').toUpperCase()]
    if (label) jots.push(label)
  }

  // Intervention types from structured data
  if (trial.intervention_types.length > 0) {
    const labels = trial.intervention_types
      .map(t => IV_LABELS[t.toUpperCase()] ?? t)
      .join(', ')
    jots.push(`Intervention type: ${labels}`)
  }

  // Study design hints from summary
  if (trial.brief_summary) {
    const s = trial.brief_summary.toLowerCase()
    if (s.includes('randomized') || s.includes('randomised')) jots.push('Randomized controlled trial')
    else if (trial.study_type === 'OBSERVATIONAL' || s.includes('observational') || s.includes('registry')) jots.push('Observational / registry study')
    if (s.includes('placebo')) jots.push('Includes a placebo arm')
    if (s.includes('biomarker') || s.includes('genomic') || s.includes('genetic')) jots.push('Includes biomarker or genomic assessment')
  }

  // Healthy volunteers
  if (trial.healthy_volunteers) jots.push('Open to healthy volunteers — no diagnosis required')

  // Sites & geography
  if (trial.total_sites > 0) {
    const countries = trial.countries_at_sites
    if (countries.length === 1) jots.push(`${trial.total_sites} site${trial.total_sites > 1 ? 's' : ''} in ${countries[0]}`)
    else if (countries.length > 1) jots.push(`${trial.total_sites} sites across ${countries.slice(0, 3).join(', ')}${countries.length > 3 ? ` + ${countries.length - 3} more` : ''}`)
  }

  // Age eligibility
  if (trial.minimum_age || trial.maximum_age) {
    const min = trial.minimum_age?.replace(' Years', '') ?? '0'
    const max = trial.maximum_age?.replace(' Years', '')
    jots.push(max ? `Eligible ages: ${min}–${max} years` : `Eligible ages: ${min}+ years`)
  }

  return jots.filter(Boolean).slice(0, 7)
}

function formatRole(role: string | null): string {
  if (!role) return 'Contact'
  return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function contactGuidance(role: string | null): string {
  const r = (role ?? '').toUpperCase().replace(/\s+/g, '_')
  if (r.includes('PRINCIPAL_INVESTIGATOR')) return 'Reach out to discuss working or volunteering in this trial'
  if (r.includes('STUDY_DIRECTOR')) return 'Reach out for questions about study coordination or logistics'
  if (r.includes('STUDY_CHAIR')) return 'Reach out for high-level questions about the research direction'
  if (r.includes('SUB_INVESTIGATOR')) return 'Reach out for site-specific research or clinical questions'
  if (r.includes('SPONSOR')) return 'Reach out for trial sponsorship or partnership questions'
  return 'Reach out for general questions about participation or the trial'
}

function isPersonName(name: string | null): boolean {
  if (!name?.trim()) return false
  const n = name.trim()
  // Hard length cap
  if (n.length > 60) return false
  // Contains digits or # — instructions/IDs, not names
  if (/[\d#]/.test(n)) return false
  // All-caps word of 4+ letters = acronym / org / shouted instruction (MUST, ABBVIE, etc.)
  if (/\b[A-Z]{4,}\b/.test(n)) return false
  // Sentence-ending punctuation — strip trailing degree abbrevs first (M.D., Ph.D., D.O.)
  const withoutDegree = n.replace(/,?\s*([A-Z][a-z]?\.){1,3}$/, '').trim()
  if (/[.!?]$/.test(withoutDegree)) return false
  // Instruction / non-person keywords at start
  if (/^(call|contact|trial|email|phone|for |please|visit|clinical|medical|global|site |first |second |third |note:|attention)/i.test(n)) return false
  // Org / non-person keywords anywhere
  if (/\b(inc\.|llc|ltd\.?|corp\.?|center|centre|trials?|call center|pharma|oncology|department|division|team|contain|include|refer|send|information|line|subject)\b/i.test(n)) return false
  if (n.includes(':') || n.includes(' or ') || n.includes('UTC') || n.includes('@')) return false
  // Too many words — person names including degree are 2–7 tokens
  if (n.split(/\s+/).length > 7) return false
  return true
}

// ── Profile card ─────────────────────────────────────────────────────────────

function ProfileCard({ trial, saved, onSave, onUnsave, patientLat, patientLon, onEmail, onDetail }: {
  trial: TrialSiteResult
  saved: boolean
  onSave: () => void
  onUnsave: () => void
  patientLat: number | null
  patientLon: number | null
  onEmail: () => void
  onDetail: () => void
}) {
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [countriesExpanded, setCountriesExpanded] = useState(false)

  const status = collaboratorStatus(trial.overall_status)
  const phases = trial.phases.map(p => p.replace('PHASE', 'Ph ')).join(' / ')

  const isRealContact = (c: SiteContactResult) =>
    isPersonName(c.name) || !!(c.email || c.phone)

  // Lead contacts: investigators first, then site contacts, then overall
  const allContacts = dedupeContacts([
    ...trial.investigators,
    ...trial.site_contacts,
    ...trial.overall_contacts,
  ]).filter(isRealContact)
  const primaryContacts = allContacts.slice(0, 3)
  const hasContacts = primaryContacts.length > 0

  // Only real person names drive avatars and the header subtitle
  const namedContacts = primaryContacts.filter(c => isPersonName(c.name))

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(text)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const cleanPart = (s: string | null) => s?.replace(/[.,\s]+$/, '').trim() ?? null
  const locationLine = [
    cleanPart(trial.nearest_facility),
    cleanPart(trial.nearest_city),
    cleanPart(trial.nearest_state),
    trial.nearest_country !== 'United States' ? cleanPart(trial.nearest_country) : null,
  ].filter(Boolean).join(', ')

  const originParam = patientLat != null && patientLon != null
    ? `&origin=${patientLat},${patientLon}`
    : ''
  const mapsUrl = locationLine
    ? `https://www.google.com/maps/dir/?api=1${originParam}&destination=${encodeURIComponent(locationLine)}`
    : null

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: 18,
      border: '1.5px solid #E2D9C8',
      overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      boxShadow: '0 2px 12px rgba(27,58,82,0.07)',
    }}>
      {/* ── Header band ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1B3A52 0%, #0D2235 100%)',
        padding: '20px 24px',
        display: 'flex', alignItems: 'flex-start', gap: 16,
      }}>
        {/* Avatars — only real-named contacts */}
        <div style={{ display: 'flex', flexShrink: 0 }}>
          {namedContacts.length > 0 ? (
            namedContacts.slice(0, 2).map((c, i) => {
              const name = c.name!
              const [bg, ring] = avatarColor(name)
              return (
                <div key={i} style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: bg, border: `2.5px solid ${ring}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.78rem', fontWeight: 800, color: '#FFFFFF',
                  marginLeft: i > 0 ? -10 : 0,
                  zIndex: namedContacts.length - i,
                  position: 'relative', flexShrink: 0,
                }}>
                  {initials(name)}
                </div>
              )
            })
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.7)" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
              </svg>
            </div>
          )}
        </div>

        {/* Trial name as heading, contacts as subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 800, fontSize: '0.95rem', color: '#FFFFFF', lineHeight: 1.35, marginBottom: namedContacts.length > 0 ? 4 : 6 }}>
            {trial.brief_title}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {locationLine && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>{locationLine}</span>
                {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 999,
                        background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                        color: 'rgba(255,255,255,0.8)', fontSize: '0.68rem', fontWeight: 700,
                        textDecoration: 'none', whiteSpace: 'nowrap', transition: 'background 0.15s',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                    >
                      <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                      </svg>
                      {trial.nearest_distance_miles !== null ? `${trial.nearest_distance_miles} mi` : 'Maps'}
                    </a>
                )}
              </div>
            )}
            {trial.countries_at_sites.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.38)" strokeWidth={2} style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-2.485 0-4.5 4.03-4.5 9s2.015 9 4.5 9 4.5-4.03 4.5-9-2.015-9-4.5-9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8" />
                </svg>
                <button
                  onClick={e => { e.stopPropagation(); if (trial.countries_at_sites.length > 3) setCountriesExpanded(x => !x) }}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    cursor: trial.countries_at_sites.length > 3 ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    minWidth: 0, textAlign: 'left',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: countriesExpanded ? 'normal' : 'nowrap' }}>
                    {trial.total_sites} site{trial.total_sites !== 1 ? 's' : ''} in{' '}
                    {countriesExpanded
                      ? trial.countries_at_sites.join(', ')
                      : <>{trial.countries_at_sites.slice(0, 3).join(', ')}{trial.countries_at_sites.length > 3 && <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}> +{trial.countries_at_sites.length - 3}</span>}</>
                    }
                  </span>
                  {trial.countries_at_sites.length > 3 && (
                    <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.4)" strokeWidth={2.5}
                      style={{ flexShrink: 0, transition: 'transform 0.15s', transform: countriesExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status + save */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button
            onClick={saved ? onUnsave : onSave}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 8,
              border: saved ? '1.5px solid rgba(232,112,26,0.7)' : '1.5px solid rgba(255,255,255,0.2)',
              background: saved ? 'rgba(232,112,26,0.2)' : 'rgba(255,255,255,0.08)',
              color: saved ? '#FBB040' : 'rgba(255,255,255,0.65)',
              fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.15s',
            }}
          >
            <svg width="12" height="12" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
            {saved ? 'Saved' : 'Save'}
          </button>
          <span style={{
            fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999,
            background: status.bg, color: status.color, display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: status.dot, display: 'inline-block', flexShrink: 0 }} />
            {status.label}
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '18px 24px' }}>

        {/* Tags row */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {phases && (
            <span style={{ background: '#EEF2F6', color: '#1B3A52', fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>
              {phases}
            </span>
          )}
          {trial.conditions.slice(0, 3).map(c => (
            <span key={c} style={{ background: 'rgba(232,112,26,0.08)', color: '#9A4010', fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>
              {c}
            </span>
          ))}
          {trial.healthy_volunteers && (
            <span style={{ background: '#DCFCE7', color: '#166534', fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>
              ✓ Healthy volunteers
            </span>
          )}
          {(trial.start_date || trial.primary_completion_date) && (
            <span style={{ background: '#F3F4F6', color: '#4B5563', fontSize: '0.68rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5"/></svg>
              {trial.start_date ? fmt(trial.start_date) : '?'} → {trial.primary_completion_date ? fmt(trial.primary_completion_date) : 'ongoing'}
            </span>
          )}
          {trial.study_type && (
            <span style={{ background: '#EEF2F6', color: '#1B3A52', fontSize: '0.68rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>
              {trial.study_type.charAt(0) + trial.study_type.slice(1).toLowerCase()}
            </span>
          )}
          {trial.sponsor_type && SPONSOR_LABELS[trial.sponsor_type.toUpperCase()] && (
            <span style={{ background: '#F0F4FF', color: '#3730A3', fontSize: '0.68rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>
              {trial.sponsor_type === 'INDUSTRY' ? 'Industry' :
               trial.sponsor_type === 'NIH' ? 'NIH' :
               trial.sponsor_type.startsWith('FED') || trial.sponsor_type === 'U_S_FED' ? 'Gov\'t' :
               'Academic'}
            </span>
          )}
          <span style={{ background: '#F3F4F6', color: '#4B5563', fontSize: '0.68rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>
            {trial.total_sites} site{trial.total_sites !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Contact CTAs */}
        {hasContacts ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {primaryContacts.map((c, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                padding: '10px 14px', borderRadius: 10,
                background: '#F8F9FB', border: '1px solid #E8EDF2',
              }}>
                <div>
                  {isPersonName(c.name) && <p style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1B3A52' }}>{c.name}</p>}
                  <p style={{ fontSize: '0.7rem', color: '#8A9BA8' }}>{formatRole(c.role)}</p>
                  <p style={{ fontSize: '0.68rem', color: '#B08050', fontStyle: 'italic', marginTop: 2 }}>
                    {contactGuidance(c.role)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {!c.email && !c.phone && isPersonName(c.name) && (
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(`${c.name} researcher clinical trial`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '7px 12px', borderRadius: 8,
                        border: '1.5px solid #D5CEBF', background: '#F5F1EA',
                        color: '#4A6070', fontSize: '0.75rem', fontWeight: 600,
                        textDecoration: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                    >
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      Search online
                    </a>
                  )}
                  {c.email && (
                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                      <a
                        href={`mailto:${c.email}`}
                        className="email-btn"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '7px 12px', borderRadius: '8px 0 0 8px',
                          border: '1.5px solid #D5CEBF', borderRight: 'none',
                          background: '#F5F1EA', color: '#1B3A52',
                          fontSize: '0.77rem', fontWeight: 600, textDecoration: 'none',
                          fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.15s',
                        }}
                      >
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                        {c.email}
                      </a>
                      <button
                        onClick={() => copy(c.email!)}
                        title="Copy email"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '7px 10px', borderRadius: '0 8px 8px 0',
                          border: '1.5px solid #D5CEBF',
                          background: copied === c.email ? '#DCFCE7' : '#F5F1EA',
                          color: copied === c.email ? '#166534' : '#6B7B86',
                          cursor: 'pointer', transition: 'all 0.15s',
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}
                      >
                        {copied === c.email ? (
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                  {c.phone && (
                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                      <a
                        href={`tel:${c.phone}`}
                        className="contact-btn"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '7px 12px', borderRadius: '8px 0 0 8px',
                          border: '1.5px solid #D5CEBF', borderRight: 'none',
                          background: '#F5F1EA', color: '#4A6070',
                          fontSize: '0.77rem', fontWeight: 700, textDecoration: 'none',
                          fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'background 0.15s',
                        }}
                      >
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                        </svg>
                        {c.phone}
                      </a>
                      <button
                        onClick={() => copy(c.phone!)}
                        title="Copy phone number"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '7px 10px', borderRadius: '0 8px 8px 0',
                          border: '1.5px solid #D5CEBF',
                          background: copied === c.phone ? '#DCFCE7' : '#F5F1EA',
                          color: copied === c.phone ? '#166534' : '#6B7B86',
                          cursor: 'pointer', transition: 'all 0.15s',
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}
                      >
                        {copied === c.phone ? (
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: '#F8F9FB', border: '1px solid #E8EDF2', fontSize: '0.78rem', color: '#8A9BA8', fontStyle: 'italic' }}>
            No direct contact info listed — visit ClinicalTrials.gov to find the site contact.
          </div>
        )}

        {/* Bullet jots */}
        <div style={{ marginTop: 14 }}>
          <button
            onClick={() => setSummaryOpen(o => !o)}
            style={{
              background: 'none', border: 'none', color: '#4A6070',
              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              style={{ transform: summaryOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
            {summaryOpen ? 'Hide' : 'About this trial'}
          </button>
          {summaryOpen && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F0EBE3' }}>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {buildJots(trial).map((jot, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.8rem', color: '#374151', lineHeight: 1.5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1B3A52', flexShrink: 0, marginTop: 6 }} />
                    {jot}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop: '1px solid #F0EBE3', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAF8', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.65rem', color: '#C0CAD4', fontFamily: 'monospace' }}>{trial.nct_id}</span>
          <button
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}#${trial.nct_id}`
              navigator.clipboard.writeText(url).then(() => setCopied('__link__')).catch(() => {})
              setTimeout(() => setCopied(null), 2000)
            }}
            title="Copy link to this trial"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
              color: copied === '__link__' ? '#166534' : '#C0CAD4',
              fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: 3,
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
            }}
          >
            {copied === '__link__' ? (
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            )}
            {copied === '__link__' ? 'Copied!' : 'Share'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onDetail}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: '0.72rem', fontWeight: 700, color: '#4A6070', textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Full details
          </button>
          <button
            onClick={onEmail}
            style={{
              background: 'rgba(232,112,26,0.07)', border: '1px solid rgba(232,112,26,0.3)',
              borderRadius: 8, cursor: 'pointer', padding: '4px 10px',
              fontSize: '0.72rem', fontWeight: 700, color: '#B05400',
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,112,26,0.14)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(232,112,26,0.07)' }}
          >
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Draft email
          </button>
          <a
            href={`https://clinicaltrials.gov/study/${trial.nct_id}`}
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1B3A52', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            ClinicalTrials.gov
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Email template modal ──────────────────────────────────────────────────────

function EmailTemplateModal({ trial, onClose }: { trial: TrialSiteResult; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const pi = [...trial.investigators, ...trial.site_contacts, ...trial.overall_contacts]
    .find(c => isPersonName(c.name))
  const loc = [trial.nearest_facility, trial.nearest_city, trial.nearest_state].filter(Boolean).join(', ')
  const phases = trial.phases.map(p => p.replace('PHASE', 'Phase ')).join(' / ')

  const template = `Subject: Research Collaboration Inquiry — ${trial.brief_title}

Dear ${pi?.name ?? '[Investigator Name / Site Coordinator]'},

My name is [Your Name], and I am a [PhD student / clinical research coordinator / undergraduate researcher] at [Your Institution].

I came across your study, "${trial.brief_title}" (${trial.nct_id}), currently ${trial.overall_status === 'RECRUITING' ? 'recruiting' : 'registered'} at ${loc || '[site location]'}${phases ? ` — a ${phases} ${(trial.study_type ?? 'clinical').toLowerCase()} trial` : ''}. I am writing to express my strong interest in contributing to this research.

My background includes [brief description of relevant experience — lab skills, data management, patient coordination, etc.]. I am eager to contribute as a research assistant, data coordinator, or in any capacity that would be helpful to your team.

If there are any opportunities to discuss this further, I would greatly appreciate the chance to speak with you. I can be reached at [your email] or [your phone number].

Thank you for your time and consideration.

Best regards,
[Your Name]
[Your Title / Year]
[Institution]
[Email] | [Phone]`

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(27,58,82,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#FFFFFF', borderRadius: 20, maxWidth: 640, width: '100%', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 24px 60px rgba(27,58,82,0.28)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F0EBE3', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A9BA8', marginBottom: 4 }}>Draft outreach email</p>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1B3A52', lineHeight: 1.35 }}>{trial.brief_title}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A9BA8', padding: 4, flexShrink: 0 }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div style={{ padding: '16px 24px' }}>
          <p style={{ fontSize: '0.75rem', color: '#8A9BA8', marginBottom: 10, lineHeight: 1.5 }}>
            Personalize the bracketed sections before sending. This template is pre-filled with trial details from ClinicalTrials.gov.
          </p>
          <textarea
            readOnly
            value={template}
            style={{
              width: '100%', minHeight: 320, padding: '12px 14px', borderRadius: 10,
              border: '1.5px solid #E2D9C8', fontSize: '0.78rem', color: '#1B3A52',
              fontFamily: 'monospace', lineHeight: 1.7, resize: 'vertical',
              background: '#FAFAF8', boxSizing: 'border-box',
            }}
            onClick={e => (e.target as HTMLTextAreaElement).select()}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button
              onClick={() => {
                navigator.clipboard.writeText(template).then(() => {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2500)
                })
              }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                background: copied ? '#DCFCE7' : '#1B3A52',
                color: copied ? '#166534' : '#FFFFFF',
                fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
            >
              {copied ? (
                <>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Copied to clipboard
                </>
              ) : (
                <>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  Copy to clipboard
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Trial detail modal ────────────────────────────────────────────────────────

function TrialDetailModal({ trial, onClose }: { trial: TrialSiteResult; onClose: () => void }) {
  const phases = trial.phases.map(p => p.replace('PHASE', 'Phase ')).join(' / ')
  const allContacts = dedupeContacts([...trial.investigators, ...trial.site_contacts, ...trial.overall_contacts])

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(27,58,82,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#FFFFFF', borderRadius: 20, maxWidth: 700, width: '100%', maxHeight: '88vh', overflow: 'auto', boxShadow: '0 24px 60px rgba(27,58,82,0.28)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1B3A52, #0D2235)', padding: '24px 28px', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', color: '#FFFFFF', borderRadius: 8, padding: '4px 8px' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{trial.nct_id}</p>
          <p style={{ fontWeight: 800, fontSize: '1rem', color: '#FFFFFF', lineHeight: 1.35, marginBottom: 12, paddingRight: 32 }}>{trial.brief_title}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {phases && <span style={{ background: 'rgba(255,255,255,0.15)', color: '#FFFFFF', fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>{phases}</span>}
            {trial.study_type && <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', fontSize: '0.68rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>{trial.study_type.charAt(0) + trial.study_type.slice(1).toLowerCase()}</span>}
            {trial.conditions.slice(0, 3).map(c => (
              <span key={c} style={{ background: 'rgba(232,112,26,0.25)', color: '#FFBA70', fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>{c}</span>
            ))}
          </div>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Summary */}
          {trial.brief_summary && (
            <div>
              <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A9BA8', marginBottom: 8 }}>Study summary</p>
              <p style={{ fontSize: '0.83rem', color: '#374151', lineHeight: 1.75 }}>{trial.brief_summary}</p>
            </div>
          )}

          {/* Key facts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Status', value: collaboratorStatus(trial.overall_status).label },
              { label: 'Total sites', value: `${trial.total_sites} site${trial.total_sites !== 1 ? 's' : ''}` },
              { label: 'Eligible ages', value: trial.minimum_age || trial.maximum_age ? `${trial.minimum_age?.replace(' Years','') ?? '0'}${trial.maximum_age ? `–${trial.maximum_age.replace(' Years','')}` : '+'} years` : 'Not specified' },
              { label: 'Healthy volunteers', value: trial.healthy_volunteers ? 'Yes — open to healthy participants' : 'No' },
              { label: 'Start date', value: trial.start_date ? fmt(trial.start_date) : 'Not listed' },
              { label: 'Completion', value: trial.primary_completion_date ? fmt(trial.primary_completion_date) : 'Ongoing' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#F8F9FB', borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A9BA8', marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1B3A52' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Sites */}
          {trial.countries_at_sites.length > 0 && (
            <div>
              <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A9BA8', marginBottom: 8 }}>Countries with sites</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {trial.countries_at_sites.map(c => (
                  <span key={c} style={{ background: '#EEF2F6', color: '#1B3A52', fontSize: '0.72rem', fontWeight: 600, padding: '4px 12px', borderRadius: 999 }}>{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* All contacts */}
          {allContacts.length > 0 && (
            <div>
              <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A9BA8', marginBottom: 10 }}>All contacts</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allContacts.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: '#F8F9FB', border: '1px solid #E8EDF2', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      {isPersonName(c.name) && <p style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1B3A52', marginBottom: 2 }}>{c.name}</p>}
                      <p style={{ fontSize: '0.7rem', color: '#8A9BA8' }}>{formatRole(c.role)}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {c.email && <a href={`mailto:${c.email}`} style={{ fontSize: '0.75rem', color: '#1B3A52', fontWeight: 600, textDecoration: 'none' }}>{c.email}</a>}
                      {c.phone && <a href={`tel:${c.phone}`} style={{ fontSize: '0.75rem', color: '#4A6070', fontWeight: 600, textDecoration: 'none' }}>{c.phone}</a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <a
              href={`https://clinicaltrials.gov/study/${trial.nct_id}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: '1.5px solid #E2D9C8',
                background: '#FBF7F0', color: '#1B3A52',
                fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif", textDecoration: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              View on ClinicalTrials.gov
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── States ───────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: '#FFFFFF', borderRadius: 18, border: '1.5px solid #E2D9C8', overflow: 'hidden' }}>
          <div style={{ height: 90, background: 'linear-gradient(135deg,#E2D9C8,#D5C9B8)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ height: 16, width: '65%', background: '#EEE8DE', borderRadius: 6, animation: 'pulse 1.4s ease-in-out infinite' }} />
            <div style={{ height: 12, width: '40%', background: '#EEE8DE', borderRadius: 4, animation: 'pulse 1.4s ease-in-out infinite' }} />
            <div style={{ height: 52, background: '#F4F8FB', borderRadius: 10, animation: 'pulse 1.4s ease-in-out infinite' }} />
          </div>
        </div>
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ background: '#FFF5F5', border: '1.5px solid #FCA5A5', borderRadius: 12, padding: 20, color: '#DC2626', fontSize: '0.85rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <strong>Search failed:</strong> {message}
    </div>
  )
}

function EmptyResults() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#8A9BA8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <p style={{ fontWeight: 700, fontSize: '1rem', color: '#1B3A52', marginBottom: 8 }}>No trials found</p>
      <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>Try removing phase filters, increasing distance, or using a broader condition name.</p>
    </div>
  )
}
