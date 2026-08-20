import { useState } from 'react'
import type { AppMode } from '../hooks/useMode'
import type { SavedTrial } from '../hooks/useSaves'
import MatchCard from './MatchCard'

const NAVY = '#1B3A52'

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}


function PatientLabelField({ value, onChange }: {
  value: string
  onChange: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const commit = () => {
    onChange(draft.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: '0.62rem', fontWeight: 700, color: '#8A9BA8',
          letterSpacing: '0.06em', textTransform: 'uppercase' as const,
        }}>Patient</span>
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') { setDraft(value); setEditing(false) }
          }}
          placeholder="Enter patient name..."
          aria-label="Patient name"
          style={{
            fontSize: '0.78rem', padding: '3px 8px',
            borderRadius: 6, border: `1.5px solid ${NAVY}`,
            outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: NAVY, background: '#FFFFFF', width: 170,
          }}
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        fontSize: '0.62rem', fontWeight: 700, color: '#8A9BA8',
        letterSpacing: '0.06em', textTransform: 'uppercase' as const,
      }}>Patient</span>
      {value ? (
        <button
          onClick={() => { setDraft(value); setEditing(true) }}
          aria-label={`Edit patient name: ${value}`}
          style={{
            fontSize: '0.73rem', fontWeight: 600, color: NAVY,
            background: 'rgba(27,58,82,0.08)',
            border: '1px solid rgba(27,58,82,0.2)',
            borderRadius: 999, padding: '2px 10px',
            cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
            display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(27,58,82,0.13)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(27,58,82,0.08)' }}
        >
          {value}
          <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
        </button>
      ) : (
        <button
          onClick={() => setEditing(true)}
          aria-label="Add patient name"
          style={{
            fontSize: '0.7rem', color: '#8A9BA8', background: 'none',
            border: '1px dashed #DDD5C0', borderRadius: 999, padding: '2px 10px',
            cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#B0BEC5'; e.currentTarget.style.color = '#4A6070' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDD5C0'; e.currentTarget.style.color = '#8A9BA8' }}
        >
          + Add patient name
        </button>
      )}
    </div>
  )
}

function NotesField({ value, onChange }: {
  value: string
  onChange: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const commit = () => {
    onChange(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ marginTop: 8 }}>
        <textarea
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Escape') { setDraft(value); setEditing(false) }
          }}
          placeholder="e.g. Ask about washout period, check insurance coverage…"
          rows={2}
          aria-label="Trial note"
          style={{
            width: '100%', fontSize: '0.78rem',
            padding: '7px 10px', borderRadius: 8,
            border: `1.5px solid ${NAVY}`,
            outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: NAVY, background: '#FFFFFF',
            resize: 'none', lineHeight: 1.5,
            boxSizing: 'border-box',
          }}
        />
        <p style={{ fontSize: '0.58rem', color: '#8A9BA8', marginTop: 3 }}>
          Click away to save · Esc to cancel
        </p>
      </div>
    )
  }

  if (value) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label="Edit note"
        onClick={() => { setDraft(value); setEditing(true) }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { setDraft(value); setEditing(true) } }}
        style={{
          marginTop: 8, padding: '7px 10px', borderRadius: 8,
          background: '#F7F3EC', border: '1px solid #E2D9C8',
          cursor: 'pointer', transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget.style.borderColor = 'rgba(27,58,82,0.3)') }}
        onMouseLeave={e => { (e.currentTarget.style.borderColor = '#E2D9C8') }}
      >
        <p style={{ fontSize: '0.58rem', fontWeight: 700, color: '#8A9BA8', marginBottom: 3, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
          Note
        </p>
        <p style={{ fontSize: '0.75rem', color: '#4A6070', lineHeight: 1.5 }}>{value}</p>
      </div>
    )
  }

  return (
    <button
      onClick={() => { setDraft(''); setEditing(true) }}
      aria-label="Add note to this trial"
      style={{
        marginTop: 8, fontSize: '0.7rem', color: '#8A9BA8',
        background: 'none', border: '1px dashed #DDD5C0',
        borderRadius: 8, padding: '5px 10px',
        cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
        transition: 'all 0.15s', width: '100%', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 5,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#B0BEC5'; e.currentTarget.style.color = '#4A6070' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDD5C0'; e.currentTarget.style.color = '#8A9BA8' }}
    >
      <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      Add note
    </button>
  )
}

function SavedCard({ saved, mode, onUnsave, onUpdateLabel, onUpdateNotes }: {
  saved: SavedTrial
  mode: AppMode
  onUnsave: () => void
  onUpdateLabel: (label: string) => void
  onUpdateNotes: (notes: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <MatchCard
        trial={saved}
        rank={0}
        isSaved={true}
        onSaveToggle={onUnsave}
      />
      {/* Notes / patient label below the card */}
      <div style={{
        background: '#FAFAF8', border: '1px solid #E2D9C8', borderTop: 'none',
        borderRadius: '0 0 12px 12px', padding: '10px 18px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          {mode === 'doctor' && (
            <PatientLabelField value={saved.patientLabel} onChange={onUpdateLabel} />
          )}
          <span style={{ fontSize: '0.62rem', color: '#B8C4CC', marginLeft: 'auto' }}>
            Saved {timeAgo(saved.savedAt)}
          </span>
        </div>
        <NotesField value={saved.notes} onChange={onUpdateNotes} />
      </div>
    </div>
  )
}

interface Props {
  saves: SavedTrial[]
  mode: AppMode
  onUnsave: (nct_id: string) => void
  onUpdateLabel: (nct_id: string, label: string) => void
  onUpdateNotes: (nct_id: string, notes: string) => void
  onClearAll: () => void
  onGoToSearch: () => void
}

export default function SavedView({ saves, mode, onUnsave, onUpdateLabel, onUpdateNotes, onClearAll, onGoToSearch }: Props) {
  const [patientFilter, setPatientFilter] = useState<string>('all')

  const patientNames = mode === 'doctor'
    ? [...new Set(saves.map(s => s.patientLabel).filter(Boolean))].sort()
    : []

  const untaggedCount = saves.filter(s => !s.patientLabel).length

  const visibleSaves = patientFilter === '__untagged__'
    ? saves.filter(s => !s.patientLabel)
    : patientFilter === 'all'
    ? saves
    : saves.filter(s => s.patientLabel === patientFilter)

  const handleDownloadSummary = () => {
    const win = window.open('', '_blank')
    if (!win) {
      alert('Please allow pop-ups to open the summary.')
      return
    }

    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const trialsHtml = visibleSaves.map(saved => {
      const phaseLabelStr = saved.phases.map(p => p.replace('PHASE', 'Ph ').replace('_', '/')).join(' / ')
      const pct = Math.round(saved.final_score * 100)
      const scoreClass = saved.hard_excluded ? 'badge-excluded' : pct >= 70 ? 'badge-high' : pct >= 50 ? 'badge-mid' : 'badge-low'
      return `
        <div class="trial">
          <div class="badges">
            <span class="badge ${scoreClass}">${pct}%</span>
            <span class="badge badge-mono">${saved.nct_id}</span>
            ${phaseLabelStr ? `<span class="badge">${phaseLabelStr}</span>` : ''}
            ${saved.hard_excluded ? '<span class="badge badge-excluded">Excluded</span>' : ''}
          </div>
          <h3><a href="https://clinicaltrials.gov/study/${saved.nct_id}" target="_blank">${saved.brief_title}</a></h3>
          <p class="headline">${saved.headline}</p>
          ${mode === 'doctor' && saved.patientLabel ? `<p class="patient"><strong>Patient:</strong> ${saved.patientLabel}</p>` : ''}
          ${saved.notes ? `<div class="notes"><strong>Note:</strong> ${saved.notes}</div>` : ''}
          <p class="url">
            <a href="https://clinicaltrials.gov/study/${saved.nct_id}" target="_blank">clinicaltrials.gov/study/${saved.nct_id}</a>
            <span class="sep">·</span>Saved ${timeAgo(saved.savedAt)}
          </p>
        </div>`
    }).join('\n')

    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Clinical Trial Summary — ${dateStr}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Georgia,'Times New Roman',serif;max-width:720px;margin:48px auto;padding:0 24px;color:#1B3A52;font-size:14px;line-height:1.6}
    header{margin-bottom:36px;padding-bottom:20px;border-bottom:2px solid #1B3A52}
    header h1{font-size:22px;font-weight:700;letter-spacing:-0.01em;margin-bottom:6px}
    header p{font-size:12px;color:#8A9BA8}
    .trial{margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid #E2D9C8;page-break-inside:avoid}
    .trial:last-child{border-bottom:none}
    .badges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
    .badge{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;border:1px solid #E2D9C8;background:#F7F3EC;color:#8A9BA8}
    .badge-mono{font-family:'Courier New',monospace}
    .badge-high{background:#1B3A52;color:#fff;border-color:#1B3A52}
    .badge-mid{background:#E8701A;color:#fff;border-color:#E8701A}
    .badge-low{background:#8A9BA8;color:#fff;border-color:#8A9BA8}
    .badge-excluded{background:#C03A2B;color:#fff;border-color:#C03A2B}
    h3{font-size:15px;margin-bottom:5px}
    h3 a{color:#1B3A52;text-decoration:none}
    h3 a:hover{text-decoration:underline}
    .headline{font-size:12px;font-weight:600;color:#4A6070;margin-bottom:8px}
    .patient{font-size:12px;color:#4A6070;margin-bottom:6px}
    .notes{font-size:12px;background:#F7F3EC;border:1px solid #E2D9C8;padding:8px 12px;border-radius:6px;color:#4A6070;margin:6px 0 8px}
    .url{font-size:11px;color:#8A9BA8}
    .url a{color:#1B3A52}
    .sep{margin:0 6px}
    footer{margin-top:40px;padding-top:20px;border-top:2px solid #E2D9C8;text-align:center;font-size:11px;color:#C03A2B}
    @media print{body{margin:0;padding:16px}.trial{page-break-inside:avoid}}
  </style>
</head>
<body>
  <header>
    <h1>Cohort — Trial Summary</h1>
    <p>${dateStr} · ${visibleSaves.length} saved trial${visibleSaves.length !== 1 ? 's' : ''}${mode === 'doctor' ? ' · Doctor view' : ''}</p>
  </header>
  ${trialsHtml}
  <footer>&#9888; Not for clinical use · Portfolio project by Natasha Joshi · Data from ClinicalTrials.gov v2 API</footer>
  <script>setTimeout(function(){window.print()},400)<\/script>
</body>
</html>`)
    win.document.close()
  }

  if (saves.length === 0) {
    const steps = mode === 'doctor'
      ? [
          { n: '01', text: 'Run a search with a patient\'s primary condition and biomarkers' },
          { n: '02', text: 'Bookmark trials using the ribbon icon on each result card' },
          { n: '03', text: 'Tag each saved trial with a patient name to build your log' },
        ]
      : [
          { n: '01', text: 'Fill in your profile on the Search tab — condition, age, biomarkers' },
          { n: '02', text: 'Bookmark trials that look relevant using the ribbon icon' },
          { n: '03', text: 'Bring this list to your next appointment to discuss with your doctor' },
        ]

    // Ghost card rows for the preview
    const ghostCards = [
      { pct: 87, phase: 'Ph 3', w1: '72%', w2: '55%', w3: '88%', color: '#22A85A' },
      { pct: 74, phase: 'Ph 2', w1: '60%', w2: '80%', w3: '45%', color: '#22A85A' },
      { pct: 54, phase: 'Ph 2', w1: '78%', w2: '50%', w3: '65%', color: '#E8701A' },
    ]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Top banner */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 0, borderRadius: 20, overflow: 'hidden',
          border: '1.5px solid #E2D9C8', background: '#FFFFFF',
        }}>
          {/* Left: text */}
          <div style={{ padding: '36px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
            <div>
              <p style={{
                fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: '#8A9BA8', marginBottom: 8,
              }}>Saved trials</p>
              <h2 style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 800, fontSize: '1.45rem',
                color: NAVY, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 10,
              }}>
                {mode === 'doctor' ? 'Your patient trial log' : 'Your shortlist'}
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#4A6070', lineHeight: 1.7 }}>
                {mode === 'doctor'
                  ? 'Save and tag trials as you search. Build a per-patient shortlist you can review before each consultation.'
                  : 'Bookmark trials that match your profile and bring the list to your next appointment.'}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {steps.map(s => (
                <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.68rem', fontWeight: 800,
                    color: '#C4D0D8', flexShrink: 0, paddingTop: 2,
                  }}>{s.n}</span>
                  <p style={{ fontSize: '0.82rem', color: '#4A6070', lineHeight: 1.6 }}>{s.text}</p>
                </div>
              ))}
            </div>
            <button
              onClick={onGoToSearch}
              style={{
                alignSelf: 'flex-start',
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 20px', borderRadius: 999,
                background: NAVY, color: '#FBF7F0',
                border: 'none', cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: 700,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: '0.01em', transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              Start a search
            </button>
          </div>

          {/* Right: image */}
          <div style={{ position: 'relative', background: '#F0EBE3', borderLeft: '1.5px solid #E2D9C8', overflow: 'hidden', height: 560, minHeight: 'unset' }}>
            <img
              src={mode === 'doctor' ? '/images/saved-doctor.jpg' : '/images/saved-patient.jpg'}
              alt=""
              aria-hidden="true"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        </div>

        {/* Ghost preview cards */}
        <div>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7A8FA0', marginBottom: 10 }}>
            Preview — your saved trials will appear here
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none', userSelect: 'none' }}>
            {ghostCards.map((g, i) => (
              <div key={i} style={{
                background: '#FFFFFF', border: '1px solid #EDE8E0',
                borderLeft: `4px solid #E2D9C8`,
                borderRadius: 12, padding: '16px 20px',
                opacity: 0.45 - i * 0.12,
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                {/* Ghost ring */}
                <div style={{
                  width: 52, height: 52, flexShrink: 0,
                  borderRadius: '50%', border: '5px solid #EDE8E0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#FAFAF8',
                }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: g.color, fontFamily: "'JetBrains Mono', monospace" }}>
                    {g.pct}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Title placeholder */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ height: 13, background: '#E2D9C8', borderRadius: 4, width: g.w1 }} />
                    <div style={{ height: 13, background: '#E2D9C8', borderRadius: 4, width: g.w3 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ height: 18, background: '#EDE8E0', borderRadius: 4, width: 44 }} />
                    <div style={{ height: 18, background: '#EDE8E0', borderRadius: 4, width: 80 }} />
                    <div style={{ height: 18, background: '#EDE8E0', borderRadius: 4, width: g.w2 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700, fontSize: '1.05rem', color: NAVY, marginBottom: 2,
          }}>
            {saves.length} saved {saves.length === 1 ? 'trial' : 'trials'}
          </h2>
          <p style={{ fontSize: '0.7rem', color: '#8A9BA8' }}>
            Stored locally in this browser
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={handleDownloadSummary}
            aria-label="Download or print summary of saved trials"
            style={{
              fontSize: '0.72rem', fontWeight: 600, color: NAVY,
              background: 'none', border: `1px solid rgba(27,58,82,0.25)`,
              borderRadius: 999, padding: '5px 12px', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(27,58,82,0.06)'
              e.currentTarget.style.borderColor = 'rgba(27,58,82,0.4)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'none'
              e.currentTarget.style.borderColor = 'rgba(27,58,82,0.25)'
            }}
          >
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download summary
          </button>
          <button
            onClick={onClearAll}
            aria-label="Clear all saved trials"
            style={{
              fontSize: '0.72rem', fontWeight: 600, color: '#C03A2B',
              background: 'none', border: '1px solid rgba(192,58,43,0.25)',
              borderRadius: 999, padding: '5px 12px', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(192,58,43,0.06)'
              e.currentTarget.style.borderColor = 'rgba(192,58,43,0.4)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'none'
              e.currentTarget.style.borderColor = 'rgba(192,58,43,0.25)'
            }}
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Doctor: patient cards summary */}
      {mode === 'doctor' && patientNames.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 8,
        }}>
          {patientNames.map(name => {
            const count = saves.filter(s => s.patientLabel === name).length
            const active = patientFilter === name
            return (
              <button
                key={name}
                onClick={() => setPatientFilter(active ? 'all' : name)}
                aria-label={`Filter by patient: ${name} (${count} trial${count !== 1 ? 's' : ''})`}
                aria-pressed={active}
                style={{
                  padding: '12px 14px', borderRadius: 12, textAlign: 'left',
                  border: active ? `1.5px solid ${NAVY}` : '1.5px solid #E2D9C8',
                  background: active ? 'rgba(27,58,82,0.06)' : '#FFFFFF',
                  cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: '0 1px 4px rgba(27,58,82,0.04)',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.borderColor = 'rgba(27,58,82,0.3)'
                    e.currentTarget.style.boxShadow = '0 3px 12px rgba(27,58,82,0.1)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.borderColor = '#E2D9C8'
                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(27,58,82,0.04)'
                  }
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: 8,
                  background: active ? 'rgba(27,58,82,0.12)' : 'rgba(27,58,82,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 8,
                }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={NAVY} strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: NAVY, marginBottom: 2 }}>
                  {name}
                </p>
                <p style={{ fontSize: '0.62rem', color: '#8A9BA8' }}>
                  {count} trial{count !== 1 ? 's' : ''}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {/* Doctor: filter chips row */}
      {mode === 'doctor' && (patientNames.length > 0 || untaggedCount > 0) && (
        <div
          role="group"
          aria-label="Filter saved trials by patient"
          style={{
            display: 'flex', gap: 6, flexWrap: 'wrap',
            padding: '10px 14px',
            background: '#FFFFFF', border: '1.5px solid #E2D9C8',
            borderRadius: 12,
          }}>
          <span style={{
            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase' as const, color: '#8A9BA8',
            alignSelf: 'center', marginRight: 4,
          }}>
            Filter
          </span>
          {[
            { key: 'all', label: 'All', count: saves.length },
            ...patientNames.map(n => ({ key: n, label: n, count: saves.filter(s => s.patientLabel === n).length })),
            ...(untaggedCount > 0 ? [{ key: '__untagged__', label: 'Untagged', count: untaggedCount }] : []),
          ].map(({ key, label, count }) => {
            const active = patientFilter === key
            return (
              <button
                key={key}
                onClick={() => setPatientFilter(key)}
                aria-pressed={active}
                style={{
                  padding: '4px 11px', borderRadius: 999,
                  border: active ? '1.5px solid #1B3A52' : '1.5px solid #DDD5C0',
                  background: active ? 'rgba(27,58,82,0.09)' : '#FFFFFF',
                  color: active ? NAVY : '#8A9BA8',
                  fontSize: '0.7rem', fontWeight: active ? 700 : 500,
                  cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                  display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'all 0.12s',
                }}
              >
                {label}
                <span style={{
                  fontSize: '0.58rem',
                  background: active ? 'rgba(27,58,82,0.15)' : '#F7F3EC',
                  borderRadius: 999, padding: '0 5px',
                  color: active ? NAVY : '#8A9BA8',
                }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Trial cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visibleSaves.map(saved => (
          <SavedCard
            key={saved.nct_id}
            saved={saved}
            mode={mode}
            onUnsave={() => onUnsave(saved.nct_id)}
            onUpdateLabel={label => onUpdateLabel(saved.nct_id, label)}
            onUpdateNotes={notes => onUpdateNotes(saved.nct_id, notes)}
          />
        ))}
      </div>
    </div>
  )
}
