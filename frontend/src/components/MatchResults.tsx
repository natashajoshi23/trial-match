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
      border: '1.5px solid #E2D9C8',
      background: '#FFFFFF',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(27,58,82,0.05)',
    }}>
      <div style={{ height: 3, background: '#E2D9C8' }} />
      <div style={{ padding: 18, display: 'flex', gap: 14 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#F7F3EC', flexShrink: 0,
          animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[80, 60, 72].map(w => (
              <div key={w} style={{
                height: 18, width: w, borderRadius: 6, background: '#F7F3EC',
                animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
              }} />
            ))}
          </div>
          <div style={{
            height: 16, width: '70%', borderRadius: 6, background: '#F7F3EC',
            animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
          }} />
          <div style={{
            height: 12, width: '35%', borderRadius: 6, background: '#F7F3EC',
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

export default function MatchResults({ data, loading, error }: Props) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
          {[90, 70, 80, 65].map(w => (
            <div key={w} style={{
              height: 60, width: w,
              borderRadius: 12, background: '#FFFFFF',
              border: '1.5px solid #E2D9C8',
              animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
            }} />
          ))}
        </div>
        <Skeleton />
        <Skeleton />
        <Skeleton />
        <p style={{
          textAlign: 'center', fontSize: '0.82rem', color: '#8A9BA8',
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <StatPill value={total_trials_fetched} label="fetched" color="#8A9BA8" />
        <StatPill value={total_trials_scored} label="scored" color="#1B3A52" />
        <StatPill value={eligible.length} label="eligible" color="#22A85A" />
        {excluded.length > 0 && (
          <StatPill value={excluded.length} label="excluded" color="#C03A2B" />
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
          {eligible.length > 0 && (
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
                <MatchCard key={trial.nct_id} trial={trial} rank={eligible.length + i} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
