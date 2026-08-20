import type { TrialMatchResult } from '../types'

const NAVY = '#1B3A52'
const RING_R = 22
const RING_CIRC = 2 * Math.PI * RING_R

function MiniRing({ score, excluded }: { score: number; excluded: boolean }) {
  const dash = RING_CIRC * (excluded ? 0.08 : score)
  const colorA = excluded ? '#C03A2B' : NAVY
  const colorB = excluded ? '#E8701A' : '#F5B642'
  const id = `cmp-${Math.random().toString(36).slice(2)}`
  return (
    <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
      <svg width="56" height="56" viewBox="0 0 56 56">
        <defs>
          <linearGradient id={id} gradientTransform="rotate(60,28,28)">
            <stop offset="0%" stopColor={colorA} />
            <stop offset="100%" stopColor={colorB} />
          </linearGradient>
        </defs>
        <circle cx="28" cy="28" r={RING_R} fill="none" stroke="#E2D9C8" strokeWidth="6" />
        <circle cx="28" cy="28" r={RING_R} fill="none"
          stroke={`url(#${id})`} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${RING_CIRC}`}
          transform="rotate(-90,28,28)"
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: NAVY, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>
          {Math.round(score * 100)}
        </span>
        <span style={{ fontSize: '0.48rem', color: '#8A9BA8', fontWeight: 600 }}>%</span>
      </div>
    </div>
  )
}

function ScoreRow({ label, weight, value, gradient, isBest }: {
  label: string; weight: string; value: number; gradient: string; isBest: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: '0.65rem', color: '#8A9BA8' }}>{label}</span>
          <span style={{ fontSize: '0.58rem', color: '#C4D0D8' }}>{weight}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {isBest && (
            <span style={{
              fontSize: '0.55rem', fontWeight: 700, padding: '1px 5px',
              borderRadius: 99, background: 'rgba(27,58,82,0.08)',
              color: NAVY, letterSpacing: '0.04em',
            }}>BEST</span>
          )}
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: NAVY, fontFamily: "'JetBrains Mono', monospace" }}>
            {Math.round(value * 100)}%
          </span>
        </div>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: '#E2D9C8', overflow: 'hidden' }}>
        <div style={{ height: 5, width: `${value * 100}%`, borderRadius: 999, background: gradient }} />
      </div>
    </div>
  )
}

function Section({ title, color, bg, border, items, emptyLabel }: {
  title: string; color: string; bg: string; border: string;
  items: string[]; emptyLabel?: string
}) {
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${border}`, background: bg, padding: '10px 12px' }}>
      <p style={{
        fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color, marginBottom: 8,
      }}>{title}</p>
      {items.length === 0
        ? <p style={{ fontSize: '0.7rem', color: '#C4D0D8', fontStyle: 'italic' }}>{emptyLabel ?? 'None noted'}</p>
        : <ul style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {items.map((item, i) => (
              <li key={i} style={{ display: 'flex', gap: 7, fontSize: '0.72rem', color: '#4A6070', lineHeight: 1.5 }}>
                <span style={{ color, flexShrink: 0 }}>·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
      }
    </div>
  )
}

interface Props {
  trials: TrialMatchResult[]
  onClose: () => void
}

export default function ComparePanel({ trials, onClose }: Props) {
  const colW = trials.length === 2 ? '1fr 1fr' : '1fr 1fr 1fr'

  const bestSemantic = Math.max(...trials.map(t => t.score_breakdown.semantic))
  const bestEligibility = Math.max(...trials.map(t => t.score_breakdown.eligibility))
  const bestGeo = Math.max(...trials.map(t => t.score_breakdown.geo))
  const bestDistance = Math.min(...trials.filter(t => t.distance_miles != null).map(t => t.distance_miles!))

  const allSameSemantic = trials.every(t => t.score_breakdown.semantic === bestSemantic)
  const allSameEligibility = trials.every(t => t.score_breakdown.eligibility === bestEligibility)
  const allSameGeo = trials.every(t => t.score_breakdown.geo === bestGeo)
  const allSameDistance = trials.filter(t => t.distance_miles != null).every(t => t.distance_miles === bestDistance)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,25,35,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxHeight: '88vh',
        background: '#FFFFFF',
        borderRadius: '20px 20px 0 0',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(27,58,82,0.18)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1.5px solid #E2D9C8',
          background: '#FFFFFF',
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'rgba(27,58,82,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* Scale/balance icon */}
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke={NAVY} strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l9-3 9 3M3 6v12l9 3 9-3V6M12 3v18" />
              </svg>
            </div>
            <div>
              <h3 style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 800, fontSize: '0.9rem',
                color: NAVY, letterSpacing: '-0.01em',
              }}>
                Trial Comparison
              </h3>
              <p style={{ fontSize: '0.65rem', color: '#8A9BA8', marginTop: 1 }}>
                {trials.length} trials · BEST tags highlight the stronger result per category
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '1.5px solid #E2D9C8',
              background: '#F7F3EC',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#8A9BA8',
            }}
            aria-label="Close comparison"
          >
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: colW, gap: 16 }}>
            {trials.map(t => {
              const phaseLabel = t.phases.map(p => p.replace('PHASE', 'Ph ').replace('_', '/')).join(' / ') || null
              const isBestSemantic = !allSameSemantic && t.score_breakdown.semantic === bestSemantic
              const isBestEligibility = !allSameEligibility && t.score_breakdown.eligibility === bestEligibility
              const isBestGeo = !allSameGeo && t.score_breakdown.geo === bestGeo
              const isBestDistance = !allSameDistance && t.distance_miles != null && t.distance_miles === bestDistance

              return (
                <div key={t.nct_id} style={{
                  display: 'flex', flexDirection: 'column', gap: 14,
                  background: t.hard_excluded ? 'rgba(192,58,43,0.02)' : '#FAFAF8',
                  border: `1.5px solid ${t.hard_excluded ? 'rgba(192,58,43,0.2)' : '#E2D9C8'}`,
                  borderTop: `3px solid ${t.hard_excluded ? '#C03A2B' : t.final_score >= 0.7 ? '#22A85A' : t.final_score >= 0.45 ? '#E8701A' : NAVY}`,
                  borderRadius: 14,
                  padding: '16px 14px',
                }}>
                  {/* Trial header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <MiniRing score={t.final_score} excluded={t.hard_excluded} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                        <span style={{
                          fontSize: '0.6rem', fontFamily: "'JetBrains Mono', monospace",
                          padding: '2px 6px', borderRadius: 5,
                          border: '1px solid #E2D9C8', background: '#F7F3EC', color: '#8A9BA8',
                        }}>{t.nct_id}</span>
                        {phaseLabel && (
                          <span style={{
                            fontSize: '0.6rem', fontWeight: 600, padding: '2px 6px', borderRadius: 5,
                            border: '1px solid rgba(27,58,82,0.2)',
                            background: 'rgba(27,58,82,0.06)', color: NAVY,
                          }}>{phaseLabel}</span>
                        )}
                        {t.overall_status && (
                          <span style={{
                            fontSize: '0.6rem', fontWeight: 600, padding: '2px 6px', borderRadius: 5,
                            border: '1px solid rgba(34,168,90,0.25)',
                            background: 'rgba(34,168,90,0.08)', color: '#16A34A',
                          }}>{t.overall_status}</span>
                        )}
                        {t.hard_excluded && (
                          <span style={{
                            fontSize: '0.6rem', fontWeight: 600, padding: '2px 6px', borderRadius: 5,
                            border: '1px solid rgba(192,58,43,0.2)',
                            background: 'rgba(192,58,43,0.06)', color: '#C03A2B',
                          }}>Excluded</span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: NAVY, lineHeight: 1.4 }}>
                        {t.brief_title}
                      </p>
                    </div>
                  </div>

                  {/* Conditions */}
                  {t.conditions.length > 0 && (
                    <div>
                      <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A9BA8', marginBottom: 5 }}>
                        Targets
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {t.conditions.slice(0, 4).map(c => (
                          <span key={c} style={{
                            fontSize: '0.65rem', padding: '2px 8px', borderRadius: 99,
                            background: 'rgba(27,58,82,0.05)',
                            border: '1px solid rgba(27,58,82,0.12)',
                            color: '#4A6070',
                          }}>{c}</span>
                        ))}
                        {t.conditions.length > 4 && (
                          <span style={{ fontSize: '0.65rem', color: '#8A9BA8' }}>+{t.conditions.length - 4} more</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.68rem', color: '#8A9BA8' }}>
                    {t.distance_miles != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        <span style={{ fontWeight: isBestDistance ? 700 : 400, color: isBestDistance ? '#16A34A' : '#8A9BA8' }}>
                          {t.distance_miles < 1 ? '< 1' : Math.round(t.distance_miles)} mi
                        </span>
                        {isBestDistance && <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#16A34A' }}>NEAREST</span>}
                      </div>
                    )}
                    {t.locations_count > 0 && (
                      <span>{t.locations_count} site{t.locations_count !== 1 ? 's' : ''}</span>
                    )}
                    {t.countries_at_sites.length > 0 && (
                      <span>{t.countries_at_sites.slice(0, 2).join(', ')}{t.countries_at_sites.length > 2 ? ` +${t.countries_at_sites.length - 2}` : ''}</span>
                    )}
                  </div>

                  {/* Score breakdown */}
                  <div style={{
                    background: '#F7F3EC', borderRadius: 10,
                    border: '1px solid #E2D9C8',
                    padding: '12px 14px',
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}>
                    <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A9BA8' }}>
                      Score breakdown
                    </p>
                    <ScoreRow label="Semantic match" weight="40%" value={t.score_breakdown.semantic} gradient={`linear-gradient(90deg,${NAVY},#2D5F7C)`} isBest={isBestSemantic} />
                    <ScoreRow label="Eligibility match" weight="40%" value={t.score_breakdown.eligibility} gradient="linear-gradient(90deg,#E8701A,#F5B642)" isBest={isBestEligibility} />
                    <ScoreRow label="Geo proximity" weight="20%" value={t.score_breakdown.geo} gradient="linear-gradient(90deg,#22A85A,#4ADE80)" isBest={isBestGeo} />
                  </div>

                  {/* Eligibility strengths */}
                  <Section
                    title="Eligibility strengths"
                    color="#16A34A"
                    bg="rgba(34,168,90,0.04)"
                    border="rgba(34,168,90,0.2)"
                    items={t.why_eligible}
                    emptyLabel="No confirmed matches"
                  />

                  {/* Concerns to verify */}
                  {t.why_uncertain.length > 0 && (
                    <Section
                      title="Concerns to verify"
                      color="#E8701A"
                      bg="rgba(232,112,26,0.04)"
                      border="rgba(232,112,26,0.2)"
                      items={t.why_uncertain}
                    />
                  )}

                  {/* Disqualifying criteria */}
                  {t.why_excluded.length > 0 && (
                    <Section
                      title="Disqualifying criteria"
                      color="#C03A2B"
                      bg="rgba(192,58,43,0.04)"
                      border="rgba(192,58,43,0.2)"
                      items={t.why_excluded}
                    />
                  )}

                  <a
                    href={`https://clinicaltrials.gov/study/${t.nct_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: '0.7rem', fontWeight: 600,
                      color: NAVY, textDecoration: 'none',
                      marginTop: 'auto', paddingTop: 4,
                    }}
                  >
                    View on ClinicalTrials.gov
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
