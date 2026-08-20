const NAVY = '#1B3A52'

const PIPELINE = [
  {
    letter: 'A',
    color: NAVY,
    bg: 'rgba(27,58,82,0.07)',
    border: 'rgba(27,58,82,0.18)',
    title: 'Pull live trials',
    desc: 'We query ClinicalTrials.gov directly — no cached snapshots. Up to 200 actively recruiting studies for the patient\'s condition, fetched in real time from the official registry.',
    tech: ['ClinicalTrials.gov v2', 'REST / HTTP'],
  },
  {
    letter: 'B',
    color: '#E8701A',
    bg: 'rgba(232,112,26,0.07)',
    border: 'rgba(232,112,26,0.22)',
    title: 'Find the closest matches',
    desc: 'The patient\'s full profile gets encoded as a vector and compared against pre-indexed trial descriptions. Trials with structurally similar language and criteria float to the top.',
    tech: ['sentence-transformers', 'ChromaDB'],
  },
  {
    letter: 'C',
    color: '#2E8B57',
    bg: 'rgba(46,139,87,0.07)',
    border: 'rgba(46,139,87,0.22)',
    title: 'Check the fine print',
    desc: 'Each trial\'s eligibility criteria is parsed for age cutoffs, sex restrictions, required biomarkers, and prior treatment history. Hard exclusions are flagged before any score is assigned.',
    tech: ['spaCy NLP', 'custom rule engine'],
  },
  {
    letter: 'D',
    color: '#7C5CFC',
    bg: 'rgba(124,92,252,0.07)',
    border: 'rgba(124,92,252,0.2)',
    title: 'Write the findings',
    desc: 'For every ranked result, we generate a plain-language breakdown — what qualifies the patient, what needs to be verified with the site, and what would rule them out entirely.',
    tech: ['rule templates', 'gpt-4o-mini'],
  },
]

