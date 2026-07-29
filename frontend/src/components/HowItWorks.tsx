const NAVY = '#1B3A52'

const PIPELINE = [
  {
    num: '01',
    color: NAVY,
    bg: 'rgba(27,58,82,0.08)',
    border: 'rgba(27,58,82,0.2)',
    title: 'Fetch Trials',
    desc: 'Queries the ClinicalTrials.gov v2 REST API for actively recruiting studies that match the patient\'s primary condition. Results are filtered to RECRUITING status only and paginated up to 200 trials per search.',
    tech: ['ClinicalTrials.gov v2', 'REST / HTTP', 'Python requests'],
  },
  {
    num: '02',
    color: '#E8701A',
    bg: 'rgba(232,112,26,0.08)',
    border: 'rgba(232,112,26,0.25)',
    title: 'Semantic Search',
    desc: 'Encodes the patient\'s full profile into a dense vector using sentence-transformers, then performs approximate nearest-neighbour search over a ChromaDB collection of pre-encoded trial descriptions to surface semantically similar trials.',
    tech: ['sentence-transformers', 'ChromaDB', 'cosine similarity'],
  },
  {
    num: '03',
    color: '#C48F00',
    bg: 'rgba(196,143,0,0.08)',
    border: 'rgba(196,143,0,0.25)',
    title: 'Score Eligibility',
    desc: 'Parses each trial\'s eligibility criteria with spaCy NLP and custom regex rules to extract age bounds, sex requirements, biomarker mentions, and prior treatment history. Hard exclusions collapse the eligibility score near zero.',
    tech: ['spaCy NLP', 'custom regex rules', 'Python 3.12'],
  },
  {
    num: '04',
    color: '#7C5CFC',
    bg: 'rgba(124,92,252,0.08)',
    border: 'rgba(124,92,252,0.22)',
    title: 'Explain Matches',
    desc: 'Generates structured, human-readable rationales for each ranked result — why a patient may qualify, which criteria are uncertain, and what would disqualify them. An optional GPT call produces a narrative summary for the top matches.',
    tech: ['template engine', 'OpenAI API (optional)', 'FastAPI response'],
  },
]

const SCORE_COMPONENTS = [
  {
    label: 'Semantic relevance',
    weight: '40%',
    color: NAVY,
    gradient: `linear-gradient(90deg, ${NAVY}, #2D5F7C)`,
    desc: 'Cosine similarity between the patient profile embedding and the trial\'s title + description embedding. Computed via ChromaDB query, ranges 0–1.',
  },
  {
    label: 'Eligibility match',
    weight: '40%',
    color: '#E8701A',
    gradient: 'linear-gradient(90deg, #E8701A, #F5B642)',
    desc: 'Rule-based score from spaCy NLP. Criteria matches add points; hard exclusions (wrong age, sex, prior therapy) zero out this component entirely.',
  },
  {
    label: 'Geographic proximity',
    weight: '20%',
    color: '#22A85A',
    gradient: 'linear-gradient(90deg, #22A85A, #4ADE80)',
    desc: 'Inverse distance from the patient\'s ZIP to the nearest trial site. Decays smoothly over distance. Falls back to 0.5 when no location data is available.',
  },
]

const TECH = [
  { name: 'FastAPI', role: 'Backend API framework', color: NAVY, dot: '#1B3A52' },
  { name: 'React 18 + TypeScript', role: 'Frontend UI', color: NAVY, dot: '#1B3A52' },
  { name: 'spaCy', role: 'NLP + eligibility parsing', color: '#E8701A', dot: '#E8701A' },
  { name: 'ChromaDB', role: 'Vector store + ANN search', color: '#E8701A', dot: '#E8701A' },
  { name: 'sentence-transformers', role: 'Dense text embeddings', color: '#C48F00', dot: '#C48F00' },
  { name: 'ClinicalTrials.gov v2', role: 'Live recruiting trial data', color: '#22A85A', dot: '#22A85A' },
]

function SectionHeading({ label, sub }: { label: string; sub: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{
        fontSize: '0.65rem', fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: '#8A9BA8', marginBottom: 6,
      }}>
        {label}
      </p>
      <h3 style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 800, fontSize: '1.3rem',
        color: NAVY, letterSpacing: '-0.02em',
        lineHeight: 1.2,
      }}>
        {sub}
      </h3>
    </div>
  )
}

function ScoreBarMini({ gradient, value }: { gradient: string; value: number }) {
  return (
    <div style={{ height: 4, width: '100%', borderRadius: 999, background: '#E2D9C8', overflow: 'hidden', marginTop: 12 }}>
      <div style={{ height: 4, width: `${value * 100}%`, borderRadius: 999, background: gradient }} />
    </div>
  )
}

