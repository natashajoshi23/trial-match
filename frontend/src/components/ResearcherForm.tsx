import { useState, useRef, KeyboardEvent } from 'react'
import type { ResearcherSearchRequest } from '../types'

const COUNTRIES = [
  'Argentina','Australia','Austria','Belgium','Brazil','Canada','Chile','China',
  'Colombia','Czech Republic','Denmark','Egypt','Finland','France','Germany',
  'Greece','Hungary','India','Indonesia','Ireland','Israel','Italy','Japan',
  'Jordan','Kenya','Malaysia','Mexico','Netherlands','New Zealand','Nigeria',
  'Norway','Pakistan','Peru','Philippines','Poland','Portugal','Romania',
  'Russia','Saudi Arabia','Singapore','South Africa','South Korea','Spain',
  'Sweden','Switzerland','Taiwan','Thailand','Turkey','Ukraine',
  'United Arab Emirates','United Kingdom','United States','Vietnam',
]

const PHASE_OPTIONS = [
  { label: 'Phase 1', value: 'PHASE1' },
  { label: 'Phase 2', value: 'PHASE2' },
  { label: 'Phase 3', value: 'PHASE3' },
  { label: 'Phase 4', value: 'PHASE4' },
]

const SPONSOR_OPTIONS = [
  { label: 'Industry', value: 'INDUSTRY', desc: 'Pharma / Biotech' },
  { label: 'NIH', value: 'NIH', desc: 'National Institutes of Health' },
  { label: 'Government', value: 'FED', desc: 'Federal / Gov\'t agencies' },
  { label: 'Academic / Other', value: 'OTHER', desc: 'Universities, nonprofits' },
]

const STUDY_TYPE_OPTIONS = [
  { label: 'Interventional', value: 'INTERVENTIONAL' },
  { label: 'Observational', value: 'OBSERVATIONAL' },
]

const INTERVENTION_OPTIONS = [
  { label: 'Drug', value: 'DRUG' },
  { label: 'Biological', value: 'BIOLOGICAL' },
  { label: 'Device', value: 'DEVICE' },
  { label: 'Behavioral', value: 'BEHAVIORAL' },
  { label: 'Procedure', value: 'PROCEDURE' },
  { label: 'Radiation', value: 'RADIATION' },
  { label: 'Dietary Supplement', value: 'DIETARY_SUPPLEMENT' },
  { label: 'Other', value: 'OTHER' },
]

const TOP_K_OPTIONS = [5, 10, 15, 20]

const s = {
  label: { fontSize: '0.72rem', fontWeight: 700, color: '#4A6070', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6, display: 'block' },
  input: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #D9CFC2', background: '#FFFFFF', fontSize: '0.875rem', color: '#1B3A52', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', boxSizing: 'border-box' as const },
  pill: (active: boolean) => ({
    padding: '5px 13px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', border: 'none',
    background: active ? '#1B3A52' : '#EEE8DE', color: active ? '#FFFFFF' : '#4A6070',
    fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.12s',
  }),
  section: { marginBottom: 20 },
}

interface Props {
  onSubmit: (req: ResearcherSearchRequest) => void
  onDemo: () => void
  loading: boolean
}

