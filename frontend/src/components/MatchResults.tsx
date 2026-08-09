import { useState, useEffect } from 'react'
import MatchCard from './MatchCard'
import ComparePanel from './ComparePanel'
import type { MatchResponse, TrialMatchResult } from '../types'

interface Props {
  data: MatchResponse | null
  loading: boolean
  error: string | null
  isSaved: (id: string) => boolean
  onSave: (trial: TrialMatchResult) => void
  onUnsave: (id: string) => void
}

const PIPELINE_STAGES = [
  { label: 'Fetch Trials', sub: 'ClinicalTrials.gov API', color: '#1B3A52', bg: 'rgba(27,58,82,0.1)', border: 'rgba(27,58,82,0.3)' },
  { label: 'Semantic Search', sub: 'Dense vector embeddings', color: '#E8701A', bg: 'rgba(232,112,26,0.1)', border: 'rgba(232,112,26,0.3)' },
  { label: 'Score Eligibility', sub: 'spaCy NLP', color: '#C48F00', bg: 'rgba(196,143,0,0.12)', border: 'rgba(196,143,0,0.35)' },
  { label: 'Explain Matches', sub: 'Narrative generation', color: '#7C5CFC', bg: 'rgba(124,92,252,0.1)', border: 'rgba(124,92,252,0.3)' },
]
const STAGE_DELAYS = [0, 3000, 7000, 11000]

function StageIcon({ index }: { index: number }) {
  const paths = [
    'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582',
    'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z',
    'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z',
    'M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z',
  ]
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[index]} />
    </svg>
  )
}

