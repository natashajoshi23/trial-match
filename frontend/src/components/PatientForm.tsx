import { useState, useEffect, FormEvent } from 'react'
import TagInput from './TagInput'
import type { PatientProfile } from '../types'

interface Props {
  onSubmit: (patient: PatientProfile, topK: number, maxDistance: number | null) => void
  loading: boolean
}

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
  'France', 'Netherlands', 'Spain', 'Italy', 'Switzerland', 'Belgium',
  'Japan', 'South Korea', 'China', 'India', 'Brazil', 'Mexico',
  'Sweden', 'Denmark', 'Norway', 'Israel', 'Singapore',
]

const EMPTY: PatientProfile = {
  age: 0,
  sex: 'female',
  condition: '',
  zip_code: '',
  country: 'United States',
  ecog_status: null,
  biomarkers: [],
  current_medications: [],
  prior_treatments: [],
  comorbidities: [],
  additional_notes: '',
}

const DEMO: PatientProfile = {
  age: 52,
  sex: 'female',
  condition: 'HER2-positive breast cancer',
  zip_code: '10001',
  country: 'United States',
  ecog_status: 1,
  biomarkers: ['HER2+', 'ER-', 'PR-'],
  current_medications: ['trastuzumab'],
  prior_treatments: ['surgery', 'radiation'],
  comorbidities: ['hypertension'],
  additional_notes: '',
}

const ECOG_OPTIONS = [
  { score: 0, short: 'Fully active', long: 'No restrictions' },
  { score: 1, short: 'Restricted', long: 'Strenuous activity limited' },
  { score: 2, short: 'Self-care', long: 'Ambulatory, no work' },
  { score: 3, short: 'Limited', long: 'Confined to bed >50% of day' },
  { score: 4, short: 'Disabled', long: 'Completely confined' },
]

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#8A9BA8',
  marginBottom: 8,
}

// Navy = #1B3A52  used everywhere violet used to be
const NAVY = '#1B3A52'
const NAVY_BG = 'rgba(27,58,82,0.09)'
const NAVY_BORDER = 'rgba(27,58,82,0.35)'
const NAVY_SHADOW = 'rgba(27,58,82,0.14)'

function FocusInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [f, setF] = useState(false)
  return (
    <input
      {...props}
      style={{
        width: '100%', borderRadius: 10,
        border: `1.5px solid ${f ? NAVY : '#DDD5C0'}`,
        background: '#FFFFFF',
        padding: '10px 14px',
        fontSize: '0.9rem', color: NAVY,
        outline: 'none',
        boxShadow: f ? `0 0 0 3px ${NAVY_BG}` : 'none',
        transition: 'border-color .15s, box-shadow .15s',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        ...props.style,
      }}
      onFocus={e => { setF(true); props.onFocus?.(e) }}
      onBlur={e => { setF(false); props.onBlur?.(e) }}
    />
  )
}

