import { useState } from 'react'

export type AppMode = 'patient' | 'doctor'

const KEY = 'trial-match-mode'

export function useMode() {
  const [mode, setModeState] = useState<AppMode | null>(() => {
    const v = localStorage.getItem(KEY)
    return v === 'patient' || v === 'doctor' ? v : null
  })

  const setMode = (m: AppMode) => {
    localStorage.setItem(KEY, m)
    setModeState(m)
  }

  return { mode, setMode }
}