export default function ResearcherForm({ onSubmit, onDemo, loading }: Props) {
  const [conditions, setConditions] = useState<string[]>([])
  const [condInput, setCondInput] = useState('')
  const [country, setCountry] = useState('United States')
  const [zip, setZip] = useState('')
  const [phases, setPhases] = useState<string[]>([])
  const [sponsorTypes, setSponsorTypes] = useState<string[]>([])
  const [studyTypes, setStudyTypes] = useState<string[]>([])
  const [interventionTypes, setInterventionTypes] = useState<string[]>([])
  const [volunteersOnly, setVolunteersOnly] = useState(false)
  const [topK, setTopK] = useState(10)
  const [maxDist, setMaxDist] = useState<number | null>(null)
  const condInputRef = useRef<HTMLInputElement>(null)

  const toggle = (list: string[], val: string, set: (v: string[]) => void) =>
    set(list.includes(val) ? list.filter(x => x !== val) : [...list, val])

  const toggleStudyType = (val: string) => {
    const next = studyTypes.includes(val) ? studyTypes.filter(x => x !== val) : [...studyTypes, val]
    setStudyTypes(next)
    if (!next.includes('INTERVENTIONAL')) setInterventionTypes([])
  }

  const addCondition = (raw: string) => {
    const val = raw.trim()
    if (!val) return
    if (!conditions.includes(val)) setConditions(c => [...c, val])
    setCondInput('')
  }

  const removeCondition = (val: string) => setConditions(c => c.filter(x => x !== val))

  const handleCondChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val.endsWith(',')) {
      addCondition(val.slice(0, -1))
    } else {
      setCondInput(val)
    }
  }

  const handleCondKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCondition(condInput)
    } else if (e.key === 'Backspace' && condInput === '' && conditions.length > 0) {
      setConditions(c => c.slice(0, -1))
    }
  }

  const clearFilters = () => {
    setPhases([])
    setSponsorTypes([])
    setStudyTypes([])
    setInterventionTypes([])
    setVolunteersOnly(false)
    setMaxDist(null)
  }

  const hasFilters = phases.length > 0 || sponsorTypes.length > 0 || studyTypes.length > 0 ||
    interventionTypes.length > 0 || volunteersOnly || maxDist !== null

  const canSubmit = conditions.length > 0 || condInput.trim() !== ''

  const handleSubmit = () => {
    if (!canSubmit) return
    const finalConditions = condInput.trim()
      ? [...conditions, condInput.trim()]
      : conditions
    onSubmit({
      conditions: finalConditions,
      zip_code: zip,
      country,
      phases,
      sponsor_types: sponsorTypes,
      study_types: studyTypes,
      intervention_types: interventionTypes,
      healthy_volunteers_only: volunteersOnly,
      top_k: topK,
      max_distance_miles: maxDist,
    })
  }

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1.5px solid #E2D9C8', padding: 24, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 800, fontSize: '1rem', color: '#1B3A52', marginBottom: 4 }}>Find a Trial to Work In</p>
        <p style={{ fontSize: '0.78rem', color: '#8A9BA8', lineHeight: 1.5 }}>Search trials by condition, filter by phase and role, and get direct contact info for investigators.</p>
      </div>

      {/* Condition tag input */}
      <div style={s.section}>
        <label style={s.label}>Therapeutic area / condition *</label>
        <div
          onClick={() => condInputRef.current?.focus()}
          style={{
            display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
            padding: '7px 10px', borderRadius: 8, border: '1.5px solid #D9CFC2',
            background: '#FFFFFF', cursor: 'text', minHeight: 42,
          }}
        >
          {conditions.map(c => (
            <span key={c} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: '#1B3A52', color: '#FFFFFF', borderRadius: 999,
              fontSize: '0.73rem', fontWeight: 700, padding: '3px 10px',
            }}>
              {c}
              <button
                onClick={e => { e.stopPropagation(); removeCondition(c) }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 0, fontSize: '0.8rem', lineHeight: 1, marginLeft: 2 }}
              >×</button>
            </span>
          ))}
          <input
            ref={condInputRef}
            value={condInput}
            onChange={handleCondChange}
            onKeyDown={handleCondKey}
            onBlur={() => addCondition(condInput)}
            placeholder={conditions.length === 0 ? "e.g. Multiple Myeloma, Leukemia" : "Add another…"}
            style={{ border: 'none', outline: 'none', fontSize: '0.875rem', color: '#1B3A52', fontFamily: "'Plus Jakarta Sans', sans-serif", flexGrow: 1, minWidth: 160, background: 'transparent' }}
          />
        </div>
      </div>

      {/* Phase */}
      <div style={s.section}>
        <label style={s.label}>Phase preference</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PHASE_OPTIONS.map(p => (
            <button key={p.value} style={s.pill(phases.includes(p.value))} onClick={() => toggle(phases, p.value, setPhases)}>
              {p.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: '0.68rem', color: '#8A9BA8', marginTop: 6 }}>Leave blank for all phases</p>
      </div>

      {/* Sponsor type */}
      <div style={s.section}>
        <label style={s.label}>Sponsor type</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SPONSOR_OPTIONS.map(o => (
            <button key={o.value} style={s.pill(sponsorTypes.includes(o.value))} onClick={() => toggle(sponsorTypes, o.value, setSponsorTypes)}>
              {o.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: '0.68rem', color: '#8A9BA8', marginTop: 6 }}>Leave blank for all sponsors</p>
      </div>

      {/* Study type */}
      <div style={s.section}>
        <label style={s.label}>Study type</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STUDY_TYPE_OPTIONS.map(o => (
            <button key={o.value} style={s.pill(studyTypes.includes(o.value))} onClick={() => toggleStudyType(o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Intervention type — only relevant for interventional studies */}
      {studyTypes.includes('INTERVENTIONAL') && (
        <div style={s.section}>
          <label style={s.label}>Intervention type</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {INTERVENTION_OPTIONS.map(o => (
              <button key={o.value} style={s.pill(interventionTypes.includes(o.value))} onClick={() => toggle(interventionTypes, o.value, setInterventionTypes)}>
                {o.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.68rem', color: '#8A9BA8', marginTop: 6 }}>Leave blank for all intervention types</p>
        </div>
      )}

      {/* Healthy volunteers */}
      <div style={{ ...s.section, display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="checkbox"
          id="hv"
          checked={volunteersOnly}
          onChange={e => setVolunteersOnly(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: '#1B3A52', cursor: 'pointer' }}
        />
        <label htmlFor="hv" style={{ fontSize: '0.82rem', color: '#1B3A52', fontWeight: 600, cursor: 'pointer' }}>
          Healthy volunteer trials only
        </label>
      </div>

      {/* Country + Postal code */}
      <div style={{ ...s.section, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' }}>
        <div>
          <label style={s.label}>Country</label>
          <select style={{ ...s.input, paddingRight: 8 }} value={country} onChange={e => setCountry(e.target.value)}>
            {COUNTRIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>Postal code</span>
            {country !== 'United States' && <span style={{ fontWeight: 400, color: '#8A9BA8', textTransform: 'none', letterSpacing: 0, fontSize: '0.68rem' }}>(optional)</span>}
          </label>
          <input style={s.input} placeholder={country === 'United States' ? 'e.g. 10001' : 'Optional'} value={zip} onChange={e => setZip(e.target.value)} />
        </div>
      </div>

      {/* Max distance */}
      <div style={s.section}>
        <label style={s.label}>Max distance (miles)</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[null, 25, 50, 100, 250].map(d => (
            <button key={d ?? 'none'} style={s.pill(maxDist === d)} onClick={() => setMaxDist(d)}>
              {d === null ? 'No limit' : `≤${d} mi`}
            </button>
          ))}
        </div>
      </div>

      {/* Max results */}
      <div style={s.section}>
        <label style={s.label}>Max results</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {TOP_K_OPTIONS.map(k => (
            <button key={k} style={{ ...s.pill(topK === k), minWidth: 44 }} onClick={() => setTopK(k)}>{k}</button>
          ))}
        </div>
      </div>

      {hasFilters && (
        <button
          onClick={clearFilters}
          style={{
            width: '100%', padding: '8px 0', borderRadius: 10, border: '1.5px solid #E2D9C8',
            background: 'transparent', color: '#8A9BA8', fontWeight: 600, fontSize: '0.78rem',
            fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer', marginBottom: 10,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#D5CEBF'; e.currentTarget.style.color = '#4A6070' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2D9C8'; e.currentTarget.style.color = '#8A9BA8' }}
        >
          Clear all filters
        </button>
      )}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
          background: canSubmit && !loading ? '#1B3A52' : '#B0BEC5',
          color: '#FFFFFF', fontWeight: 800, fontSize: '0.9rem',
          fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'background 0.15s',
        }}
      >
        {loading ? (
          <>
            <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
            Searching…
          </>
        ) : (
          <>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z" />
            </svg>
            Find Trial Sites
          </>
        )}
      </button>
      <button
        onClick={onDemo}
        style={{
          width: '100%', marginTop: 8, padding: '9px 0', borderRadius: 10,
          border: '1.5px solid rgba(232,112,26,0.35)',
          background: 'rgba(232,112,26,0.05)', color: '#C05A00',
          fontWeight: 700, fontSize: '0.78rem',
          fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,112,26,0.11)'; e.currentTarget.style.borderColor = 'rgba(232,112,26,0.55)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(232,112,26,0.05)'; e.currentTarget.style.borderColor = 'rgba(232,112,26,0.35)' }}
      >
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
        </svg>
        Load demo results
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
