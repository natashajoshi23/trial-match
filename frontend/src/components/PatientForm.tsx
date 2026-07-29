import { useState, FormEvent } from 'react'
import TagInput from './TagInput'
import type { PatientProfile } from '../types'

interface Props {
  onSubmit: (patient: PatientProfile, topK: number, maxDistance: number | null) => void
  loading: boolean
}

const EMPTY: PatientProfile = {
  age: 45,
  sex: 'female',
  condition: '',
  zip_code: '',
  ecog_status: null,
  biomarkers: [],
  current_medications: [],
  prior_treatments: [],
  comorbidities: [],
  additional_notes: '',
}

const DEMO: PatientProfile = {
  age: 52,
  sex: 'female',
  condition: 'HER2-positive breast cancer',
  zip_code: '10001',
  ecog_status: 1,
  biomarkers: ['HER2+', 'ER-', 'PR-'],
  current_medications: ['trastuzumab'],
  prior_treatments: ['surgery', 'radiation'],
  comorbidities: ['hypertension'],
  additional_notes: '',
}

const ECOG_LABELS = ['Fully active', 'Restricted, ambulatory', 'Ambulatory, self-care only', 'Limited self-care', 'Completely disabled']

function inputCls(extra = '') {
  return `w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400
    focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-colors ${extra}`
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{children}</p>
  )
}

export default function PatientForm({ onSubmit, loading }: Props) {
  const [p, setP] = useState<PatientProfile>(EMPTY)
  const [topK, setTopK] = useState(10)
  const [maxDist, setMaxDist] = useState<string>('')
  const [expanded, setExpanded] = useState(false)

  const set = <K extends keyof PatientProfile>(k: K, v: PatientProfile[K]) =>
    setP(prev => ({ ...prev, [k]: v }))

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(p, topK, maxDist ? Number(maxDist) : null)
  }

  const loadDemo = () => { setP(DEMO); setMaxDist('') }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Accent bar */}
      <div className="h-1" style={{ background: 'linear-gradient(90deg, #0d9488, #3b82f6)' }} />

      <div className="p-5 space-y-5">
        {/* Title */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Patient Profile</h2>
            <p className="text-xs text-slate-400 mt-0.5">Required fields marked *</p>
          </div>
          <button
            type="button"
            onClick={loadDemo}
            className="text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-full transition-colors shrink-0"
          >
            Load demo
          </button>
        </div>

        {/* Core section */}
        <div className="space-y-3">
          <SectionLabel>Core information</SectionLabel>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Age *</label>
              <input
                type="number"
                required
                min={0}
                max={120}
                value={p.age}
                onChange={e => set('age', Number(e.target.value))}
                className={inputCls()}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Sex *</label>
              <select
                value={p.sex}
                onChange={e => set('sex', e.target.value as PatientProfile['sex'])}
                className={inputCls()}
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Condition *</label>
            <input
              type="text"
              required
              placeholder="e.g. HER2-positive breast cancer"
              value={p.condition}
              onChange={e => set('condition', e.target.value)}
              className={inputCls()}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">ZIP Code *</label>
            <input
              type="text"
              required
              placeholder="e.g. 10001"
              pattern="[0-9]{5}(-[0-9]{4})?"
              value={p.zip_code}
              onChange={e => set('zip_code', e.target.value)}
              className={inputCls()}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* Clinical data — collapsible */}
        <div>
          <button
            type="button"
            onClick={() => setExpanded(x => !x)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-700 w-full group transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform text-slate-400 group-hover:text-slate-600 ${expanded ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            Clinical details
            <span className="ml-auto text-[10px] text-slate-400 font-normal">{expanded ? 'collapse' : 'expand'}</span>
          </button>

          {expanded && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">ECOG Performance Status</label>
                <select
                  value={p.ecog_status ?? ''}
                  onChange={e => set('ecog_status', e.target.value === '' ? null : Number(e.target.value))}
                  className={inputCls()}
                >
                  <option value="">Not reported</option>
                  {[0, 1, 2, 3, 4].map(n => (
                    <option key={n} value={n}>{n} — {ECOG_LABELS[n]}</option>
                  ))}
                </select>
              </div>

              <TagInput label="Biomarkers" placeholder="HER2+, ER-, BRCA1 …" tags={p.biomarkers} onChange={v => set('biomarkers', v)} />
              <TagInput label="Current Medications" placeholder="trastuzumab, letrozole …" tags={p.current_medications} onChange={v => set('current_medications', v)} />
              <TagInput label="Prior Treatments" placeholder="surgery, radiation …" tags={p.prior_treatments} onChange={v => set('prior_treatments', v)} />
              <TagInput label="Comorbidities" placeholder="hypertension, diabetes …" tags={p.comorbidities} onChange={v => set('comorbidities', v)} />

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Additional Notes</label>
                <textarea
                  rows={2}
                  placeholder="Any other relevant clinical details…"
                  value={p.additional_notes}
                  onChange={e => set('additional_notes', e.target.value)}
                  className={inputCls('resize-none')}
                />
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* Search options */}
        <div className="space-y-3">
          <SectionLabel>Search options</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Max results</label>
              <select value={topK} onChange={e => setTopK(Number(e.target.value))} className={inputCls()}>
                {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} trials</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Distance (mi)</label>
              <input
                type="number"
                min={0}
                placeholder="No limit"
                value={maxDist}
                onChange={e => setMaxDist(e.target.value)}
                className={inputCls()}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{
            background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0d9488, #0891b2)',
            boxShadow: loading ? 'none' : '0 2px 12px rgba(13,148,136,0.35)',
          }}
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching trials…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Find Trials
            </>
          )}
        </button>
      </div>
    </form>
  )
}
