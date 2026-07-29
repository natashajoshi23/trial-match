import { useState } from 'react'
import PatientForm from './components/PatientForm'
import MatchResults from './components/MatchResults'
import { useMatch } from './hooks/useMatch'
import type { PatientProfile } from './types'

const PIPELINE_STEPS = [
  {
    label: 'Fetch Trials',
    sub: 'Live from ClinicalTrials.gov',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" />
      </svg>
    ),
  },
  {
    label: 'Semantic Search',
    sub: 'Dense vector embeddings',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
  },
  {
    label: 'Score Eligibility',
    sub: 'spaCy NLP + regex rules',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
  },
  {
    label: 'Explain Matches',
    sub: 'Template + optional GPT',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
  },
]

const FEATURES = ['Semantic Search', 'NLP Eligibility', 'Geo Scoring', 'Live API']

export default function App() {
  const { data, loading, error, match } = useMatch()
  const [hasSearched, setHasSearched] = useState(false)

  const handleSubmit = async (patient: PatientProfile, topK: number, maxDistance: number | null) => {
    setHasSearched(true)
    await match({ patient, top_k: topK, max_distance_miles: maxDistance })
  }

  return (
    <div className="min-h-screen" style={{ background: '#070A15' }}>

      {/* ── Header ── */}
      <header style={{
        background: 'linear-gradient(135deg, #0A0C1E 0%, #0D0F22 50%, #100C20 100%)',
        borderBottom: '1px solid rgba(124,92,252,0.18)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
      }}>
        {/* violet glow bar at very top */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #7C5CFC, #B98EFF, #F59E0B)' }} />

        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">

            {/* Logo + title */}
            <div className="flex items-center gap-3.5">
              <div style={{
                width: 42, height: 42,
                background: 'rgba(124,92,252,0.15)',
                border: '1px solid rgba(124,92,252,0.4)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 16px rgba(124,92,252,0.2)',
              }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#A78BFA" strokeWidth={1.7}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.357 2.059l.214.09a2.25 2.25 0 001.1 0l.214-.09a2.25 2.25 0 001.357-2.059V3.104m0 0c.25.023.5.05.75.082M5 14.5l.75-1.5M5 14.5l-1.5 1.5M19 14.5l-1.5 1.5M19 14.5l.75-1.5M5 14.5a12.002 12.002 0 0014 0" />
                </svg>
              </div>

              <div>
                <h1 style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  letterSpacing: '-0.01em',
                  color: '#EDE8FF',
                  lineHeight: 1,
                }}>
                  Clinical Trial Matcher
                </h1>
                <p style={{ color: '#6B6B90', fontSize: '0.72rem', marginTop: 4 }}>
                  AI-powered matching · ClinicalTrials.gov v2 API
                </p>
              </div>
            </div>

            {/* Feature chips */}
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              {FEATURES.map(f => (
                <span key={f} style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(124,92,252,0.1)',
                  border: '1px solid rgba(124,92,252,0.28)',
                  color: '#A78BFA',
                }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">

          {/* Sidebar */}
          <div className="lg:sticky lg:top-8">
            <PatientForm onSubmit={handleSubmit} loading={loading} />
          </div>

          {/* Results panel */}
          <div>
            {!hasSearched ? (
              <EmptyState />
            ) : (
              <MatchResults data={data} loading={loading} error={error} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      {/* Pipeline visualization */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0, marginBottom: 44, width: '100%' }}>
        {PIPELINE_STEPS.map((step, i) => (
          <div key={step.label} style={{ display: 'flex', alignItems: 'center' }}>
            {/* Node */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 52, height: 52,
                borderRadius: 16,
                background: 'rgba(124,92,252,0.1)',
                border: '1px solid rgba(124,92,252,0.28)',
                boxShadow: '0 0 18px rgba(124,92,252,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#A78BFA',
              }}>
                {step.icon}
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#C4B8FF', whiteSpace: 'nowrap' }}>
                  {step.label}
                </p>
                <p style={{ fontSize: '0.58rem', color: '#4A4A70', marginTop: 2, whiteSpace: 'nowrap' }}>
                  {step.sub}
                </p>
              </div>
            </div>

            {/* Connector */}
            {i < PIPELINE_STEPS.length - 1 && (
              <div style={{ display: 'flex', alignItems: 'center', margin: '0 8px', paddingBottom: 32 }}>
                <div style={{
                  width: 32, height: 1,
                  background: 'linear-gradient(90deg, rgba(124,92,252,0.5), rgba(124,92,252,0.15))',
                }} />
                <svg width="5" height="7" viewBox="0 0 6 8" fill="none" style={{ marginLeft: -1 }}>
                  <path d="M0 0L6 4L0 8" stroke="rgba(124,92,252,0.4)" strokeWidth="1.5" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Heading */}
      <h2 style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 800,
        fontSize: '1.75rem',
        letterSpacing: '-0.025em',
        color: '#EDE8FF',
        marginBottom: 12,
        lineHeight: 1.2,
      }}>
        Find the Right Trial
      </h2>
      <p style={{
        color: '#6B6B90',
        fontSize: '0.875rem',
        maxWidth: 380,
        lineHeight: 1.7,
      }}>
        Enter a patient profile to search recruiting trials from ClinicalTrials.gov,
        ranked by semantic relevance, NLP eligibility scoring, and geographic proximity.
      </p>

      {/* Scoring formula */}
      <div style={{
        marginTop: 28,
        padding: '12px 20px',
        borderRadius: 12,
        background: 'rgba(124,92,252,0.07)',
        border: '1px solid rgba(124,92,252,0.18)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.72rem',
        color: '#7A7AA0',
        letterSpacing: '0.02em',
      }}>
        score = <span style={{ color: '#A78BFA' }}>0.40</span> × semantic{' '}
        + <span style={{ color: '#F59E0B' }}>0.40</span> × eligibility{' '}
        + <span style={{ color: '#34D399' }}>0.20</span> × geo
      </div>
    </div>
  )
}
