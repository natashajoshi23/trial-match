import { useState, useId } from 'react'
import ScoreBar from './ScoreBar'
import type { TrialMatchResult } from '../types'

interface Props {
  trial: TrialMatchResult
  rank: number
}

const RING_R = 26
const RING_CIRC = 2 * Math.PI * RING_R
const NAVY = '#1B3A52'

function cardAccent(score: number, excluded: boolean) {
  if (excluded) return 'linear-gradient(90deg,#C03A2B,#E8701A)'
  if (score >= 0.70) return `linear-gradient(90deg,${NAVY},#F5B642)`
  if (score >= 0.50) return 'linear-gradient(90deg,#E8701A,#F5B642)'
  return 'linear-gradient(90deg,#E2D9C8,#DDD5C0)'
}

function headlineColor(score: number, excluded: boolean) {
  if (excluded) return '#C03A2B'
  if (score >= 0.70) return NAVY
  if (score >= 0.50) return '#E8701A'
  return '#8A9BA8'
}

function ScoreRing({ score, excluded, gradId }: { score: number; excluded: boolean; gradId: string }) {
  const dash = RING_CIRC * (excluded ? 0.08 : score)
  const pct = Math.round(score * 100)
  const colorA = excluded ? '#C03A2B' : NAVY
  const colorB = excluded ? '#E8701A' : '#F5B642'

  return (
    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <defs>
          <linearGradient id={gradId} gradientTransform="rotate(60, 36, 36)">
            <stop offset="0%" stopColor={colorA} />
            <stop offset="100%" stopColor={colorB} />
          </linearGradient>
        </defs>
        <circle cx="36" cy="36" r={RING_R} fill="none" stroke="#E2D9C8" strokeWidth="7" />
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
        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: NAVY, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>
          {pct}
        </span>
        <span style={{ fontSize: '0.55rem', color: '#8A9BA8', fontWeight: 600 }}>%</span>
      </div>
    </div>
  )
}