function PipelineLoader() {
  const [stageIndex, setStageIndex] = useState(0)

  useEffect(() => {
    const timers = STAGE_DELAYS.slice(1).map((delay, i) =>
      setTimeout(() => setStageIndex(i + 1), delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div style={{ padding: '36px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0, flexWrap: 'wrap' }}>
        {PIPELINE_STAGES.map((stage, i) => {
          const isDone = i < stageIndex
          const isActive = i === stageIndex
          const isPending = i > stageIndex

          return (
            <div key={stage.label} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 88 }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 15,
                    background: isActive || isDone ? stage.bg : 'rgba(0,0,0,0.025)',
                    border: `1.5px solid ${isActive || isDone ? stage.border : '#E2D9C8'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isActive || isDone ? stage.color : '#D0D8E0',
                    transition: 'all 0.45s ease',
                  }}>
                    {isDone ? (
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#22A85A" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <StageIcon index={i} />
                    )}
                  </div>
                  {isActive && (
                    <div style={{
                      position: 'absolute', inset: -5, borderRadius: 19,
                      border: `2px solid ${stage.color}`,
                      animation: 'pulse-ring 1.4s ease-out infinite',
                      pointerEvents: 'none',
                    }} />
                  )}
                </div>

                <div style={{ textAlign: 'center' }}>
                  <p style={{
                    fontSize: '0.67rem', fontWeight: 700,
                    color: isPending ? '#C8D0D8' : isDone ? '#22A85A' : '#1B3A52',
                    transition: 'color 0.3s',
                    whiteSpace: 'nowrap',
                    marginBottom: 2,
                  }}>
                    {stage.label}
                  </p>
                  <p style={{ fontSize: '0.58rem', color: isPending ? '#DDD5C0' : '#8A9BA8', whiteSpace: 'nowrap' }}>
                    {isActive ? 'running…' : isDone ? 'done' : stage.sub}
                  </p>
                </div>
              </div>

              {i < PIPELINE_STAGES.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', margin: '0 2px', paddingBottom: 34 }}>
                  <div style={{
                    width: 24, height: 2, borderRadius: 1,
                    background: isDone ? '#22A85A' : '#E2D9C8',
                    transition: 'background 0.4s',
                  }} />
                  <svg width="5" height="8" viewBox="0 0 6 8" fill="none" style={{ marginLeft: -0.5 }}>
                    <path d="M0 0L6 4L0 8" stroke={isDone ? '#22A85A' : '#E2D9C8'} strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1B3A52', marginBottom: 6 }}>
          {PIPELINE_STAGES[stageIndex].label}…
        </p>
        <p style={{ fontSize: '0.78rem', color: '#8A9BA8', maxWidth: 340 }}>
          Typically 15–30 seconds. Results are ranked by semantic relevance,
          NLP eligibility, and geographic proximity.
        </p>
      </div>
    </div>
  )
}

function StatPill({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '10px 18px',
      borderRadius: 12,
      border: `1.5px solid ${color}40`,
      background: `${color}0D`,
      minWidth: 80,
      boxShadow: '0 1px 4px rgba(27,58,82,0.06)',
    }}>
      <span style={{
        fontSize: '1.2rem', fontWeight: 800,
        color: color,
        lineHeight: 1,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {value}
      </span>
      <span style={{ fontSize: '0.65rem', color: '#8A9BA8', marginTop: 4, fontWeight: 500 }}>
        {label}
      </span>
    </div>
  )
}

type SortBy = 'score' | 'distance'
type PhaseFilter = 'all' | '1' | '2' | '3'
type MinScore = 0 | 0.5 | 0.7
type CountryFilter = 'all' | string

function PillButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '4px 11px',
        borderRadius: 999,
        border: active ? '1.5px solid #1B3A52' : '1.5px solid #DDD5C0',
        background: active ? 'rgba(27,58,82,0.09)' : '#FFFFFF',
        color: active ? '#1B3A52' : '#8A9BA8',
        fontSize: '0.72rem',
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        transition: 'all 0.12s',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        whiteSpace: 'nowrap' as const,
      }}
    >
      {children}
    </button>
  )
}

function FilterBar({
  sortBy, setSortBy,
  phaseFilter, setPhaseFilter,
  minScore, setMinScore,
  countryFilter, setCountryFilter,
  availableCountries,
}: {
  sortBy: SortBy; setSortBy: (v: SortBy) => void
  phaseFilter: PhaseFilter; setPhaseFilter: (v: PhaseFilter) => void
  minScore: MinScore; setMinScore: (v: MinScore) => void
  countryFilter: CountryFilter; setCountryFilter: (v: CountryFilter) => void
  availableCountries: string[]
}) {
  const sep = <div style={{ width: 1, height: 16, background: '#E2D9C8', flexShrink: 0 }} />
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      flexWrap: 'wrap',
      background: '#FFFFFF',
      border: '1.5px solid #E2D9C8',
      borderRadius: 12,
      padding: '10px 14px',
      boxShadow: '0 1px 4px rgba(27,58,82,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: '#8A9BA8' }}>
          Sort
        </span>
        <PillButton active={sortBy === 'score'} onClick={() => setSortBy('score')}>Top score</PillButton>
        <PillButton active={sortBy === 'distance'} onClick={() => setSortBy('distance')}>Nearest</PillButton>
      </div>

      {sep}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: '#8A9BA8' }}>
          Phase
        </span>
        {(['all', '1', '2', '3'] as const).map(p => (
          <PillButton key={p} active={phaseFilter === p} onClick={() => setPhaseFilter(p)}>
            {p === 'all' ? 'All' : `Ph ${p}`}
          </PillButton>
        ))}
      </div>

      {sep}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: '#8A9BA8' }}>
          Score
        </span>
        {([0, 0.5, 0.7] as const).map(s => (
          <PillButton key={s} active={minScore === s} onClick={() => setMinScore(s)}>
            {s === 0 ? 'Any' : `${s * 100}%+`}
          </PillButton>
        ))}
      </div>

      {availableCountries.length > 0 && (
        <>
          {sep}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: '#8A9BA8' }}>
              Country
            </span>
            <select
              value={countryFilter}
              onChange={e => setCountryFilter(e.target.value)}
              style={{
                padding: '4px 28px 4px 10px',
                borderRadius: 999,
                border: countryFilter !== 'all' ? '1.5px solid #1B3A52' : '1.5px solid #DDD5C0',
                background: countryFilter !== 'all' ? 'rgba(27,58,82,0.09)' : '#FFFFFF',
                color: countryFilter !== 'all' ? '#1B3A52' : '#8A9BA8',
                fontSize: '0.72rem',
                fontWeight: countryFilter !== 'all' ? 700 : 500,
                cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238A9BA8' stroke-width='2.5'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                outline: 'none',
              }}
            >
              <option value="all">All countries</option>
              {availableCountries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  )
}

function applyFilters(
  trials: TrialMatchResult[],
  sortBy: SortBy,
  phaseFilter: PhaseFilter,
  minScore: MinScore,
) {
  return trials
    .filter(t => t.final_score >= minScore)
    .filter(t => {
      if (phaseFilter === 'all') return true
      return t.phases.some(p => p.includes(`PHASE${phaseFilter}`))
    })
    .sort((a, b) => {
      if (sortBy === 'distance') {
        if (a.distance_miles == null && b.distance_miles == null) return 0
        if (a.distance_miles == null) return 1
        if (b.distance_miles == null) return -1
        return a.distance_miles - b.distance_miles
      }
      return b.final_score - a.final_score
    })
}

export default function MatchResults({ data, loading, error, isSaved, onSave, onUnsave }: Props) {
  const [sortBy, setSortBy] = useState<SortBy>('score')
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all')
  const [minScore, setMinScore] = useState<MinScore>(0)
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('all')
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set())
  const [showCompare, setShowCompare] = useState(false)

  useEffect(() => {
    setCompareIds(new Set())
    setShowCompare(false)
    setSortBy('score')
    setPhaseFilter('all')
    setMinScore(0)
    setCountryFilter('all')
  }, [data])

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 3) {
        next.add(id)
      }
      return next
    })
  }

  if (loading) {
    return <PipelineLoader />
  }

  if (error) {
    return (
      <div style={{
        borderRadius: 16,
        border: '1.5px solid rgba(192,58,43,0.2)',
        background: 'rgba(192,58,43,0.04)',
        padding: '40px 24px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(192,58,43,0.08)',
          border: '1.5px solid rgba(192,58,43,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#C03A2B" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p style={{ fontWeight: 700, color: '#C03A2B', fontSize: '0.875rem' }}>Search failed</p>
        <p style={{ color: '#4A6070', fontSize: '0.82rem', marginTop: 6 }}>{error}</p>
      </div>
    )
  }

  if (!data) return null

  const { matches, total_trials_fetched, total_trials_scored } = data
  const eligible = matches.filter(m => !m.hard_excluded)
  const excluded = matches.filter(m => m.hard_excluded)

  const availableCountries = [...new Set(
    matches.flatMap(m => m.countries_at_sites ?? [])
  )].sort()

  const filteredEligible = applyFilters(eligible, sortBy, phaseFilter, minScore)
    .filter(m => countryFilter === 'all' || (m.countries_at_sites ?? []).includes(countryFilter))

  const filtersActive = sortBy !== 'score' || phaseFilter !== 'all' || minScore !== 0 || countryFilter !== 'all'
  const compareTrials = matches.filter(m => compareIds.has(m.nct_id))

  return (
    <>
      {showCompare && compareTrials.length >= 2 && (
        <ComparePanel trials={compareTrials} onClose={() => setShowCompare(false)} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: compareIds.size >= 2 ? 80 : 0 }}>
        <FilterBar
          sortBy={sortBy} setSortBy={setSortBy}
          phaseFilter={phaseFilter} setPhaseFilter={setPhaseFilter}
          minScore={minScore} setMinScore={setMinScore}
          countryFilter={countryFilter} setCountryFilter={setCountryFilter}
          availableCountries={availableCountries}
        />

        {/* Stats row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <StatPill value={total_trials_fetched} label="fetched" color="#8A9BA8" />
          <StatPill value={total_trials_scored} label="scored" color="#1B3A52" />
          <StatPill value={eligible.length} label="eligible" color="#22A85A" />
          {excluded.length > 0 && (
            <StatPill value={excluded.length} label="excluded" color="#C03A2B" />
          )}
          {filtersActive && filteredEligible.length !== eligible.length && (
            <StatPill value={filteredEligible.length} label="showing" color="#E8701A" />
          )}
        </div>

        {matches.length === 0 ? (
          <div style={{
            borderRadius: 16,
            border: '1.5px solid #E2D9C8',
            background: '#FFFFFF',
            padding: '60px 24px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(27,58,82,0.05)',
              border: '1.5px solid rgba(27,58,82,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#1B3A52" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <p style={{ fontWeight: 700, color: '#1B3A52', marginBottom: 6 }}>No matching trials found</p>
            <p style={{ fontSize: '0.82rem', color: '#8A9BA8' }}>
              Try broadening your search or adjusting the distance filter.
            </p>
          </div>
        ) : (
          <>
            {filteredEligible.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 2 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#22A85A',
                    boxShadow: '0 0 8px rgba(34,168,90,0.4)',
                  }} />
                  <p style={{
                    fontSize: '0.65rem', fontWeight: 700,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: '#22A85A',
                  }}>
                    Potentially eligible — {filteredEligible.length}
                  </p>
                </div>
                {filteredEligible.map((trial, i) => (
                  <MatchCard
                    key={trial.nct_id}
                    trial={trial}
                    rank={i}
                    compareSelected={compareIds.has(trial.nct_id)}
                    onCompareToggle={() => toggleCompare(trial.nct_id)}
                    isSaved={isSaved(trial.nct_id)}
                    onSaveToggle={() => isSaved(trial.nct_id) ? onUnsave(trial.nct_id) : onSave(trial)}
                  />
                ))}
              </div>
            ) : filtersActive ? (
              <div style={{
                borderRadius: 14, border: '1.5px solid #E2D9C8',
                background: '#FFFFFF', padding: '32px 24px', textAlign: 'center',
              }}>
                <p style={{ fontWeight: 600, color: '#8A9BA8', fontSize: '0.85rem' }}>
                  No eligible trials match the current filters.
                </p>
                <button
                  type="button"
                  onClick={() => { setPhaseFilter('all'); setMinScore(0); setSortBy('score'); setCountryFilter('all') }}
                  style={{
                    marginTop: 12,
                    padding: '6px 14px', borderRadius: 999,
                    border: '1.5px solid rgba(27,58,82,0.25)',
                    background: '#FFFFFF', color: '#1B3A52',
                    fontSize: '0.75rem', fontWeight: 600,
                    cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : null}

            {excluded.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, height: 1, background: '#E2D9C8' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#C03A2B',
                      boxShadow: '0 0 8px rgba(192,58,43,0.35)',
                    }} />
                    <p style={{
                      fontSize: '0.65rem', fontWeight: 700,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: '#C03A2B', whiteSpace: 'nowrap',
                    }}>
                      Hard exclusions — {excluded.length}
                    </p>
                  </div>
                  <div style={{ flex: 1, height: 1, background: '#E2D9C8' }} />
                </div>

                {excluded.map((trial, i) => (
                  <MatchCard
                    key={trial.nct_id}
                    trial={trial}
                    rank={filteredEligible.length + i}
                    compareSelected={compareIds.has(trial.nct_id)}
                    onCompareToggle={() => toggleCompare(trial.nct_id)}
                    isSaved={isSaved(trial.nct_id)}
                    onSaveToggle={() => isSaved(trial.nct_id) ? onUnsave(trial.nct_id) : onSave(trial)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating compare bar */}
      {compareIds.size >= 2 && (
        <div style={{
          position: 'fixed',
          bottom: 24, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#1B3A52',
          borderRadius: 999,
          padding: '10px 10px 10px 18px',
          boxShadow: '0 8px 32px rgba(27,58,82,0.35)',
        }}>
          <span style={{
            fontSize: '0.8rem', fontWeight: 600,
            color: 'rgba(255,255,255,0.85)',
            whiteSpace: 'nowrap',
          }}>
            {compareIds.size} trials selected
          </span>
          <button
            onClick={() => setShowCompare(true)}
            style={{
              padding: '7px 16px',
              borderRadius: 999,
              border: 'none',
              background: '#E8701A',
              color: '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#D4621A' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#E8701A' }}
          >
            Compare →
          </button>
          <button
            onClick={() => setCompareIds(new Set())}
            style={{
              width: 30, height: 30,
              borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
            aria-label="Clear comparison"
          >
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  )
}
