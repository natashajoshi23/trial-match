import { useState } from 'react'
import ScoreBar from './ScoreBar'
import type { TrialMatchResult } from '../types'

interface Props {
  trial: TrialMatchResult
  rank: number
}

const RING_R = 26
const RING_CIRC = 2 * Math.PI * RING_R

function ringColor(score: number, excluded: boolean) {
  if (excluded) return '#ef4444'
  if (score >= 0.70) return '#10b981'
  if (score >= 0.50) return '#f59e0b'
  if (score >= 0.30) return '#f97316'
  return '#94a3b8'
}

function cardAccent(score: number, excluded: boolean) {
  if (excluded) return 'linear-gradient(90deg,#ef4444,#f87171)'
  if (score >= 0.70) return 'linear-gradient(90deg,#10b981,#34d399)'
  if (score >= 0.50) return 'linear-gradient(90deg,#f59e0b,#fbbf24)'
  return 'linear-gradient(90deg,#94a3b8,#cbd5e1)'
}

function badgeCls(score: number, excluded: boolean) {
  if (excluded) return 'bg-red-50 text-red-700 border-red-200'
  if (score >= 0.70) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (score >= 0.50) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-slate-50 text-slate-500 border-slate-200'
}

function headlineCls(score: number, excluded: boolean) {
  if (excluded) return 'text-red-600'
  if (score >= 0.70) return 'text-emerald-700'
  if (score >= 0.50) return 'text-amber-700'
  return 'text-slate-500'
}

function ScoreRing({ score, excluded }: { score: number; excluded: boolean }) {
  const color = ringColor(score, excluded)
  const dash = RING_CIRC * (excluded ? 0.08 : score)
  const pct = Math.round(score * 100)
  return (
    <div className="relative shrink-0" style={{ width: 68, height: 68 }}>
      <svg width="68" height="68" viewBox="0 0 72 72" className="-rotate-90">
        <circle cx="36" cy="36" r={RING_R} fill="none" stroke="#f1f5f9" strokeWidth="7" />
        <circle
          cx="36" cy="36" r={RING_R}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${RING_CIRC}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold text-slate-800 leading-none">{pct}</span>
        <span className="text-[9px] text-slate-400 font-medium">%</span>
      </div>
    </div>
  )
}

function EligSection({ icon, title, items, bg, border, text }: {
  icon: React.ReactNode; title: string; items: string[]
  bg: string; border: string; text: string
}) {
  if (!items.length) return null
  return (
    <div className={`rounded-xl border p-3.5 ${bg} ${border}`}>
      <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide mb-2.5 ${text}`}>
        {icon}
        {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-700">
            <span className="shrink-0 mt-0.5 text-slate-400">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function MatchCard({ trial, rank }: Props) {
  const [open, setOpen] = useState(rank === 0)

  const ctUrl = `https://clinicaltrials.gov/study/${trial.nct_id}`
  const phaseLabel = trial.phases
    .map(p => p.replace('PHASE', 'Ph ').replace('_', '/'))
    .join(' / ') || null

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md ${trial.hard_excluded ? 'opacity-75' : ''}`}>
      {/* Accent bar */}
      <div className="h-1" style={{ background: cardAccent(trial.final_score, trial.hard_excluded) }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-4">
          <ScoreRing score={trial.final_score} excluded={trial.hard_excluded} />

          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="text-[11px] font-mono rounded-md border bg-slate-50 border-slate-200 text-slate-500 px-2 py-0.5">
                {trial.nct_id}
              </span>
              {phaseLabel && (
                <span className="text-[11px] rounded-md border border-blue-200 bg-blue-50 text-blue-700 px-2 py-0.5 font-medium">
                  {phaseLabel}
                </span>
              )}
              {trial.overall_status && (
                <span className="text-[11px] rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-0.5 font-medium">
                  {trial.overall_status}
                </span>
              )}
              {trial.distance_miles != null && (
                <span className="text-[11px] rounded-md border border-slate-200 bg-slate-50 text-slate-500 px-2 py-0.5">
                  {trial.distance_miles < 1 ? '< 1' : Math.round(trial.distance_miles)} mi away
                </span>
              )}
            </div>

            <h3 className="font-semibold text-slate-900 text-sm leading-snug">
              <a href={ctUrl} target="_blank" rel="noopener noreferrer" className="hover:text-teal-700 transition-colors">
                {trial.brief_title}
              </a>
            </h3>

            <p className={`text-xs mt-1.5 font-semibold ${headlineCls(trial.final_score, trial.hard_excluded)}`}>
              {trial.headline}
            </p>
          </div>

          <button
            onClick={() => setOpen(o => !o)}
            className="shrink-0 w-7 h-7 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Expandable body */}
        {open && (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">{trial.summary}</p>

            {/* Eligibility sections */}
            <div className="space-y-2.5">
              <EligSection
                icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                title="Why eligible"
                items={trial.why_eligible}
                bg="bg-emerald-50" border="border-emerald-200" text="text-emerald-700"
              />
              <EligSection
                icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>}
                title="Uncertain / unverified"
                items={trial.why_uncertain}
                bg="bg-amber-50" border="border-amber-200" text="text-amber-700"
              />
              <EligSection
                icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                title="Not eligible"
                items={trial.why_excluded}
                bg="bg-red-50" border="border-red-200" text="text-red-700"
              />
            </div>

            {/* LLM narrative */}
            {trial.llm_narrative && (
              <div className="flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3.5">
                <svg className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <p className="text-sm text-blue-800 italic leading-relaxed">{trial.llm_narrative}</p>
              </div>
            )}

            {/* Score breakdown */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score breakdown</p>
              <ScoreBar label="Semantic relevance (40%)" value={trial.score_breakdown.semantic} gradient="linear-gradient(90deg,#3b82f6,#60a5fa)" />
              <ScoreBar label="Eligibility match (40%)" value={trial.score_breakdown.eligibility} gradient="linear-gradient(90deg,#10b981,#34d399)" />
              <ScoreBar label="Geographic proximity (20%)" value={trial.score_breakdown.geo} gradient="linear-gradient(90deg,#8b5cf6,#a78bfa)" />
            </div>

            {/* External link */}
            <a
              href={ctUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-800 transition-colors"
            >
              View on ClinicalTrials.gov
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
