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
  onToast?: (msg: string) => void
}

const PIPELINE_STAGES = [
  { label: 'Fetch Trials', sub: 'ClinicalTrials.gov API', color: '#1B3A52', bg: 'rgba(27,58,82,0.1)', border: 'rgba(27,58,82,0.3)' },
  { label: 'Semantic Search', sub: 'Dense vector embeddings', color: '#E8701A', bg: 'rgba(232,112,26,0.1)', border: 'rgba(232,112,26,0.3)' },
  { label: 'Score Eligibility', sub: 'spaCy NLP', color: '#C48F00', bg: 'rgba(196,143,0,0.12)', border: 'rgba(196,143,0,0.35)' },
  { label: 'Explain Matches', sub: 'Narrative generation', color: '#7C5CFC', bg: 'rgba(124,92,252,0.1)', border: 'rgba(124,92,252,0.3)' },
]
const STAGE_DELAYS = [0, 3000, 7000, 11000]

function StageIcon({ index }: { index: number }) {
  const icons = [
    // Fetch: simple database/cloud download icon
    <svg key={0} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h10a4 4 0 004-4M12 3v12m0 0l-3.5-3.5M12 15l3.5-3.5" />
    </svg>,
    // Semantic: simple search/magnify icon
    <svg key={1} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
    </svg>,
    // Score: checklist icon
    <svg key={2} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7 4h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
    </svg>,
    // Explain: speech bubble icon
    <svg key={3} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M5 4h14a2 2 0 012 2v9a2 2 0 01-2 2H8l-4 4V6a2 2 0 012-2z" />
    </svg>,
  ]
  return icons[index]
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
                <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 34, margin: '0 4px' }}>
                  <svg width="28" height="12" viewBox="0 0 28 12" fill="none">
                    <line x1="0" y1="6" x2="20" y2="6" stroke={isDone ? '#22A85A' : '#D0C8BC'} strokeWidth="1.5" strokeDasharray="3 2" />
                    <path d="M18 2l6 4-6 4" stroke={isDone ? '#22A85A' : '#D0C8BC'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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

function StatStrip({ fetched, scored, eligible, excluded, showing }: {
  fetched: number; scored: number; eligible: number; excluded: number; showing?: number
}) {
  const stats = [
    { value: fetched, label: 'fetched from API', color: '#4A7A9B' },
    { value: scored, label: 'scored', color: '#1B3A52' },
    { value: eligible, label: 'potentially eligible', color: '#0E7A4E' },
    ...(excluded > 0 ? [{ value: excluded, label: 'hard excluded', color: '#B83A2A' }] : []),
    ...(showing !== undefined ? [{ value: showing, label: 'after filters', color: '#E8701A' }] : []),
  ]
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: '#FFFFFF',
      border: '1.5px solid #E2D9C8',
      borderRadius: 10,
      padding: '0 4px',
      height: 44,
      gap: 0,
      overflow: 'hidden',
    }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '0 14px' }}>
            <span style={{
              fontSize: '1rem', fontWeight: 800, lineHeight: 1,
              fontFamily: "'JetBrains Mono', monospace",
              color: s.color,
            }}>{s.value}</span>
            <span style={{ fontSize: '0.65rem', color: '#8A9BA8', fontWeight: 500, whiteSpace: 'nowrap' }}>{s.label}</span>
          </div>
          {i < stats.length - 1 && (
            <div style={{ width: 1, height: 24, background: '#E2D9C8', flexShrink: 0 }} />
          )}
        </div>
      ))}
    </div>
  )
}

type SortBy = 'score' | 'distance'
type PhaseFilter = 'all' | '1' | '2' | '3'
type MinScore = 0 | 0.5 | 0.7
type CountryFilter = 'all' | string
type StatusFilter = 'all' | 'recruiting' | 'not_yet_recruiting'

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
  statusFilter, setStatusFilter,
  availableCountries,
}: {
  sortBy: SortBy; setSortBy: (v: SortBy) => void
  phaseFilter: PhaseFilter; setPhaseFilter: (v: PhaseFilter) => void
  minScore: MinScore; setMinScore: (v: MinScore) => void
  countryFilter: CountryFilter; setCountryFilter: (v: CountryFilter) => void
  statusFilter: StatusFilter; setStatusFilter: (v: StatusFilter) => void
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

      {sep}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: '#8A9BA8' }}>
          Status
        </span>
        <PillButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All</PillButton>
        <PillButton active={statusFilter === 'recruiting'} onClick={() => setStatusFilter('recruiting')}>Recruiting</PillButton>
        <PillButton active={statusFilter === 'not_yet_recruiting'} onClick={() => setStatusFilter('not_yet_recruiting')}>Not yet recruiting</PillButton>
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

