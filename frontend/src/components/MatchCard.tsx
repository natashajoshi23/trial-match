import { useState, useEffect, useId } from 'react'
import type { TrialMatchResult } from '../types'

interface Props {
  trial: TrialMatchResult
  rank: number
  compareSelected?: boolean
  onCompareToggle?: () => void
  isSaved?: boolean
  onSaveToggle?: () => void
}

const NAVY = '#1B3A52'
const RING_R = 38
const RING_CIRC = 2 * Math.PI * RING_R

function accentColor(score: number, excluded: boolean) {
  if (excluded) return '#C03A2B'
  if (score >= 0.70) return NAVY
  if (score >= 0.50) return '#E8701A'
  return '#C0CBD3'
}

function scoreColor(score: number, excluded: boolean) {
  if (excluded) return '#C03A2B'
  if (score >= 0.70) return '#0E7A4E'
  if (score >= 0.50) return '#C07000'
  return '#8A9BA8'
}

function ScoreRing({ score, excluded, uid }: { score: number; excluded: boolean; uid: string }) {
  const [mounted, setMounted] = useState(false)
  const [displayPct, setDisplayPct] = useState(0)
  const pct = Math.round(score * 100)
  const targetDash = RING_CIRC * (excluded ? 0.08 : score)
  const targetOffset = RING_CIRC - targetDash
  const colorA = excluded ? '#C03A2B' : score >= 0.7 ? NAVY : '#E8701A'
  const colorB = excluded ? '#E8701A' : '#F5B642'

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)))
    const duration = 1100
    const start = performance.now()
    let rafId: number
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayPct(Math.round(eased * pct))
      if (t < 1) rafId = requestAnimationFrame(step)
    }
    rafId = requestAnimationFrame(step)
    return () => { cancelAnimationFrame(raf); cancelAnimationFrame(rafId) }
  }, [pct])

  const gradId = `rg-${uid}`
  return (
    <div style={{ position: 'relative', width: 104, height: 104, flexShrink: 0 }}>
      <svg width="104" height="104" viewBox="0 0 104 104">
        <defs>
          <linearGradient id={gradId} gradientTransform="rotate(60,52,52)">
            <stop offset="0%" stopColor={colorA} />
            <stop offset="100%" stopColor={colorB} />
          </linearGradient>
        </defs>
        <circle cx="52" cy="52" r={RING_R} fill="none" stroke="#EDE8E0" strokeWidth="7" />
        <circle
          cx="52" cy="52" r={RING_R}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={RING_CIRC}
          strokeDashoffset={mounted ? targetOffset : RING_CIRC}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '52px 52px', transition: 'stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1, color: scoreColor(score, excluded), fontFamily: "'JetBrains Mono', monospace" }}>
          {displayPct}
        </span>
        <span style={{ fontSize: '0.58rem', fontWeight: 700, color: scoreColor(score, excluded) + '99', letterSpacing: '0.04em' }}>%</span>
      </div>
    </div>
  )
}

function ScoreTooltip({ breakdown }: { breakdown: { semantic: number; eligibility: number; geo: number } }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
      zIndex: 200, background: NAVY, borderRadius: 10, padding: '10px 14px', width: 176,
      boxShadow: '0 8px 28px rgba(27,58,82,0.38)', pointerEvents: 'none',
    }}>
      <div style={{ position: 'absolute', top: -4, left: '50%', width: 8, height: 8, background: NAVY, transform: 'translateX(-50%) rotate(45deg)', borderRadius: 2 }} />
      <p style={{ fontSize: '0.52rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 7 }}>Score breakdown</p>
      {[
        { label: 'Relevance', weight: '40%', value: breakdown.semantic, color: '#4A9CC4' },
        { label: 'Eligibility', weight: '40%', value: breakdown.eligibility, color: '#F5B642' },
        { label: 'Proximity', weight: '20%', value: breakdown.geo, color: '#22A85A' },
      ].map(({ label, weight, value, color }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)' }}>
            {label} <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.52rem' }}>({weight})</span>
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(value * 100)}%</span>
        </div>
      ))}
    </div>
  )
}

