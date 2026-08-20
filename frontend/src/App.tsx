import { useState, useCallback, useEffect, useRef } from 'react'
import PatientForm from './components/PatientForm'
import MatchResults from './components/MatchResults'
import HowItWorks from './components/HowItWorks'
import ModeSelector from './components/ModeSelector'
import SavedView from './components/SavedView'
import ResearcherForm from './components/ResearcherForm'
import SiteResults from './components/SiteResults'
import { RESEARCHER_DEMO_DATA } from './demoData'
import { useMatch } from './hooks/useMatch'
import { useSaves } from './hooks/useSaves'
import { useMode } from './hooks/useMode'
import { useResearcher } from './hooks/useResearcher'
import { useResearcherSaves } from './hooks/useResearcherSaves'
import type { PatientProfile } from './types'


const PATIENT_DOCTOR_TABS = [
  { id: 'search', label: 'Search' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'saved', label: 'Saved' },
] as const

const RESEARCHER_TABS = [
  { id: 'search', label: 'Find Trial Sites' },
  { id: 'saved', label: 'Saved' },
] as const

type Tab = 'search' | 'how-it-works' | 'saved'

export default function App() {
  const { data, loading, error, match, loadDemo } = useMatch()
  const { data: resData, setData: setResData, loading: resLoading, error: resError, search: resSearch } = useResearcher()
  const { saves: resSaves, isSaved: resIsSaved, save: resSave, unsave: resUnsave, updateNotes: resUpdateNotes, clearAll: resClearAll } = useResearcherSaves()
  const [resHasSearched, setResHasSearched] = useState(false)
  const [resFormKey, setResFormKey] = useState(0)
  const { saves, isSaved, save, unsave, updatePatientLabel, updateNotes, clearAll } = useSaves()
  const { mode, setMode } = useMode()
  const [hasSearched, setHasSearched] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [activeTab, setActiveTab] = useState<Tab>('search')
  const [showModeSelector, setShowModeSelector] = useState(false)
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, key: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }, [])

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  const handleSubmit = async (patient: PatientProfile, topK: number, maxDistance: number | null) => {
    setHasSearched(true)
    await match({ patient, top_k: topK, max_distance_miles: maxDistance })
  }

  const handleDemo = () => {
    setHasSearched(true)
    loadDemo()
  }

  return (
    <div className="min-h-screen" style={{ background: '#FBF7F0' }}>

      {(mode === null || showModeSelector) && (
        <ModeSelector
          currentMode={mode}
          onSelect={m => { setMode(m); setShowModeSelector(false); showToast(m === 'doctor' ? 'Switched to Doctor mode' : m === 'researcher' ? 'Switched to Researcher / Student mode' : 'Switched to Patient mode') }}
        />
      )}

      {/* ── Header ── */}
      <header style={{
        background: '#FFFFFF',
        borderBottom: '1.5px solid #E2D9C8',
        boxShadow: '0 2px 12px rgba(27,58,82,0.08)',
      }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">

            {/* Logo + title */}
            <div className="flex items-center gap-4">
              <img
                src="/images/logo.png"
                alt="Cohort logo"
                style={{ width: 90, height: 90, borderRadius: 20, display: 'block', flexShrink: 0 }}
              />
              <div>
                <h1 style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: '1.5rem',
                  letterSpacing: '-0.02em',
                  color: '#1B3A52',
                  lineHeight: 1,
                }}>
                  Cohort
                </h1>
                <p style={{ color: '#8A9BA8', fontSize: '0.88rem', marginTop: 6 }}>
                  AI-powered clinical trial matching
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {mode && (
                <button
                  onClick={() => setShowModeSelector(true)}
                  aria-label={`Current mode: ${mode === 'doctor' ? 'Doctor' : mode === 'researcher' ? 'Researcher / Student' : 'Patient'} — click to switch`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '8px 18px', borderRadius: 999,
                    background: mode === 'doctor' ? 'rgba(245,182,66,0.12)' : mode === 'researcher' ? 'rgba(16,185,129,0.10)' : 'rgba(27,58,82,0.06)',
                    border: `1px solid ${mode === 'doctor' ? 'rgba(245,182,66,0.45)' : mode === 'researcher' ? 'rgba(16,185,129,0.35)' : 'rgba(27,58,82,0.18)'}`,
                    color: mode === 'doctor' ? '#B8860B' : mode === 'researcher' ? '#065F46' : '#1B3A52',
                    fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = mode === 'doctor' ? 'rgba(245,182,66,0.2)' : mode === 'researcher' ? 'rgba(16,185,129,0.18)' : 'rgba(27,58,82,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = mode === 'doctor' ? 'rgba(245,182,66,0.12)' : mode === 'researcher' ? 'rgba(16,185,129,0.10)' : 'rgba(27,58,82,0.06)' }}
                >
                  {mode === 'doctor' ? (
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                    </svg>
                  ) : mode === 'researcher' ? (
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                    </svg>
                  ) : (
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  )}
                  {mode === 'doctor' ? 'Doctor' : mode === 'researcher' ? 'Researcher / Student' : 'Patient'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab bar ── */}
      <nav style={{
        background: '#1B3A52',
        borderBottom: 'none',
        boxShadow: '0 2px 8px rgba(27,58,82,0.18)',
      }}>
        <div className="max-w-7xl mx-auto px-6" style={{ display: 'flex', gap: 0 }}>
          {(mode === 'researcher' ? RESEARCHER_TABS : PATIENT_DOCTOR_TABS).map(tab => {
            const active = activeTab === tab.id
            const savedBadge = tab.id === 'saved'
              ? (mode === 'researcher' ? resSaves.length : saves.length) || null
              : null
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '14px 22px',
                  border: 'none',
                  borderBottom: active ? '2.5px solid #F5B642' : '2.5px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                  transition: 'all .15s',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  marginBottom: -1.5,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget.style.color = 'rgba(255,255,255,0.8)') }}
                onMouseLeave={e => { if (!active) (e.currentTarget.style.color = 'rgba(255,255,255,0.5)') }}
              >
                {tab.label}
                {savedBadge !== null && (
                  <span style={{
                    background: active ? '#E8701A' : 'rgba(255,255,255,0.2)',
                    color: '#FFFFFF',
                    borderRadius: 999,
                    fontSize: '0.58rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    lineHeight: 1.6,
                    transition: 'background 0.15s',
                  }}>
                    {savedBadge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'how-it-works' ? (
          <HowItWorks />
        ) : activeTab === 'saved' && mode === 'researcher' ? (
          <ResearcherSavedView
            saves={resSaves}
            onUnsave={resUnsave}
            onUpdateNotes={resUpdateNotes}
            onClearAll={resClearAll}
            onGoToSearch={() => setActiveTab('search')}
          />
        ) : activeTab === 'saved' ? (
          <SavedView
            saves={saves}
            mode={mode ?? 'patient'}
            onUnsave={unsave}
            onUpdateLabel={updatePatientLabel}
            onUpdateNotes={updateNotes}
            onClearAll={clearAll}
            onGoToSearch={() => setActiveTab('search')}
          />
        ) : mode === 'researcher' ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '380px 1fr',
            gap: 32,
            height: 'calc(100vh - 221px)',
            overflow: 'hidden',
          }}>
            <div style={{ overflowY: 'auto', height: '100%', paddingBottom: 32 }}>
              <ResearcherForm
                key={resFormKey}
                onSubmit={req => { setResHasSearched(true); resSearch(req) }}
                onDemo={() => { setResHasSearched(true); setResData(RESEARCHER_DEMO_DATA) }}
                loading={resLoading}
              />
            </div>
            <div style={{ overflowY: 'auto', height: '100%', paddingBottom: 32 }}>
              {resHasSearched ? (
                <>
                  <button
                    onClick={() => { setResHasSearched(false); setResFormKey(k => k + 1) }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      marginBottom: 16, marginTop: 12,
                      padding: '5px 10px', borderRadius: 8, border: 'none',
                      background: 'transparent', color: '#1B3A52',
                      fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    New search
                  </button>
                  <SiteResults
                    data={resData} loading={resLoading} error={resError}
                    isSaved={resIsSaved} onSave={resSave} onUnsave={resUnsave}
                  />
                </>
              ) : (
                <ResearcherEmptyState />
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">
            {/* Sidebar */}
            <div className="lg:sticky lg:top-8">
              <PatientForm key={formKey} onSubmit={handleSubmit} loading={loading} />
            </div>
            {/* Results panel */}
            <div style={{ position: 'relative', minHeight: '85vh' }}>
              {!hasSearched && (
                <img
                  src="/images/results-bg.jpg"
                  alt=""
                  aria-hidden="true"
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover', opacity: 0.6,
                    pointerEvents: 'none', borderRadius: 16,
                    zIndex: 0,
                  }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              )}
              <div style={{ position: 'relative', zIndex: 1 }}>
              {!hasSearched ? (
                <EmptyState onDemo={handleDemo} />
              ) : (
                <>
                  <button
                    onClick={() => { setHasSearched(false); setFormKey(k => k + 1) }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      marginBottom: 16,
                      marginTop: 12,
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'transparent',
                      color: '#1B3A52',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'color 0.15s',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#0D1F2D' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#1B3A52' }}
                  >
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    New search
                  </button>
                  <MatchResults
                    data={data} loading={loading} error={error}
                    isSaved={isSaved} onSave={save} onUnsave={unsave}
                    onToast={showToast}
                  />
                </>
              )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1.5px solid #E2D9C8',
        background: '#FFFFFF',
        marginTop: 48,
      }}>
        <div className="max-w-7xl mx-auto px-6 py-5" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          <p style={{ fontSize: '0.85rem', color: '#4A6070', lineHeight: 1.6 }}>
            Portfolio project by{' '}
            <a
              href="https://www.linkedin.com/in/natasha-joshi-88a694285/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontWeight: 700, color: '#1B3A52', textDecoration: 'none', borderBottom: '1.5px solid rgba(27,58,82,0.3)', transition: 'color 0.15s, border-color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#E8701A'; e.currentTarget.style.borderColor = 'rgba(232,112,26,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#1B3A52'; e.currentTarget.style.borderColor = 'rgba(27,58,82,0.3)' }}
            >Natasha Joshi</a>
            <span style={{ margin: '0 8px' }}>·</span>
            Not for clinical use
            <span style={{ margin: '0 8px' }}>·</span>
            Data from{' '}
            <a
              href="https://clinicaltrials.gov"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#1B3A52', fontWeight: 700, textDecoration: 'none' }}
            >
              ClinicalTrials.gov v2 API
            </a>
          </p>
          <a
            href="https://github.com/natashajoshi23/trial-match"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: '0.88rem', fontWeight: 600,
              color: '#4A6070', textDecoration: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget.style.color = '#1B3A52') }}
            onMouseLeave={e => { (e.currentTarget.style.color = '#4A6070') }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .269.18.579.688.481C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            View on GitHub
          </a>
        </div>
      </footer>
      {/* ── Toast ── */}
      {toast && (
        <div key={toast.key} style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999,
          background: '#1B3A52', color: '#FFFFFF',
          padding: '10px 20px', borderRadius: 999,
          fontSize: '0.82rem', fontWeight: 600,
          boxShadow: '0 4px 20px rgba(27,58,82,0.25)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          whiteSpace: 'nowrap',
          animation: 'fadeInDown 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateX(-50%) translateY(-8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
    </div>
  )
}

import type { SavedSite } from './hooks/useResearcherSaves'

function ResearcherSavedView({ saves, onUnsave, onUpdateNotes, onClearAll, onGoToSearch }: {
  saves: SavedSite[]
  onUnsave: (nct_id: string) => void
  onUpdateNotes: (nct_id: string, notes: string) => void
  onClearAll: () => void
  onGoToSearch: () => void
}) {
  if (saves.length === 0) {
    const ghostCards = [
      { title: 'A Phase 3 oncology trial with 3 open sites', loc: 'Boston, MA · 12.4 mi' },
      { title: 'NIH-sponsored cardiovascular study', loc: 'New York, NY · 28.1 mi' },
      { title: 'Interventional drug trial — Investigator contact available', loc: 'Philadelphia, PA · 44.7 mi' },
    ]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {/* Split banner */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          borderRadius: 20, overflow: 'hidden',
          border: '1.5px solid #E2D9C8', background: '#FFFFFF',
        }}>
          {/* Left */}
          <div style={{ padding: '36px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
            <div>
              <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A9BA8', marginBottom: 8 }}>Saved sites</p>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.45rem', color: '#1B3A52', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 10 }}>
                Your trial site shortlist
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#4A6070', lineHeight: 1.7 }}>
                Save trial sites as you search. Build a list of investigators to contact and revisit them anytime.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                'Search for trials by condition, phase, or sponsor type',
                'Save sites with promising investigators or locations',
                'Copy contact info and reach out directly',
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', fontWeight: 800, color: '#C4D0D8', flexShrink: 0, paddingTop: 2 }}>0{i + 1}</span>
                  <p style={{ fontSize: '0.82rem', color: '#4A6070', lineHeight: 1.6 }}>{text}</p>
                </div>
              ))}
            </div>
            <button
              onClick={onGoToSearch}
              style={{
                alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 20px', borderRadius: 999, background: '#1B3A52', color: '#FBF7F0',
                border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '0.01em',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              Find trial sites
            </button>
          </div>
          {/* Right: image */}
          <div style={{ position: 'relative', background: '#F0EBE3', borderLeft: '1.5px solid #E2D9C8', overflow: 'hidden', height: 400 }}>
            <img
              src="/images/lab-work.jpg"
              alt=""
              aria-hidden="true"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 50%', display: 'block' }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        </div>

        {/* Ghost preview cards */}
        <div>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7A8FA0', marginBottom: 10 }}>
            Preview — your saved sites will appear here
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none', userSelect: 'none' }}>
            {ghostCards.map((g, i) => (
              <div key={i} style={{
                background: '#FFFFFF', border: '1px solid #EDE8E0',
                borderLeft: '4px solid #E2D9C8', borderRadius: 12,
                padding: '16px 20px', opacity: 0.45 - i * 0.12,
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#E8EDF2', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 13, width: '72%', background: '#D5DCE3', borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ height: 10, width: '45%', background: '#E8EDF2', borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#B0BEC5', fontWeight: 600, whiteSpace: 'nowrap' }}>{g.loc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1B3A52', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Saved Sites <span style={{ fontWeight: 400, fontSize: '0.85rem', color: '#8A9BA8' }}>({saves.length})</span>
        </h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => {
              const header = 'NCT ID,Title,Phase,Status,Facility,City,State,Country,Distance (mi),PI Name,PI Email,PI Phone,Conditions,Notes'
              const rows = saves.map(s => {
                const pi = [...s.investigators, ...s.site_contacts, ...s.overall_contacts].find(c => c.name)
                const csv = (v: string | null | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`
                return [
                  csv(s.nct_id), csv(s.brief_title),
                  csv(s.phases.map(p => p.replace('PHASE', 'Phase ')).join('/')),
                  csv(s.overall_status), csv(s.nearest_facility),
                  csv(s.nearest_city), csv(s.nearest_state), csv(s.nearest_country),
                  s.nearest_distance_miles ?? '',
                  csv(pi?.name), csv(pi?.email), csv(pi?.phone),
                  csv(s.conditions.join('; ')), csv(s.notes),
                ].join(',')
              })
              const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = `cohort-saved-sites-${new Date().toISOString().slice(0,10)}.csv`
              a.click()
              URL.revokeObjectURL(a.href)
            }}
            style={{ fontSize: '0.75rem', color: '#1B3A52', background: '#EEF2F6', border: '1px solid #D5DCE3', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>
          <button onClick={onClearAll} style={{ fontSize: '0.75rem', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Clear all
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {saves.map(s => (
          <div key={s.nct_id} style={{ background: '#FFFFFF', borderRadius: 14, border: '1.5px solid #E2D9C8', padding: '18px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1B3A52', lineHeight: 1.35, marginBottom: 4 }}>{s.brief_title}</p>
                <p style={{ fontSize: '0.72rem', color: '#8A9BA8' }}>
                  {s.phases.map(p => p.replace('PHASE', 'Ph ')).join(' / ')}
                  {s.nearest_city && ` · ${s.nearest_city}${s.nearest_state ? `, ${s.nearest_state}` : ''}`}
                  {s.nearest_distance_miles != null && ` · ${s.nearest_distance_miles} mi`}
                </p>
              </div>
              <button onClick={() => onUnsave(s.nct_id)} style={{ fontSize: '0.72rem', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, flexShrink: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Remove
              </button>
            </div>
            {/* Contacts summary */}
            {[...s.site_contacts, ...s.overall_contacts, ...s.investigators].slice(0, 2).map((c, i) => (
              c.email && (
                <p key={i} style={{ fontSize: '0.75rem', color: '#4A6070', marginBottom: 2 }}>
                  {c.name && <strong>{c.name} — </strong>}{c.email}
                </p>
              )
            ))}
            <textarea
              placeholder="Notes..."
              value={s.notes}
              onChange={e => onUpdateNotes(s.nct_id, e.target.value)}
              style={{ width: '100%', marginTop: 10, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E2D9C8', fontSize: '0.8rem', color: '#1B3A52', fontFamily: "'Plus Jakarta Sans', sans-serif", resize: 'vertical', minHeight: 60, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <a href={`https://clinicaltrials.gov/study/${s.nct_id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1B3A52', textDecoration: 'none' }}>
                View on ClinicalTrials.gov →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ResearcherEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.025em', color: '#0A1E2C', marginBottom: 12, lineHeight: 1.2 }}>
        Find a Trial to Work In
      </h2>
      <p style={{ color: '#4A6070', fontSize: '0.875rem', maxWidth: 420, lineHeight: 1.7, marginBottom: 28 }}>
        Enter a therapeutic area on the left to find actively recruiting trials near you —
        with direct contact info for investigators and site coordinators.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360, width: '100%' }}>
        {[
          { icon: '📍', text: 'Sorted by distance to nearest site' },
          { icon: '📧', text: 'Investigator emails & phone numbers' },
          { icon: '🔬', text: 'Filter by phase or healthy volunteer trials' },
        ].map(({ icon, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFFFFF', border: '1.5px solid #E2D9C8', borderRadius: 10, padding: '12px 16px', textAlign: 'left' }}>
            <span style={{ fontSize: '1.1rem' }}>{icon}</span>
            <span style={{ fontSize: '0.82rem', color: '#4A6070', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ onDemo }: { onDemo: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <h2 style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 800, fontSize: '1.75rem',
        letterSpacing: '-0.025em', color: '#0A1E2C',
        marginBottom: 12, lineHeight: 1.2,
      }}>
        Find the Right Trial
      </h2>
      <p style={{ color: '#4A6070', fontSize: '0.875rem', maxWidth: 400, lineHeight: 1.7, marginBottom: 28 }}>
        Fill in a patient profile on the left to search actively recruiting trials from ClinicalTrials.gov,
        ranked by semantic similarity, NLP eligibility scoring, and geographic proximity.
      </p>

      <button
        onClick={onDemo}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 22px', borderRadius: 999,
          border: '1.5px solid rgba(232,112,26,0.4)',
          background: 'rgba(232,112,26,0.06)', color: '#C05A00',
          fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.15s',
          marginBottom: 8,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,112,26,0.12)'; e.currentTarget.style.borderColor = 'rgba(232,112,26,0.6)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(232,112,26,0.06)'; e.currentTarget.style.borderColor = 'rgba(232,112,26,0.4)' }}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
        </svg>
        Load demo results
      </button>
      <p style={{ fontSize: '0.68rem', color: '#1B3A52', marginBottom: 48, fontWeight: 600 }}>
        See a sample HER2+ breast cancer search without running the backend
      </p>

      <div style={{
        width: '100%', maxWidth: 560, height: 240, borderRadius: 18, overflow: 'hidden',
        background: '#F0EBE3', flexShrink: 0,
      }}>
        <img
          src="/images/hero.jpg"
          alt="Clinical research"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 1 }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      </div>
    </div>
  )
}