function EligSection({ icon, title, items, borderColor, bgColor, textColor }: {
  icon: React.ReactNode
  title: string
  items: string[]
  borderColor: string
  bgColor: string
  textColor: string
}) {
  if (!items.length) return null
  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${borderColor}`,
      background: bgColor,
      padding: '12px 14px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: '0.65rem', fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: textColor,
        marginBottom: 10,
      }}>
        {icon}
        {title}
      </div>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: 'flex', gap: 8, fontSize: '0.82rem', color: '#4A6070', lineHeight: 1.5 }}>
            <span style={{ color: textColor, flexShrink: 0 }}>·</span>
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
      border: '1.5px solid #E2D9C8',
      background: '#FFFFFF',
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(27,58,82,0.06)',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      opacity: trial.hard_excluded ? 0.85 : 1,
    }}
    onMouseEnter={e => {
      const el = e.currentTarget as HTMLDivElement
      el.style.borderColor = 'rgba(27,58,82,0.35)'
      el.style.boxShadow = '0 4px 24px rgba(27,58,82,0.12)'
    }}
    onMouseLeave={e => {
      const el = e.currentTarget as HTMLDivElement
      el.style.borderColor = '#E2D9C8'
      el.style.boxShadow = '0 2px 12px rgba(27,58,82,0.06)'
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
                border: '1px solid #E2D9C8',
                background: '#F7F3EC',
                color: '#8A9BA8',
                padding: '2px 7px',
              }}>
                {trial.nct_id}
              </span>
              {phaseLabel && (
                <span style={{
                  fontSize: '0.65rem', fontWeight: 600, borderRadius: 6,
                  border: '1px solid rgba(27,58,82,0.25)',
                  background: 'rgba(27,58,82,0.07)',
                  color: NAVY, padding: '2px 7px',
                }}>
                  {phaseLabel}
                </span>
              )}
              {trial.overall_status && (
                <span style={{
                  fontSize: '0.65rem', fontWeight: 600, borderRadius: 6,
                  border: '1px solid rgba(34,168,90,0.25)',
                  background: 'rgba(34,168,90,0.08)',
                  color: '#16A34A', padding: '2px 7px',
                }}>
                  {trial.overall_status}
                </span>
              )}
              {trial.distance_miles != null && (
                <span style={{
                  fontSize: '0.65rem', borderRadius: 6,
                  border: '1px solid #E2D9C8',
                  background: '#F7F3EC',
                  color: '#8A9BA8', padding: '2px 7px',
                }}>
                  {trial.distance_miles < 1 ? '< 1' : Math.round(trial.distance_miles)} mi
                </span>
              )}
            </div>

            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: NAVY, lineHeight: 1.4, marginBottom: 4 }}>
              <a
                href={ctUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => { (e.target as HTMLAnchorElement).style.color = '#2D5F7C' }}
                onMouseLeave={e => { (e.target as HTMLAnchorElement).style.color = NAVY }}
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
              border: '1.5px solid #E2D9C8',
              background: '#F7F3EC',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: '#8A9BA8',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget.style.borderColor = 'rgba(27,58,82,0.3)')
              ;(e.currentTarget.style.color = NAVY)
            }}
            onMouseLeave={e => {
              (e.currentTarget.style.borderColor = '#E2D9C8')
              ;(e.currentTarget.style.color = '#8A9BA8')
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
            <p style={{ fontSize: '0.82rem', color: '#4A6070', lineHeight: 1.7 }}>{trial.summary}</p>

            {/* Eligibility sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <EligSection
                icon={<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                title="Why eligible"
                items={trial.why_eligible}
                borderColor="rgba(22,163,74,0.3)"
                bgColor="rgba(22,163,74,0.05)"
                textColor="#16A34A"
              />
              <EligSection
                icon={<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>}
                title="Uncertain / unverified"
                items={trial.why_uncertain}
                borderColor="rgba(232,112,26,0.3)"
                bgColor="rgba(232,112,26,0.05)"
                textColor="#E8701A"
              />
              <EligSection
                icon={<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                title="Not eligible"
                items={trial.why_excluded}
                borderColor="rgba(192,58,43,0.3)"
                bgColor="rgba(192,58,43,0.05)"
                textColor="#C03A2B"
              />
            </div>

            {/* LLM narrative */}
            {trial.llm_narrative && (
              <div style={{
                display: 'flex', gap: 12,
                borderRadius: 10,
                border: '1px solid rgba(27,58,82,0.18)',
                background: 'rgba(27,58,82,0.05)',
                padding: '12px 14px',
              }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={NAVY} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 2 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <p style={{ fontSize: '0.82rem', color: '#4A6070', fontStyle: 'italic', lineHeight: 1.6 }}>
                  {trial.llm_narrative}
                </p>
              </div>
            )}

            {/* Score breakdown */}
            <div style={{
              borderRadius: 12,
              border: '1.5px solid #E2D9C8',
              background: '#F7F3EC',
              padding: '14px 16px',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <p style={{
                fontSize: '0.6rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: '#8A9BA8', marginBottom: -2,
              }}>
                Score breakdown
              </p>
              <ScoreBar
                label="Semantic relevance (40%)"
                value={trial.score_breakdown.semantic}
                gradient={`linear-gradient(90deg,${NAVY},#2D5F7C)`}
              />
              <ScoreBar
                label="Eligibility match (40%)"
                value={trial.score_breakdown.eligibility}
                gradient="linear-gradient(90deg,#E8701A,#F5B642)"
              />
              <ScoreBar
                label="Geographic proximity (20%)"
                value={trial.score_breakdown.geo}
                gradient="linear-gradient(90deg,#22A85A,#4ADE80)"
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
                color: NAVY,
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { (e.target as HTMLAnchorElement).style.color = '#2D5F7C' }}
              onMouseLeave={e => { (e.target as HTMLAnchorElement).style.color = NAVY }}
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