export default function HowItWorks() {
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 0 64px', display: 'flex', flexDirection: 'column', gap: 60 }}>

      {/* ── Hero ── */}
      <div style={{ textAlign: 'center' }}>
        <h2 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 800, fontSize: '2rem',
          letterSpacing: '-0.03em',
          color: NAVY, marginBottom: 14, lineHeight: 1.15,
        }}>
          Under the Hood
        </h2>
        <p style={{ color: '#4A6070', fontSize: '0.95rem', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
          A 4-stage AI pipeline that fetches live trial data, embeds patient profiles,
          scores eligibility with NLP, and explains every match in plain language.
        </p>
      </div>

      {/* ── Pipeline ── */}
      <section>
        <SectionHeading label="How it works" sub="The 4-Stage Pipeline" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {PIPELINE.map(step => (
            <div key={step.num} style={{
              background: '#FFFFFF',
              border: '1.5px solid #E2D9C8',
              borderRadius: 16,
              padding: '22px 24px',
              boxShadow: '0 2px 10px rgba(27,58,82,0.05)',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              {/* Number badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: step.bg, border: `1.5px solid ${step.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 800, fontSize: '0.78rem',
                    color: step.color,
                  }}>
                    {step.num}
                  </span>
                </div>
                <h4 style={{
                  fontWeight: 800, fontSize: '0.95rem',
                  color: NAVY, letterSpacing: '-0.01em',
                }}>
                  {step.title}
                </h4>
              </div>

              <p style={{ fontSize: '0.82rem', color: '#4A6070', lineHeight: 1.7, flex: 1 }}>
                {step.desc}
              </p>

              {/* Tech tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {step.tech.map(t => (
                  <span key={t} style={{
                    fontSize: '0.65rem', fontWeight: 600,
                    padding: '3px 9px', borderRadius: 999,
                    background: step.bg,
                    border: `1px solid ${step.border}`,
                    color: step.color,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Scoring ── */}
      <section>
        <SectionHeading label="Ranking algorithm" sub="How Matches are Scored" />

        {/* Formula block */}
        <div style={{
          background: '#F7F3EC',
          border: '1.5px solid #E2D9C8',
          borderRadius: 14,
          padding: '16px 24px',
          marginBottom: 20,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.85rem',
          color: '#8A9BA8',
          letterSpacing: '0.02em',
          textAlign: 'center',
        }}>
          <span style={{ color: '#8A9BA8' }}>final_score = </span>
          <span style={{ color: NAVY, fontWeight: 700 }}>0.40</span>
          <span style={{ color: '#8A9BA8' }}> × semantic + </span>
          <span style={{ color: '#E8701A', fontWeight: 700 }}>0.40</span>
          <span style={{ color: '#8A9BA8' }}> × eligibility + </span>
          <span style={{ color: '#22A85A', fontWeight: 700 }}>0.20</span>
          <span style={{ color: '#8A9BA8' }}> × geo</span>
        </div>

        {/* Score component cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {SCORE_COMPONENTS.map(c => (
            <div key={c.label} style={{
              background: '#FFFFFF',
              border: '1.5px solid #E2D9C8',
              borderRadius: 14,
              padding: '18px 20px',
              boxShadow: '0 2px 10px rgba(27,58,82,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{
                  fontWeight: 800, fontSize: '0.82rem', color: c.color,
                  letterSpacing: '-0.01em',
                }}>
                  {c.label}
                </p>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 800, fontSize: '1.1rem', color: c.color,
                }}>
                  {c.weight}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#4A6070', lineHeight: 1.6 }}>
                {c.desc}
              </p>
              <ScoreBarMini gradient={c.gradient} value={c.label === 'Geographic proximity' ? 0.2 : 0.4} />
            </div>
          ))}
        </div>

        {/* Hard exclusion note */}
        <div style={{
          marginTop: 14,
          padding: '12px 18px',
          borderRadius: 10,
          background: 'rgba(192,58,43,0.04)',
          border: '1px solid rgba(192,58,43,0.18)',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#C03A2B" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p style={{ fontSize: '0.78rem', color: '#4A6070', lineHeight: 1.6 }}>
            <strong style={{ color: '#C03A2B' }}>Hard exclusions</strong> — when a trial explicitly rules out a patient's age range, biological sex, or a prior therapy, the eligibility score collapses to near-zero and the trial is shown in a separate "excluded" section regardless of semantic score.
          </p>
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section>
        <SectionHeading label="Built with" sub="Tech Stack" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {TECH.map(t => (
            <div key={t.name} style={{
              background: '#FFFFFF',
              border: '1.5px solid #E2D9C8',
              borderRadius: 12,
              padding: '16px 18px',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 1px 6px rgba(27,58,82,0.05)',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: t.dot, flexShrink: 0,
                boxShadow: `0 0 6px ${t.dot}60`,
              }} />
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontWeight: 700, fontSize: '0.82rem',
                  color: NAVY,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {t.name}
                </p>
                <p style={{ fontSize: '0.7rem', color: '#8A9BA8', marginTop: 2 }}>
                  {t.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Data flow ── */}
      <section>
        <SectionHeading label="Data flow" sub="Request Lifecycle" />
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid #E2D9C8',
          borderRadius: 16,
          padding: '28px 32px',
          boxShadow: '0 2px 10px rgba(27,58,82,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
            {[
              { label: 'Patient input', sub: 'React form', color: NAVY },
              { label: 'POST /match', sub: 'FastAPI endpoint', color: NAVY },
              { label: 'ClinicalTrials.gov', sub: 'v2 REST API', color: '#E8701A' },
              { label: 'ChromaDB', sub: 'Vector search', color: '#E8701A' },
              { label: 'spaCy NLP', sub: 'Eligibility rules', color: '#C48F00' },
              { label: 'Ranked results', sub: 'JSON response', color: '#22A85A' },
            ].map((node, i, arr) => (
              <div key={node.label} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    padding: '7px 14px', borderRadius: 8,
                    background: `${node.color}0D`,
                    border: `1.5px solid ${node.color}30`,
                  }}>
                    <p style={{
                      fontWeight: 700, fontSize: '0.72rem',
                      color: node.color, whiteSpace: 'nowrap',
                    }}>
                      {node.label}
                    </p>
                  </div>
                  <p style={{ fontSize: '0.6rem', color: '#8A9BA8', whiteSpace: 'nowrap' }}>
                    {node.sub}
                  </p>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', margin: '0 6px', paddingBottom: 18 }}>
                    <div style={{ width: 20, height: 1, background: '#DDD5C0' }} />
                    <svg width="5" height="7" viewBox="0 0 6 8" fill="none" style={{ marginLeft: -1 }}>
                      <path d="M0 0L6 4L0 8" stroke="#DDD5C0" strokeWidth="1.5" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
