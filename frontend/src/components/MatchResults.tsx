import MatchCard from './MatchCard'
import type { MatchResponse } from '../types'

interface Props {
  data: MatchResponse | null
  loading: boolean
  error: string | null
}

function Skeleton() {
  return (
    <div style={{
      borderRadius: 16,
      border: '1px solid #1E2240',
      background: '#0C0F1D',
      overflow: 'hidden',
    }}>
      <div style={{ height: 3, background: '#1E2240' }} />
      <div style={{ padding: 18, display: 'flex', gap: 14 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#111525', flexShrink: 0,
          animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[80, 60, 72].map(w => (
              <div key={w} style={{
                height: 18, width: w, borderRadius: 6, background: '#111525',
                animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
              }} />
            ))}
          </div>
          <div style={{
            height: 16, width: '70%', borderRadius: 6, background: '#111525',
            animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
          }} />
          <div style={{
            height: 12, width: '35%', borderRadius: 6, background: '#111525',
            animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
          }} />
        </div>
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
      border: `1px solid ${color}22`,
      background: `${color}0C`,
      minWidth: 80,
    }}>
      <span style={{
        fontSize: '1.2rem', fontWeight: 800,
        color: color,
        lineHeight: 1,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {value}
      </span>
      <span style={{ fontSize: '0.65rem', color: '#7A7AA0', marginTop: 4, fontWeight: 500 }}>
        {label}
      </span>
    </div>
  )
}

export default function MatchResults({ data, loading, error }: Props) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Loading stat placeholders */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
          {[90, 70, 80, 65].map(w => (
            <div key={w} style={{
              height: 60, width: w,
              borderRadius: 12, background: '#0C0F1D',
              border: '1px solid #1E2240',
              animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
            }} />
          ))}
        </div>
        <Skeleton />
        <Skeleton />
        <Skeleton />
        <p style={{
          textAlign: 'center', fontSize: '0.82rem', color: '#4A4A70',
          marginTop: 8,
        }}>
          Fetching trials and computing matches…
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        borderRadius: 16,
        border: '1px solid rgba(239,68,68,0.25)',
        background: 'rgba(239,68,68,0.06)',
        padding: '40px 24px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#F87171" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p style={{ fontWeight: 700, color: '#F87171', fontSize: '0.875rem' }}>Search failed</p>
        <p style={{ color: '#9090B8', fontSize: '0.82rem', marginTop: 6 }}>{error}</p>
      </div>
    )
  }

  if (!data) return null

  const { matches, total_trials_fetched, total_trials_scored } = data
  const eligible = matches.filter(m => !m.hard_excluded)
  const excluded = matches.filter(m => m.hard_excluded)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <StatPill value={total_trials_fetched} label="fetched" color="#7A7AA0" />
        <StatPill value={total_trials_scored} label="scored" color="#7C5CFC" />
        <StatPill value={eligible.length} label="eligible" color="#22C55E" />
        {excluded.length > 0 && (
          <StatPill value={excluded.length} label="excluded" color="#EF4444" />
        )}
      </div>

      {matches.length === 0 ? (
        <div style={{
          borderRadius: 16,
          border: '1px solid #1E2240',
          background: '#0C0F1D',
          padding: '60px 24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(124,92,252,0.08)',
            border: '1px solid rgba(124,92,252,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#7C5CFC" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p style={{ fontWeight: 700, color: '#C4B8FF', marginBottom: 6 }}>No matching trials found</p>
          <p style={{ fontSize: '0.82rem', color: '#4A4A70' }}>
            Try broadening your search or adjusting the distance filter.
          </p>
        </div>
      ) : (
        <>
          {eligible.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 2 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#22C55E',
                  boxShadow: '0 0 8px rgba(34,197,94,0.5)',
                }} />
                <p style={{
                  fontSize: '0.65rem', fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: '#4ADE80',
                }}>
                  Potentially eligible — {eligible.length}
                </p>
              </div>
              {eligible.map((trial, i) => (
                <MatchCard key={trial.nct_id} trial={trial} rank={i} />
              ))}
            </div>
          )}

          {excluded.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: '#1E2240' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#EF4444',
                    boxShadow: '0 0 8px rgba(239,68,68,0.4)',
                  }} />
                  <p style={{
                    fontSize: '0.65rem', fontWeight: 700,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: '#F87171', whiteSpace: 'nowrap',
                  }}>
                    Hard exclusions — {excluded.length}
                  </p>
                </div>
                <div style={{ flex: 1, height: 1, background: '#1E2240' }} />
              </div>

              {excluded.map((trial, i) => (
                <MatchCard key={trial.nct_id} trial={trial} rank={eligible.length + i} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