function ExcludedSection({
  excluded, filteredEligibleCount, compareIds, toggleCompare, isSaved, onSave, onUnsave, onToast,
}: {
  excluded: TrialMatchResult[]
  filteredEligibleCount: number
  compareIds: Set<string>
  toggleCompare: (id: string) => void
  isSaved: (id: string) => boolean
  onSave: (t: TrialMatchResult) => void
  onUnsave: (id: string) => void
  onToast?: (msg: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: '#E2D9C8' }} />
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
          }}
        >
          <span style={{
            fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase' as const,
            color: '#C03A2B', whiteSpace: 'nowrap' as const,
          }}>
            Hard exclusions — {excluded.length}
          </span>
          <svg
            width="12" height="12" fill="none" viewBox="0 0 24 24"
            stroke="#C03A2B" strokeWidth={2.5}
            style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div style={{ flex: 1, height: 1, background: '#E2D9C8' }} />
      </div>

      {open && excluded.map((trial, i) => (
        <MatchCard
          key={trial.nct_id}
          trial={trial}
          rank={filteredEligibleCount + i}
          compareSelected={compareIds.has(trial.nct_id)}
          onCompareToggle={() => { toggleCompare(trial.nct_id); onToast?.(compareIds.has(trial.nct_id) ? 'Removed from comparison' : 'Added to comparison') }}
          isSaved={isSaved(trial.nct_id)}
          onSaveToggle={() => { const saving = !isSaved(trial.nct_id); saving ? onSave(trial) : onUnsave(trial.nct_id); onToast?.(saving ? 'Trial saved' : 'Trial removed') }}
        />
      ))}
    </div>
  )
}

function applyFilters(
  trials: TrialMatchResult[],
  sortBy: SortBy,
  phaseFilter: PhaseFilter,
  minScore: MinScore,
  statusFilter: StatusFilter,
) {
  return trials
    .filter(t => t.final_score >= minScore)
    .filter(t => {
      if (phaseFilter === 'all') return true
      return t.phases.some(p => p.includes(`PHASE${phaseFilter}`))
    })
    .filter(t => {
      if (statusFilter === 'all') return true
      const s = (t.overall_status ?? '').toUpperCase()
      if (statusFilter === 'recruiting') return s === 'RECRUITING'
      if (statusFilter === 'not_yet_recruiting') return s === 'NOT_YET_RECRUITING'
      return true
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

export default function MatchResults({ data, loading, error, isSaved, onSave, onUnsave, onToast }: Props) {
  const [sortBy, setSortBy] = useState<SortBy>('score')
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all')
  const [minScore, setMinScore] = useState<MinScore>(0)
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set())
  const [showCompare, setShowCompare] = useState(false)

  useEffect(() => {
    setCompareIds(new Set())
    setShowCompare(false)
    setSortBy('score')
    setPhaseFilter('all')
    setMinScore(0)
    setCountryFilter('all')
    setStatusFilter('all')
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
        borderRadius: 12,
        border: '1.5px solid rgba(192,58,43,0.2)',
        background: 'rgba(192,58,43,0.04)',
        padding: '40px 24px',
        textAlign: 'center',
        margin: '16px',
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

  const filteredEligible = applyFilters(eligible, sortBy, phaseFilter, minScore, statusFilter)
    .filter(m => countryFilter === 'all' || (m.countries_at_sites ?? []).includes(countryFilter))

  const filtersActive = sortBy !== 'score' || phaseFilter !== 'all' || minScore !== 0 || countryFilter !== 'all' || statusFilter !== 'all'
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
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          availableCountries={availableCountries}
        />

        {/* Stats row */}
        <StatStrip
          fetched={total_trials_fetched}
          scored={total_trials_scored}
          eligible={eligible.length}
          excluded={excluded.length}
          showing={filtersActive && filteredEligible.length !== eligible.length ? filteredEligible.length : undefined}
        />

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: '#8A9BA8',
                  }}>
                    Potentially eligible
                  </span>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700,
                    background: 'rgba(34,168,90,0.1)',
                    border: '1px solid rgba(34,168,90,0.25)',
                    color: '#16A34A',
                    borderRadius: 999, padding: '1px 8px',
                  }}>
                    {filteredEligible.length}
                  </span>
                </div>
                {filteredEligible.map((trial, i) => (
                  <MatchCard
                    key={trial.nct_id}
                    trial={trial}
                    rank={i}
                    compareSelected={compareIds.has(trial.nct_id)}
                    onCompareToggle={() => { toggleCompare(trial.nct_id); onToast?.(compareIds.has(trial.nct_id) ? 'Removed from comparison' : 'Added to comparison') }}
                    isSaved={isSaved(trial.nct_id)}
                    onSaveToggle={() => { const saving = !isSaved(trial.nct_id); saving ? onSave(trial) : onUnsave(trial.nct_id); onToast?.(saving ? 'Trial saved' : 'Trial removed') }}
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
                  onClick={() => { setPhaseFilter('all'); setMinScore(0); setSortBy('score'); setCountryFilter('all'); setStatusFilter('all') }}
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
              <ExcludedSection
                excluded={excluded}
                filteredEligibleCount={filteredEligible.length}
                compareIds={compareIds}
                toggleCompare={toggleCompare}
                isSaved={isSaved}
                onSave={onSave}
                onUnsave={onUnsave}
                onToast={onToast}
              />
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
