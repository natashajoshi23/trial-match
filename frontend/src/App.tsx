import { useState } from 'react'
import PatientForm from './components/PatientForm'
import MatchResults from './components/MatchResults'
import { useMatch } from './hooks/useMatch'
import type { PatientProfile } from './types'

const PIPELINE_STEPS = [
  {
    label: 'Fetch Trials',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" />
      </svg>
    ),
  },
  {
    label: 'Semantic Search',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
  },
  {
    label: 'Score Eligibility',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
  },
  {
    label: 'Explain Matches',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
  },
]

export default function App() {
  const { data, loading, error, match } = useMatch()
  const [hasSearched, setHasSearched] = useState(false)

  const handleSubmit = async (patient: PatientProfile, topK: number, maxDistance: number | null) => {
    setHasSearched(true)
    await match({ patient, top_k: topK, max_distance_miles: maxDistance })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #134e4a 100%)' }} className="text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(20,184,166,0.18)', border: '1px solid rgba(20,184,166,0.35)' }}>
                <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.357 2.059l.214.09a2.25 2.25 0 001.1 0l.214-.09a2.25 2.25 0 001.357-2.059V3.104m0 0c.25.023.5.05.75.082M5 14.5l.75-1.5M5 14.5l-1.5 1.5M19 14.5l-1.5 1.5M19 14.5l.75-1.5M5 14.5a12.002 12.002 0 0014 0" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight leading-none">Clinical Trial Matcher</h1>
                <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>AI-powered matching against ClinicalTrials.gov</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              {['Semantic Search', 'NLP Eligibility', 'Geo Scoring', 'Live Data'].map(f => (
                <span key={f} className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1' }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">
          {/* Sidebar form */}
          <div className="lg:sticky lg:top-8">
            <PatientForm onSubmit={handleSubmit} loading={loading} />
          </div>

          {/* Results panel */}
          <div>
            {!hasSearched ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                {/* Pipeline steps */}
                <div className="flex items-center gap-2 mb-10 flex-wrap justify-center">
                  {PIPELINE_STEPS.map((step, i) => (
                    <div key={step.label} className="flex items-center gap-2">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400">
                          {step.icon}
                        </div>
                        <p className="text-xs text-slate-400 font-medium whitespace-nowrap">{step.label}</p>
                      </div>
                      {i < PIPELINE_STEPS.length - 1 && (
                        <div className="w-6 h-px bg-slate-200 mb-5 hidden sm:block" />
                      )}
                    </div>
                  ))}
                </div>

                <h2 className="text-2xl font-bold text-slate-700 mb-3">Find the Right Trial</h2>
                <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
                  Enter a patient profile to search recruiting clinical trials, ranked by semantic
                  relevance, NLP eligibility scoring, and geographic proximity.
                </p>
              </div>
            ) : (
              <MatchResults data={data} loading={loading} error={error} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
