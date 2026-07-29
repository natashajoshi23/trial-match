import { useState, useId } from 'react'
import ScoreBar from './ScoreBar'
import type { TrialMatchResult } from '../types'

interface Props {
  trial: TrialMatchResult
  rank: number
}

const RING_R = 26
const RING_CIRC = 2 * Math.PI * RING_R

function cardAccent(score: number, excluded: boolean) {
  if (excluded) return 'linear-gradient(90deg,#EF4444,#F87171)'
  if (score >= 0.70) return 'linear-gradient(90deg,#7C5CFC,#F59E0B)'
  if (score >= 0.50) return 'linear-gradient(90deg,#F59E0B,#FB923C)'
  return 'linear-gradient(90deg,#252845,#1E2240)'
}

function headlineColor(score: number, excluded: boolean) {
  if (excluded) return '#F87171'
  if (score >= 0.70) return '#A78BFA'
  if (score >= 0.50) return '#FCD34D'
  return '#7A7AA0'
}

function ScoreRing({ score, excluded, gradId }: { score: number; excluded: boolean; gradId: string }) {
  const dash = RING_CIRC * (excluded ? 0.08 : score)
  const pct = Math.round(score * 100)
  const colorA = excluded ? '#EF4444' : '#7C5CFC'
  const colorB = excluded ? '#F87171' : '#F59E0B'

  return (
    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <defs>
          <linearGradient id={gradId} gradientTransform="rotate(60, 36, 36)">
            <stop offset="0%" stopColor={colorA} />
            <stop offset="100%" stopColor={colorB} />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx="36" cy="36" r={RING_R} fill="none" stroke="#1E2240" strokeWidth="7" />
        {/* Progress */}
        <circle
          cx="36" cy="36" r={RING_R}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${RING_CIRC}`}
          transform="rotate(-90, 36, 36)"
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#EDE8FF', lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>
          {pct}
        </span>
        <span style={{ fontSize: '0.55rem', color: '#4A4A70', fontWeight: 600 }}>%</span>
      </div>
    </div>
  )
}

function EligSection({ icon, title, items, colorA, colorB }: {
  icon: React.ReactNode
  title: string
  items: string[]
  colorA: string  // border color
  colorB: string  // text/icon color
}) {
  if (!items.length) return null
  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${colorA}22`,
      background: `${colorA}0C`,
      padding: '12px 14px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: '0.65rem', fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: colorB, marginBottom: 10,
      }}>
        {icon}
        {title}
      </div>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: 'flex', gap: 8, fontSize: '0.82rem', color: '#C4B8FF', lineHeight: 1.5 }}>
            <span style={{ color: colorB, flexShrink: 0 }}>·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function MatchCard({ trial, rank }: Props) {
  const [open, setOpen] = useState(rank === 0)
  const uid = useId().replace(/:/g, 'x')

  const ctUrl = `https://clinicaltrials.gov/study/${trial.nct_id}`
  const phaseLabel = trial.phases
    .map(p => p.replace('PHASE', 'Ph ').replace('_', '/'))
    .join(' / ') || null

  return (
    <div style={{
      borderRadius: 16,
      border: '1px solid #1E2240',
      background: '#0C0F1D',
      overflow: 'hidden',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      opacity: trial.hard_excluded ? 0.8 : 1,
    }}
    onMouseEnter={e => {
      const el = e.currentTarget as HTMLDivElement
      el.style.borderColor = 'rgba(124,92,252,0.35)'
      el.style.boxShadow = '0 0 24px rgba(124,92,252,0.1)'
    }}
    onMouseLeave={e => {
      const el = e.currentTarget as HTMLDivElement
      el.style.borderColor = '#1E2240'
      el.style.boxShadow = 'none'
    }}
    >
      {/* Top accent bar */}
      <div style={{ height: 3, background: cardAccent(trial.final_score, trial.hard_excluded) }} />

      <div style={{ padding: 18 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <ScoreRing score={trial.final_score} excluded={trial.hard_excluded} gradId={`ring-${uid}`} />

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
              <span style={{
                fontSize: '0.65rem',
                fontFamily: "'JetBrains Mono', monospace",
                borderRadius: 6,
                border: '1px solid #252845',
                background: '#111525',
                color: '#7A7AA0',
                padding: '2px 7px',
              }}>
                {trial.nct_id}
              </span>
              {phaseLabel && (
                <span style={{
                  fontSize: '0.65rem', fontWeight: 600, borderRadius: 6,
                  border: '1px solid rgba(124,92,252,0.3)',
                  background: 'rgba(124,92,252,0.1)',
                  color: '#A78BFA', padding: '2px 7px',
                }}>
                  {phaseLabel}
                </span>
              )}
              {trial.overall_status && (
                <span style={{
                  fontSize: '0.65rem', fontWeight: 600, borderRadius: 6,
                  border: '1px solid rgba(52,211,153,0.3)',
                  background: 'rgba(52,211,153,0.08)',
                  color: '#34D399', padding: '2px 7px',
                }}>
                  {trial.overall_status}
                </span>
              )}
              {trial.distance_miles != null && (
                <span style={{
                  fontSize: '0.65rem', borderRadius: 6,
                  border: '1px solid #252845',
                  background: '#111525',
                  color: '#7A7AA0', padding: '2px 7px',
                }}>
                  {trial.distance_miles < 1 ? '< 1' : Math.round(trial.distance_miles)} mi
                </span>
              )}
            </div>

            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#EDE8FF', lineHeight: 1.4, marginBottom: 4 }}>
              <a
                href={ctUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => { (e.target as HTMLAnchorElement).style.color = '#A78BFA' }}
                onMouseLeave={e => { (e.target as HTMLAnchorElement).style.color = '#EDE8FF' }}
              >
                {trial.brief_title}
              </a>
            </h3>

            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: headlineColor(trial.final_score, trial.hard_excluded) }}>
              {trial.headline}
            </p>
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              flexShrink: 0,
              width: 28, height: 28,
              borderRadius: '50%',
              border: '1px solid #252845',
              background: '#111525',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: '#7A7AA0',
              transition: 'all 0.15s',
            }}
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            <svg
              width="12" height="12"
              fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2.5}
              style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Expanded body */}
        {open && (
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: '0.82rem', color: '#9090B8', lineHeight: 1.7 }}>{trial.summary}</p>

            {/* Eligibility sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <EligSection
                icon={<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                title="Why eligible"
                items={trial.why_eligible}
                colorA="#22C55E" colorB="#4ADE80"
              />
              <EligSection
                icon={<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>}
                title="Uncertain / unverified"
                items={trial.why_uncertain}
                colorA="#F59E0B" colorB="#FCD34D"
              />
              <EligSection
                icon={<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                title="Not eligible"
                items={trial.why_excluded}
                colorA="#EF4444" colorB="#F87171"
              />
            </div>

            {/* LLM narrative */}
            {trial.llm_narrative && (
              <div style={{
                display: 'flex', gap: 12,
                borderRadius: 10,
                border: '1px solid rgba(124,92,252,0.2)',
                background: 'rgba(124,92,252,0.07)',
                padding: '12px 14px',
              }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#A78BFA" strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 2 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <p style={{ fontSize: '0.82rem', color: '#C4B8FF', fontStyle: 'italic', lineHeight: 1.6 }}>
                  {trial.llm_narrative}
                </p>
              </div>
            )}

            {/* Score breakdown */}
            <div style={{
              borderRadius: 12,
              border: '1px solid #1E2240',
              background: '#111525',
              padding: '14px 16px',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <p style={{
                fontSize: '0.6rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: '#4A4A70', marginBottom: -2,
              }}>
                Score breakdown
              </p>
              <ScoreBar
                label="Semantic relevance (40%)"
                value={trial.score_breakdown.semantic}
                gradient="linear-gradient(90deg,#7C5CFC,#A78BFA)"
              />
              <ScoreBar
                label="Eligibility match (40%)"
                value={trial.score_breakdown.eligibility}
                gradient="linear-gradient(90deg,#22C55E,#4ADE80)"
              />
              <ScoreBar
                label="Geographic proximity (20%)"
                value={trial.score_breakdown.geo}
                gradient="linear-gradient(90deg,#F59E0B,#FCD34D)"
              />
            </div>

            {/* External link */}
            <a
              href={ctUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: '0.75rem', fontWeight: 700,
                color: '#7C5CFC',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { (e.target as HTMLAnchorElement).style.color = '#A78BFA' }}
              onMouseLeave={e => { (e.target as HTMLAnchorElement).style.color = '#7C5CFC' }}
            >
              View on ClinicalTrials.gov
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