function EligSection({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (!items.length) return null
  return (
    <div>
      <p style={{
        fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        color, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${color}22`,
      }}>{title}</p>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 2 }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: 'flex', gap: 10, fontSize: '0.82rem', color: '#2E3E4A', lineHeight: 1.55 }}>
            <span style={{ color, flexShrink: 0, fontWeight: 700 }}>—</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StatusDot({ status }: { status: string | null }) {
  if (!status) return null
  const isRecruiting = status.toLowerCase() === 'recruiting'
  const color = isRecruiting ? '#0E7A4E' : '#8A9BA8'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0,
        boxShadow: isRecruiting ? `0 0 0 2px ${color}30` : 'none',
      }} />
      <span style={{ fontSize: '0.72rem', fontWeight: 600, color }}>{status.replace(/_/g, ' ')}</span>
    </span>
  )
}

export default function MatchCard({ trial, rank, compareSelected, onCompareToggle, isSaved, onSaveToggle }: Props) {
  const [open, setOpen] = useState(rank === 0)
  const [ringHovered, setRingHovered] = useState(false)
  const [countriesExpanded, setCountriesExpanded] = useState(false)
  const uid = useId().replace(/:/g, 'x')

  const ctUrl = `https://clinicaltrials.gov/study/${trial.nct_id}`
  const accent = accentColor(trial.final_score, trial.hard_excluded)
  const phaseLabel = trial.phases.map(p => p.replace('PHASE', 'Ph ').replace('_', '/')).join(' / ') || null

  return (
    <div
      style={{
        display: 'flex', borderRadius: 12, border: '1px solid #E2D9C8',
        background: '#FFFFFF', overflow: 'visible',
        boxShadow: '0 1px 6px rgba(27,58,82,0.06)', transition: 'box-shadow 0.2s',
        opacity: trial.hard_excluded ? 0.82 : 1,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 18px rgba(27,58,82,0.11)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 6px rgba(27,58,82,0.06)' }}
    >
      {/* Left accent bar */}
      <div style={{ width: 4, flexShrink: 0, background: accent, borderRadius: '12px 0 0 12px' }} />

      <div style={{ flex: 1, minWidth: 0, padding: '16px 18px' }}>

        {/* Header: score ring + title + actions */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 10 }}>

          {/* Score ring */}
          <div
            style={{ position: 'relative', flexShrink: 0 }}
            onMouseEnter={() => setRingHovered(true)}
            onMouseLeave={() => setRingHovered(false)}
          >
            <ScoreRing score={trial.final_score} excluded={trial.hard_excluded} uid={uid} />
            {ringHovered && <ScoreTooltip breakdown={trial.score_breakdown} />}
          </div>

          {/* Title + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: NAVY, lineHeight: 1.4, marginBottom: 6 }}>
              <a
                href={ctUrl} target="_blank" rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'none' }}
                onMouseEnter={e => { (e.target as HTMLAnchorElement).style.textDecoration = 'underline' }}
                onMouseLeave={e => { (e.target as HTMLAnchorElement).style.textDecoration = 'none' }}
              >
                {trial.brief_title}
              </a>
            </h3>

            {/* Conditions — below title, small */}
            {trial.conditions && trial.conditions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                {trial.conditions.slice(0, 2).map(c => (
                  <span key={c} style={{
                    fontSize: '0.58rem', fontWeight: 700,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: '#5A7A90', background: 'rgba(27,58,82,0.05)',
                    border: '1px solid rgba(27,58,82,0.12)',
                    borderRadius: 4, padding: '2px 6px',
                  }}>
                    {c.length > 32 ? c.slice(0, 30) + '…' : c}
                  </span>
                ))}
              </div>
            )}

            {/* Metadata row line 1: phase · status · sites · distance */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {phaseLabel && (
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, color: NAVY,
                  background: 'rgba(27,58,82,0.07)', border: '1px solid rgba(27,58,82,0.15)',
                  borderRadius: 4, padding: '1px 7px', marginRight: 10,
                }}>
                  {phaseLabel}
                </span>
              )}

              <StatusDot status={trial.overall_status} />

              {trial.locations_count > 0 && (
                <>
                  <span style={{ color: '#D0D8DF', margin: '0 8px', fontSize: '0.65rem' }}>·</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#8A9BA8" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span style={{ fontSize: '0.72rem', color: '#5A6E7D' }}>{trial.locations_count} sites</span>
                  </span>
                </>
              )}

              {trial.distance_miles != null && (
                <>
                  <span style={{ color: '#D0D8DF', margin: '0 8px', fontSize: '0.65rem' }}>·</span>
                  <span style={{ fontSize: '0.72rem', color: '#5A6E7D', fontWeight: 500 }}>
                    {trial.distance_miles < 1 ? '< 1' : Math.round(trial.distance_miles)} mi away
                  </span>
                </>
              )}

              {(trial.minimum_age || trial.maximum_age) && (() => {
                const min = trial.minimum_age?.replace(' Years', 'y').replace(' Year', 'y') ?? null
                const max = trial.maximum_age?.replace(' Years', 'y').replace(' Year', 'y').replace('N/A', null as unknown as string) ?? null
                const ageStr = min && max ? `${min} – ${max}` : min ? `${min}+` : max ? `up to ${max}` : null
                return ageStr ? (
                  <>
                    <span style={{ color: '#D0D8DF', margin: '0 8px', fontSize: '0.65rem' }}>·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#8A9BA8" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      <span style={{ fontSize: '0.72rem', color: '#5A6E7D' }}>{ageStr}</span>
                    </span>
                  </>
                ) : null
              })()}
            </div>

            {/* Timeline row */}
            {(trial.start_date || trial.primary_completion_date) && (() => {
              const fmt = (d: string) => {
                const parts = d.split('-')
                if (parts.length === 1) return d
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                const m = parseInt(parts[1], 10)
                return `${months[m - 1] ?? ''} ${parts[0]}`
              }
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#8A9BA8" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  <span style={{ fontSize: '0.72rem', color: '#5A6E7D' }}>
                    {trial.start_date ? fmt(trial.start_date) : '?'}
                    {' → '}
                    {trial.primary_completion_date ? fmt(trial.primary_completion_date) : 'ongoing'}
                  </span>
                </div>
              )
            })()}

            {/* Countries — second line, distinct style */}
            {trial.countries_at_sites.length > 0 && (
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#A0ADB5" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-2.485 0-4.5 4.03-4.5 9s2.015 9 4.5 9 4.5-4.03 4.5-9-2.015-9-4.5-9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8" />
                </svg>
                <button
                  onClick={e => { e.stopPropagation(); if (trial.countries_at_sites.length > 2) setCountriesExpanded(x => !x) }}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    cursor: trial.countries_at_sites.length > 2 ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: '0.68rem', color: '#8A9BA8', fontFamily: 'inherit',
                    fontStyle: 'italic',
                  }}
                >
                  {countriesExpanded
                    ? trial.countries_at_sites.join(', ')
                    : <>{trial.countries_at_sites.slice(0, 3).join(', ')}{trial.countries_at_sites.length > 3 && <span style={{ color: NAVY, fontWeight: 700, fontStyle: 'normal' }}> +{trial.countries_at_sites.length - 3}</span>}</>
                  }
                  {trial.countries_at_sites.length > 3 && (
                    <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                      style={{ flexShrink: 0, transition: 'transform 0.15s', transform: countriesExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {onSaveToggle && (
              <button
                onClick={e => { e.stopPropagation(); onSaveToggle() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                  borderRadius: 6, fontSize: '0.7rem', fontWeight: 600,
                  color: isSaved ? '#E8701A' : '#8A9BA8', transition: 'color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,112,26,0.08)'; e.currentTarget.style.color = '#E8701A' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = isSaved ? '#E8701A' : '#8A9BA8' }}
              >
                {isSaved
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                  : <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                }
                {isSaved ? 'Saved' : 'Save'}
              </button>
            )}

            {onCompareToggle && (
              <button
                onClick={e => { e.stopPropagation(); onCompareToggle() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: compareSelected ? NAVY : 'none',
                  border: `1px solid ${compareSelected ? NAVY : '#D0D8DF'}`,
                  cursor: 'pointer', padding: '4px 10px', borderRadius: 6,
                  fontSize: '0.7rem', fontWeight: 600,
                  color: compareSelected ? '#FFFFFF' : '#8A9BA8', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!compareSelected) { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.color = NAVY } }}
                onMouseLeave={e => { if (!compareSelected) { e.currentTarget.style.borderColor = '#D0D8DF'; e.currentTarget.style.color = '#8A9BA8' } }}
              >
                {compareSelected
                  ? <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  : <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                }
                Compare
              </button>
            )}

            <button
              onClick={() => setOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
                borderRadius: 6, fontSize: '0.7rem', fontWeight: 600, color: '#8A9BA8', transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = NAVY }}
              onMouseLeave={e => { e.currentTarget.style.color = '#8A9BA8' }}
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              {open ? 'Less' : 'Details'}
            </button>
          </div>
        </div>

        {/* Summary */}
        <div style={{ marginLeft: 70, marginBottom: open ? 16 : 4 }}>
          <p style={{
            fontSize: '0.82rem', color: '#3A4E5C', lineHeight: 1.7,
            display: open ? 'block' : '-webkit-box',
            WebkitLineClamp: open ? undefined : 2,
            WebkitBoxOrient: open ? undefined : 'vertical',
            overflow: open ? 'visible' : 'hidden',
          } as React.CSSProperties}>
            {trial.summary}
          </p>
        </div>

        {/* Expanded body */}
        {open && (
          <div style={{ marginLeft: 70 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 16 }}>
              <EligSection title="Eligibility strengths" items={trial.why_eligible} color="#0E7A4E" />
              <EligSection title="Concerns to verify" items={trial.why_uncertain} color="#C07000" />
              <EligSection title="Disqualifying criteria" items={trial.why_excluded} color="#C03A2B" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.6rem', color: '#A0ADB5', fontFamily: "'JetBrains Mono', monospace" }}>{trial.nct_id}</span>
              <a
                href={ctUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 700, color: NAVY, textDecoration: 'none', opacity: 0.65 }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.65' }}
              >
                View on ClinicalTrials.gov
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        )}

        {/* Collapsed footer */}
        {!open && (
          <div style={{ marginLeft: 70, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <span style={{ fontSize: '0.6rem', color: '#B0BCC5', fontFamily: "'JetBrains Mono', monospace', flex: 1" }}>{trial.nct_id}</span>
          </div>
        )}
      </div>
    </div>
  )
}