export default function HowItWorks() {
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 0 64px', display: 'flex', flexDirection: 'column', gap: 56 }}>

      {/* Banner */}
      <div style={{ width: '100%', height: 260, borderRadius: 20, overflow: 'hidden', background: '#F0EBE3' }}>
        <img
          src="/images/research-banner.jpg"
          alt="Research"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      </div>

      {/* Hero */}
      <div>
        <p style={{
          fontSize: '0.65rem', fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase' as const,
          color: '#8A9BA8', marginBottom: 10,
        }}>How it works</p>
        <h2 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 800, fontSize: '1.9rem',
          letterSpacing: '-0.03em', color: NAVY,
          lineHeight: 1.15, marginBottom: 14, maxWidth: 480,
        }}>
          From a patient profile to ranked trial matches
        </h2>
        <p style={{ color: '#4A6070', fontSize: '0.92rem', maxWidth: 540, lineHeight: 1.75 }}>
          Each search runs four steps in sequence — live data retrieval, semantic ranking,
          eligibility parsing, and plain-language findings — in about 10–20 seconds.
        </p>
      </div>

      {/* Pipeline grid */}
      <section>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}>
          {PIPELINE.map((step, i) => (
            <div key={step.letter} style={{
              background: '#FFFFFF',
              border: '1.5px solid #E2D9C8',
              borderRadius: 16,
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column' as const,
              gap: 12,
              position: 'relative' as const,
            }}>
              {/* Step letter badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28, height: 28,
                borderRadius: 8,
                background: step.bg,
                border: `1px solid ${step.border}`,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 800, fontSize: '0.75rem',
                color: step.color,
                flexShrink: 0,
                alignSelf: 'flex-start' as const,
              }}>
                {step.letter}
              </div>

              <div>
                <h4 style={{
                  fontWeight: 800, fontSize: '0.95rem',
                  color: NAVY, letterSpacing: '-0.01em',
                  marginBottom: 8,
                }}>
                  {step.title}
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#4A6070', lineHeight: 1.75 }}>
                  {step.desc}
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginTop: 4 }}>
                {step.tech.map(t => (
                  <span key={t} style={{
                    fontSize: '0.64rem', fontWeight: 600,
                    padding: '3px 9px', borderRadius: 999,
                    background: step.bg, border: `1px solid ${step.border}`,
                    color: step.color,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {t}
                  </span>
                ))}
              </div>

              {/* Connector to next card */}
              {i < PIPELINE.length - 1 && (
                <div style={{
                  position: 'absolute' as const,
                  ...(i % 2 === 0
                    ? { right: -9, top: '50%', transform: 'translateY(-50%)' }
                    : { bottom: -9, left: '50%', transform: 'translateX(-50%)' }
                  ),
                  width: i % 2 === 0 ? 16 : 1,
                  height: i % 2 === 0 ? 1 : 16,
                  background: '#D0C8BC',
                  zIndex: 1,
                }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Context strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        borderRadius: 16, overflow: 'hidden',
        border: '1.5px solid #E2D9C8',
      }}>
        <img
          src="/images/trial-consult.jpg"
          alt="Doctor with patient"
          style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        <div style={{
          background: NAVY, padding: '28px 32px',
          display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', gap: 10,
        }}>
          <p style={{
            fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase' as const,
            color: 'rgba(255,255,255,0.4)',
          }}>Why it matters</p>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700, fontSize: '0.95rem',
            color: '#FFFFFF', lineHeight: 1.55,
          }}>
            Most patients never find the trial they qualify for. Cohort closes that gap with real data and structured eligibility checking.
          </p>
        </div>
      </div>

      {/* Scoring */}
      <section>
        <p style={{
          fontSize: '0.65rem', fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase' as const,
          color: '#8A9BA8', marginBottom: 6,
        }}>Ranking algorithm</p>
        <h3 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 800, fontSize: '1.3rem',
          color: NAVY, letterSpacing: '-0.02em',
          lineHeight: 1.2, marginBottom: 20,
        }}>
          How matches are scored
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Semantic relevance', weight: '40%', desc: 'How closely the trial description matches the patient profile using vector embeddings.', color: NAVY, bg: 'rgba(27,58,82,0.06)', bar: NAVY },
            { label: 'Eligibility', weight: '40%', desc: 'NLP rules check age, sex, biomarkers, and prior treatments against the trial criteria.', color: '#E8701A', bg: 'rgba(232,112,26,0.06)', bar: '#E8701A' },
            { label: 'Geographic proximity', weight: '20%', desc: 'Straight-line distance from the patient\'s ZIP to the nearest trial site.', color: '#2E8B57', bg: 'rgba(46,139,87,0.06)', bar: '#2E8B57' },
          ].map(row => (
            <div key={row.label} style={{
              display: 'grid', gridTemplateColumns: '160px 40px 1fr',
              alignItems: 'center', gap: 16,
              padding: '14px 18px',
              borderRadius: 10, background: row.bg,
              border: `1px solid ${row.bg.replace('0.06', '0.18')}`,
            }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: row.color }}>{row.label}</span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.78rem', fontWeight: 800,
                color: row.color, opacity: 0.8,
              }}>{row.weight}</span>
              <span style={{ fontSize: '0.78rem', color: '#4A6070', lineHeight: 1.6 }}>{row.desc}</span>
            </div>
          ))}
        </div>

        <div style={{
          padding: '14px 18px', borderRadius: 10,
          background: 'rgba(192,58,43,0.04)',
          border: '1px solid rgba(192,58,43,0.18)',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#C03A2B" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p style={{ fontSize: '0.78rem', color: '#4A6070', lineHeight: 1.6 }}>
            <strong style={{ color: '#C03A2B' }}>Hard exclusions</strong> — when a trial explicitly rules out the patient's age, sex, or a prior therapy, the eligibility score collapses to near-zero and the trial is moved to a separate excluded section regardless of how well it matches semantically.
          </p>
        </div>
      </section>

    </div>
  )
}
