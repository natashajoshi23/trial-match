import { useState } from 'react'
import type { AppMode } from '../hooks/useMode'
import type { SavedTrial } from '../hooks/useSaves'

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

function ScoreChip({ score, excluded }: { score: number; excluded: boolean }) {
  const color = excluded ? '#C03A2B' : score >= 0.7 ? '#22A85A' : score >= 0.5 ? '#E8701A' : '#8A9BA8'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: '0.73rem', fontWeight: 700,
      fontFamily: "'JetBrains Mono', monospace", color,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: color,
        display: 'inline-block', boxShadow: `0 0 5px ${color}70`,
      }} />
      {Math.round(score * 100)}%
    </span>
  )
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
  const ctUrl = `https://clinicaltrials.gov/study/${saved.nct_id}`
  const phaseLabel = saved.phases
    .map(p => p.replace('PHASE', 'Ph ').replace('_', '/'))
    .join(' / ') || null

  const barColor = saved.hard_excluded
    ? 'linear-gradient(90deg,#C03A2B,#E8701A)'
    : saved.final_score >= 0.7 ? `linear-gradient(90deg,${NAVY},#F5B642)`
    : saved.final_score >= 0.5 ? 'linear-gradient(90deg,#E8701A,#F5B642)'
    : 'linear-gradient(90deg,#E2D9C8,#DDD5C0)'

  const headlineColor = saved.hard_excluded ? '#C03A2B'
    : saved.final_score >= 0.7 ? NAVY
    : saved.final_score >= 0.5 ? '#E8701A'
    : '#8A9BA8'

  return (
    <div style={{
      borderRadius: 14, border: '1.5px solid #E2D9C8',
      background: '#FFFFFF', overflow: 'hidden',
      boxShadow: '0 1px 6px rgba(27,58,82,0.05)',
      opacity: saved.hard_excluded ? 0.82 : 1,
      transition: 'box-shadow 0.15s, border-color 0.15s',
    }}
    onMouseEnter={e => {
      const el = e.currentTarget as HTMLDivElement
      el.style.borderColor = 'rgba(27,58,82,0.28)'
      el.style.boxShadow = '0 3px 14px rgba(27,58,82,0.1)'
    }}
    onMouseLeave={e => {
      const el = e.currentTarget as HTMLDivElement
      el.style.borderColor = '#E2D9C8'
      el.style.boxShadow = '0 1px 6px rgba(27,58,82,0.05)'
    }}
    >
      <div style={{ height: 3, background: barColor }} />
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 7, alignItems: 'center' }}>
              <ScoreChip score={saved.final_score} excluded={saved.hard_excluded} />
              <span style={{
                fontSize: '0.6rem', fontFamily: "'JetBrains Mono', monospace",
                border: '1px solid #E2D9C8', background: '#F7F3EC',
                color: '#8A9BA8', borderRadius: 5, padding: '1px 6px',
              }}>
                {saved.nct_id}
              </span>
              {phaseLabel && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 600,
                  border: '1px solid rgba(27,58,82,0.2)',
                  background: 'rgba(27,58,82,0.06)',
                  color: NAVY, borderRadius: 5, padding: '1px 6px',
                }}>
                  {phaseLabel}
                </span>
              )}
            </div>
            {/* Title */}
            <a
              href={ctUrl} target="_blank" rel="noopener noreferrer"
              aria-label={`${saved.brief_title} — view on ClinicalTrials.gov, opens in new tab`}
              style={{
                fontSize: '0.845rem', fontWeight: 700, color: NAVY,
                textDecoration: 'none', lineHeight: 1.4,
                display: 'block', marginBottom: 4, transition: 'color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget.style.color = '#2D5F7C') }}
              onMouseLeave={e => { (e.currentTarget.style.color = NAVY) }}
            >
              {saved.brief_title}
            </a>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, color: headlineColor, marginBottom: 6 }}>
              {saved.headline}
            </p>
            {mode === 'doctor' && (
              <PatientLabelField value={saved.patientLabel} onChange={onUpdateLabel} />
            )}
            <NotesField value={saved.notes} onChange={onUpdateNotes} />
          </div>
          {/* Remove */}
          <button
            onClick={onUnsave}
            aria-label="Remove trial from saved"
            style={{
              flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
              border: '1.5px solid #E2D9C8', background: '#F7F3EC',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#8A9BA8', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(192,58,43,0.4)'
              e.currentTarget.style.color = '#C03A2B'
              e.currentTarget.style.background = 'rgba(192,58,43,0.06)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#E2D9C8'
              e.currentTarget.style.color = '#8A9BA8'
              e.currentTarget.style.background = '#F7F3EC'
            }}
          >
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 10,
        }}>
          <span style={{ fontSize: '0.62rem', color: '#B0BEC5' }}>
            Saved {timeAgo(saved.savedAt)}
          </span>
          <a
            href={ctUrl} target="_blank" rel="noopener noreferrer"
            aria-label="View on ClinicalTrials.gov, opens in new tab"
            style={{
              fontSize: '0.68rem', fontWeight: 600, color: '#8A9BA8',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget.style.color = NAVY) }}
            onMouseLeave={e => { (e.currentTarget.style.color = '#8A9BA8') }}
          >
            ClinicalTrials.gov
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
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
}

export default function SavedView({ saves, mode, onUnsave, onUpdateLabel, onUpdateNotes, onClearAll }: Props) {
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
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 24px', textAlign: 'center', gap: 16,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'rgba(27,58,82,0.05)',
          border: '1.5px solid rgba(27,58,82,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#8A9BA8" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
        </div>
        <div>
          <p style={{ fontWeight: 700, color: NAVY, fontSize: '0.95rem', marginBottom: 6 }}>
            No saved trials yet
          </p>
          <p style={{ fontSize: '0.82rem', color: '#8A9BA8', maxWidth: 320, lineHeight: 1.65 }}>
            {mode === 'patient'
              ? 'Bookmark trials from the Search tab to review them before your appointment.'
              : 'Save trials while searching, then tag each one with a patient name to build your log here.'}
          </p>
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
