import MatchCard from './MatchCard'
import type { MatchResponse } from '../types'

interface Props {
  data: MatchResponse | null
  loading: boolean
  error: string | null
}

function Skeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden animate-pulse">
      <div className="h-1 bg-slate-100" />
      <div className="p-5 flex gap-4">
        <div className="w-[68px] h-[68px] rounded-full bg-slate-100 shrink-0" />
        <div className="flex-1 space-y-2.5 pt-1">
          <div className="flex gap-2">
            <div className="h-4 w-20 rounded-md bg-slate-100" />
            <div className="h-4 w-14 rounded-md bg-slate-100" />
            <div className="h-4 w-18 rounded-md bg-slate-100" />
          </div>
          <div className="h-4 w-3/4 rounded bg-slate-100" />
          <div className="h-3 w-1/3 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  )
}

export default function MatchResults({ data, loading, error }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-3 mb-5">
          {[80, 60, 90, 70].map(w => (
            <div key={w} className="h-7 rounded-full bg-slate-200 animate-pulse" style={{ width: w }} />
          ))}
        </div>
        <Skeleton />
        <Skeleton />
        <Skeleton />
        <p className="text-center text-sm text-slate-400 pt-2">
          Fetching trials and computing matches…
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-red-700 font-semibold text-sm">Search failed</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (!data) return null

  const { matches, total_trials_fetched, total_trials_scored } = data
  const eligible = matches.filter(m => !m.hard_excluded)
  const excluded = matches.filter(m => m.hard_excluded)

  return (
    <div className="space-y-5">
      {/* Stats pills */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 shadow-sm">
          <span className="font-bold text-slate-900">{total_trials_fetched}</span> fetched
        </span>
        <span className="text-xs rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 shadow-sm">
          <span className="font-bold text-slate-900">{total_trials_scored}</span> scored
        </span>
        <span className="text-xs rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700 shadow-sm">
          <span className="font-bold">{eligible.length}</span> potentially eligible
        </span>
        {excluded.length > 0 && (
          <span className="text-xs rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-red-600 shadow-sm">
            <span className="font-bold">{excluded.length}</span> excluded
          </span>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="font-semibold text-slate-600 mb-1">No matching trials found</p>
          <p className="text-sm text-slate-400">Try broadening your search or adjusting the distance filter.</p>
        </div>
      ) : (
        <>
          {eligible.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                Potentially eligible — {eligible.length}
              </p>
              {eligible.map((trial, i) => (
                <MatchCard key={trial.nct_id} trial={trial} rank={i} />
              ))}
            </div>
          )}

          {excluded.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Hard exclusions — {excluded.length}
                </p>
                <div className="flex-1 h-px bg-slate-200" />
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