// ─── Step 1: Patient Profile ──────────────────────────────────────────────────
function StepProfile({ p, set }: { p: PatientProfile; set: (k: keyof PatientProfile, v: any) => void }) {
  const [ageDisplay, setAgeDisplay] = useState(String(p.age))
  useEffect(() => { setAgeDisplay(String(p.age)) }, [p.age])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Sex toggle */}
      <div>
        <p style={fieldLabel}>Biological sex</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {(['female', 'male', 'other'] as const).map(s => {
            const active = p.sex === s
            const icons: Record<string, string> = { female: '♀', male: '♂', other: '◇' }
            const labels: Record<string, string> = { female: 'Female', male: 'Male', other: 'Other' }
            return (
              <button
                key={s}
                type="button"
                onClick={() => set('sex', s)}
                style={{
                  borderRadius: 12,
                  padding: '12px 8px',
                  border: active ? `1.5px solid ${NAVY}` : '1.5px solid #DDD5C0',
                  background: active ? NAVY_BG : '#FFFFFF',
                  color: active ? NAVY : '#8A9BA8',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  boxShadow: active ? `0 2px 10px ${NAVY_SHADOW}` : '0 1px 3px rgba(27,58,82,0.06)',
                  transition: 'all .15s',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{icons[s]}</span>
                <span>{labels[s]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Age stepper */}
      <div>
        <p style={fieldLabel}>Age</p>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#F7F3EC',
          border: '1.5px solid #DDD5C0',
          borderRadius: 12, padding: '8px 14px',
        }}>
          <button
            type="button"
            onClick={() => set('age', Math.max(0, p.age - 1))}
            style={{
              width: 36, height: 36, borderRadius: 10,
              border: '1.5px solid #DDD5C0', background: '#FFFFFF',
              color: NAVY, fontSize: '1.2rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s', flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget.style.background = NAVY_BG) }}
            onMouseLeave={e => { (e.currentTarget.style.background = '#FFFFFF') }}
          >−</button>
          <input
            type="number"
            min={0}
            max={120}
            value={ageDisplay}
            onChange={e => {
              const raw = e.target.value
              setAgeDisplay(raw)
              const v = parseInt(raw, 10)
              if (!isNaN(v)) set('age', Math.min(120, Math.max(0, v)))
            }}
            onFocus={e => e.target.select()}
            onBlur={() => {
              const v = parseInt(ageDisplay, 10)
              const clamped = isNaN(v) ? 0 : Math.min(120, Math.max(0, v))
              set('age', clamped)
              setAgeDisplay(String(clamped))
            }}
            aria-label="Age"
            style={{
              flex: 1, textAlign: 'center',
              fontSize: '1.6rem', fontWeight: 800,
              color: NAVY, letterSpacing: '-0.02em',
              fontFamily: "'JetBrains Mono', monospace",
              border: 'none', background: 'transparent',
              outline: 'none', width: 0, minWidth: 0,
              MozAppearance: 'textfield',
            }}
          />
          <button
            type="button"
            onClick={() => set('age', Math.min(120, p.age + 1))}
            style={{
              width: 36, height: 36, borderRadius: 10,
              border: '1.5px solid #DDD5C0', background: '#FFFFFF',
              color: NAVY, fontSize: '1.2rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s', flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget.style.background = NAVY_BG) }}
            onMouseLeave={e => { (e.currentTarget.style.background = '#FFFFFF') }}
          >+</button>
        </div>
      </div>

      {/* Condition */}
      <div>
        <p style={fieldLabel}>Primary condition *</p>
        <FocusInput
          type="text"
          required
          placeholder="e.g. HER2-positive breast cancer"
          value={p.condition}
          onChange={e => set('condition', e.target.value)}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {[
            'Non-small cell lung cancer',
            'Glioblastoma',
            'Type 2 diabetes',
            'Prostate cancer',
            'HER2+ breast cancer',
          ].map(c => (
            <button
              key={c}
              type="button"
              onClick={() => set('condition', c)}
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 999,
                border: `1px solid ${p.condition === c ? NAVY_BORDER : 'rgba(27,58,82,0.18)'}`,
                background: p.condition === c ? NAVY_BG : 'transparent',
                color: p.condition === c ? NAVY : '#6B8291',
                cursor: 'pointer',
                transition: 'all 0.12s',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
              onMouseEnter={e => {
                if (p.condition !== c) {
                  e.currentTarget.style.borderColor = NAVY_BORDER
                  e.currentTarget.style.color = NAVY
                }
              }}
              onMouseLeave={e => {
                if (p.condition !== c) {
                  e.currentTarget.style.borderColor = 'rgba(27,58,82,0.18)'
                  e.currentTarget.style.color = '#6B8291'
                }
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Country */}
      <div>
        <p style={fieldLabel}>Country *</p>
        <select
          value={p.country}
          onChange={e => set('country', e.target.value)}
          style={{
            width: '100%', borderRadius: 10,
            border: `1.5px solid #DDD5C0`,
            background: '#FFFFFF',
            padding: '10px 14px',
            fontSize: '0.9rem', color: NAVY,
            outline: 'none',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238A9BA8' stroke-width='2.5'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 14px center',
            paddingRight: 36,
          }}
        >
          {COUNTRIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Postal code */}
      <div>
        <p style={fieldLabel}>Postal code *</p>
        <FocusInput
          type="text"
          required
          placeholder={p.country === 'United States' ? 'e.g. 10001' : p.country === 'United Kingdom' ? 'e.g. SW1A 1AA' : p.country === 'Canada' ? 'e.g. M5V 3A4' : 'Postal code'}
          value={p.zip_code}
          onChange={e => set('zip_code', e.target.value)}
        />
      </div>
    </div>
  )
}

// ─── Step 2: Clinical Details ─────────────────────────────────────────────────
function StepClinical({ p, set }: { p: PatientProfile; set: (k: keyof PatientProfile, v: any) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* ECOG cards */}
      <div>
        <p style={fieldLabel}>ECOG performance status</p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {[null, ...ECOG_OPTIONS.map(o => o.score)].map((val) => {
            const active = p.ecog_status === val
            const label = val === null ? '—' : String(val)
            return (
              <button
                key={String(val)}
                type="button"
                onClick={() => set('ecog_status', val)}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  borderRadius: 10,
                  border: active ? `1.5px solid ${NAVY}` : '1.5px solid #DDD5C0',
                  background: active ? NAVY_BG : '#FFFFFF',
                  color: active ? NAVY : '#8A9BA8',
                  cursor: 'pointer',
                  fontSize: '1rem', fontWeight: 800,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  boxShadow: active ? `0 2px 10px ${NAVY_SHADOW}` : '0 1px 3px rgba(27,58,82,0.06)',
                  transition: 'all .15s',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
        {p.ecog_status !== null && (
          <p style={{ fontSize: '0.72rem', color: NAVY, marginTop: 4, fontWeight: 600 }}>
            {p.ecog_status} — {ECOG_OPTIONS[p.ecog_status].short}: {ECOG_OPTIONS[p.ecog_status].long}
          </p>
        )}
        {p.ecog_status === null && (
          <p style={{ fontSize: '0.72rem', color: '#8A9BA8' }}>Not reported</p>
        )}
      </div>

      <TagInput label="Biomarkers" placeholder="HER2+, ER-, BRCA1 …" tags={p.biomarkers} onChange={v => set('biomarkers', v)} />
      <TagInput label="Current medications" placeholder="trastuzumab, letrozole …" tags={p.current_medications} onChange={v => set('current_medications', v)} />
      <TagInput label="Prior treatments" placeholder="surgery, radiation …" tags={p.prior_treatments} onChange={v => set('prior_treatments', v)} />
      <TagInput label="Comorbidities" placeholder="hypertension, diabetes …" tags={p.comorbidities} onChange={v => set('comorbidities', v)} />

      <div>
        <p style={fieldLabel}>Additional notes</p>
        <textarea
          rows={3}
          placeholder="Any other relevant clinical details…"
          value={p.additional_notes}
          onChange={e => set('additional_notes', e.target.value)}
          style={{
            width: '100%', borderRadius: 10,
            border: '1.5px solid #DDD5C0', background: '#FFFFFF',
            padding: '10px 14px', fontSize: '0.85rem', color: NAVY,
            outline: 'none', resize: 'none',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  )
}

// ─── Step 3: Search options + summary ────────────────────────────────────────
function StepSearch({
  p, topK, setTopK, maxDist, setMaxDist, loading,
}: {
  p: PatientProfile; topK: number; setTopK: (n: number) => void
  maxDist: string; setMaxDist: (s: string) => void; loading: boolean
}) {
  const RESULT_OPTS = [5, 10, 15, 20]
  const DIST_PRESETS = [25, 50, 100, 250]

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 0',
    borderRadius: 10,
    border: active ? `1.5px solid ${NAVY}` : '1.5px solid #DDD5C0',
    background: active ? NAVY_BG : '#FFFFFF',
    color: active ? NAVY : '#8A9BA8',
    cursor: 'pointer',
    fontWeight: 800, fontSize: '0.95rem',
    transition: 'all .15s',
    fontFamily: "'JetBrains Mono', monospace",
    boxShadow: active ? `0 2px 10px ${NAVY_SHADOW}` : '0 1px 3px rgba(27,58,82,0.06)',
  })

  const distStyle = (active: boolean): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: 20,
    border: active ? `1.5px solid ${NAVY}` : '1.5px solid #DDD5C0',
    background: active ? NAVY_BG : '#FFFFFF',
    color: active ? NAVY : '#8A9BA8',
    cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
    transition: 'all .15s',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    boxShadow: active ? `0 2px 10px ${NAVY_SHADOW}` : '0 1px 3px rgba(27,58,82,0.06)',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Max results */}
      <div>
        <p style={fieldLabel}>Max results</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {RESULT_OPTS.map(n => (
            <button key={n} type="button" onClick={() => setTopK(n)} style={pillStyle(topK === n)}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Max distance */}
      <div>
        <p style={fieldLabel}>Max distance (miles)</p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setMaxDist('')} style={distStyle(maxDist === '')}>
            No limit
          </button>
          {DIST_PRESETS.map(d => (
            <button key={d} type="button" onClick={() => setMaxDist(String(d))} style={distStyle(maxDist === String(d))}>
              ≤ {d} mi
            </button>
          ))}
        </div>
        <FocusInput
          type="number"
          min={0}
          placeholder="Custom (miles)…"
          value={maxDist}
          onChange={e => setMaxDist(e.target.value)}
          style={{ fontSize: '0.85rem' }}
        />
      </div>

      {/* Patient summary */}
      <div style={{
        borderRadius: 12,
        border: '1.5px solid #E2D9C8',
        background: '#F7F3EC',
        padding: '14px 16px',
      }}>
        <p style={{ ...fieldLabel, marginBottom: 12 }}>Summary</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem' }}>
          <SummaryRow icon="👤" label="Patient" value={`${p.age}yo ${p.sex}`} />
          <SummaryRow icon="🩺" label="Condition" value={p.condition || '—'} />
          <SummaryRow icon="📍" label="ZIP" value={p.zip_code || '—'} />
          {p.ecog_status !== null && (
            <SummaryRow icon="📊" label="ECOG" value={`${p.ecog_status} — ${ECOG_OPTIONS[p.ecog_status].short}`} />
          )}
          {p.biomarkers.length > 0 && (
            <SummaryRow icon="🔬" label="Biomarkers" value={p.biomarkers.join(', ')} />
          )}
          {p.current_medications.length > 0 && (
            <SummaryRow icon="💊" label="Medications" value={p.current_medications.join(', ')} />
          )}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%', borderRadius: 14, padding: '14px 0',
          fontSize: '0.92rem', fontWeight: 800, letterSpacing: '0.02em',
          color: loading ? '#8A9BA8' : '#fff', border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          background: loading ? '#E2D9C8' : `linear-gradient(135deg, ${NAVY} 0%, #2D5F7C 100%)`,
          boxShadow: loading ? 'none' : '0 6px 24px rgba(27,58,82,0.35)',
          transition: 'all .2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {loading ? (
          <>
            <svg className="animate-spin" width="18" height="18" fill="none" viewBox="0 0 24 24">
              <circle opacity="0.25" cx="12" cy="12" r="10" stroke="#8A9BA8" strokeWidth="4" />
              <path opacity="0.75" fill="#8A9BA8" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Searching trials…
          </>
        ) : (
          <>
            <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            Find Matching Trials
          </>
        )}
      </button>
    </div>
  )
}

function SummaryRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
      <span style={{ fontSize: '0.75rem', flexShrink: 0 }}>{icon}</span>
      <span style={{ color: '#8A9BA8', fontWeight: 600, flexShrink: 0, fontSize: '0.72rem' }}>{label}</span>
      <span style={{ color: NAVY, flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
        {value}
      </span>
    </div>
  )
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i < step
        const active = i === step
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              border: active || done ? `2px solid ${NAVY}` : '2px solid #DDD5C0',
              background: active ? NAVY : done ? NAVY_BG : '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: active ? `0 0 10px ${NAVY_SHADOW}` : 'none',
              transition: 'all .3s',
              zIndex: 1,
            }}>
              {done ? (
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <span style={{
                  fontSize: '0.68rem', fontWeight: 800,
                  color: active ? '#fff' : '#C0C8CF',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {i + 1}
                </span>
              )}
            </div>
            {i < total - 1 && (
              <div style={{
                flex: 1, height: 2, borderRadius: 1,
                background: done ? `rgba(27,58,82,0.35)` : '#E2D9C8',
                transition: 'background .3s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PatientForm({ onSubmit, loading }: Props) {
  const [step, setStep] = useState(0)
  const [p, setP] = useState<PatientProfile>(EMPTY)
  const [topK, setTopK] = useState(10)
  const [maxDist, setMaxDist] = useState<string>('')

  const set = <K extends keyof PatientProfile>(k: K, v: PatientProfile[K]) =>
    setP(prev => ({ ...prev, [k]: v }))

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (step < 2) { setStep(step + 1); return }
    onSubmit(p, topK, maxDist ? Number(maxDist) : null)
  }

  const loadDemo = () => { setP(DEMO); setMaxDist('') }

  const canNext = step === 0 ? p.condition.trim() !== '' && p.zip_code.trim() !== '' : true

  const stepTitles = ['Patient Profile', 'Clinical Details', 'Search Settings']
  const stepSubs = ['Core patient information', 'Optional clinical data', 'Configure & launch']

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        border: '1.5px solid #E2D9C8',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(27,58,82,0.1)',
      }}
    >
      {/* Top header */}
      <div style={{
        padding: '18px 22px 16px',
        background: `linear-gradient(135deg, ${NAVY_BG} 0%, rgba(245,182,66,0.04) 100%)`,
        borderBottom: '1.5px solid #E2D9C8',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '0.95rem', color: NAVY, letterSpacing: '-0.01em' }}>
            {stepTitles[step]}
          </h2>
          <p style={{ fontSize: '0.7rem', color: '#8A9BA8', marginTop: 3 }}>{stepSubs[step]}</p>
        </div>
        <button
          type="button"
          onClick={loadDemo}
          style={{
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em',
            padding: '5px 11px', borderRadius: 999,
            background: NAVY_BG,
            border: `1.5px solid ${NAVY_BORDER}`,
            color: NAVY, cursor: 'pointer',
            transition: 'all .15s', flexShrink: 0,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
          onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(27,58,82,0.15)') }}
          onMouseLeave={e => { (e.currentTarget.style.background = NAVY_BG) }}
        >
          Demo
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '22px 22px 20px' }}>
        <StepDots step={step} total={3} />

        <div style={{ minHeight: 280 }}>
          {step === 0 && <StepProfile p={p} set={set} />}
          {step === 1 && <StepClinical p={p} set={set} />}
          {step === 2 && (
            <StepSearch
              p={p} topK={topK} setTopK={setTopK}
              maxDist={maxDist} setMaxDist={setMaxDist}
              loading={loading}
            />
          )}
        </div>

        {step < 2 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                style={{
                  flex: '0 0 auto',
                  padding: '11px 20px', borderRadius: 12,
                  border: '1.5px solid #DDD5C0', background: '#FFFFFF',
                  color: '#8A9BA8', cursor: 'pointer',
                  fontSize: '0.82rem', fontWeight: 700,
                  transition: 'all .15s',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
                onMouseEnter={e => { (e.currentTarget.style.borderColor = NAVY); (e.currentTarget.style.color = NAVY) }}
                onMouseLeave={e => { (e.currentTarget.style.borderColor = '#DDD5C0'); (e.currentTarget.style.color = '#8A9BA8') }}
              >
                ← Back
              </button>
            )}
            <button
              type="submit"
              disabled={!canNext}
              style={{
                flex: 1,
                padding: '11px 0', borderRadius: 12,
                border: 'none',
                background: canNext ? `linear-gradient(135deg, ${NAVY} 0%, #2D5F7C 100%)` : '#E2D9C8',
                color: canNext ? '#fff' : '#B0B8C0',
                cursor: canNext ? 'pointer' : 'not-allowed',
                fontSize: '0.85rem', fontWeight: 800,
                boxShadow: canNext ? '0 4px 16px rgba(27,58,82,0.28)' : 'none',
                transition: 'all .2s',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {step === 0 ? 'Next: Clinical details →' : 'Next: Search options →'}
            </button>
          </div>
        )}

        {step === 2 && (
          <button
            type="button"
            onClick={() => setStep(1)}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '9px 0', borderRadius: 12,
              border: '1.5px solid #DDD5C0', background: 'none',
              color: '#8A9BA8', cursor: 'pointer',
              fontSize: '0.78rem', fontWeight: 600,
              transition: 'all .15s',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
            onMouseEnter={e => { (e.currentTarget.style.color = NAVY); (e.currentTarget.style.borderColor = NAVY) }}
            onMouseLeave={e => { (e.currentTarget.style.color = '#8A9BA8'); (e.currentTarget.style.borderColor = '#DDD5C0') }}
          >
            ← Back to clinical details
          </button>
        )}
      </div>
    </form>
  )
}
