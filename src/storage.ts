import { validDay, validEntry, type Entry } from './impact'

export const STORAGE_KEY = 'scraps.v2'
export interface Saved {
  entries: Entry[]
  people: number
  completedDays: string[]
}

export function emptyLog(): Saved {
  return { entries: [], people: 2, completedDays: [] }
}

export function parseSaved(raw: string, _today: string): Saved {
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object') throw new Error('Invalid saved log')
  const data = value as Record<string, unknown>
  if (!Array.isArray(data.entries)) throw new Error('Invalid entries')
  const seen = new Set<string>()
  const entries = data.entries.filter((e): e is Entry => {
    // A timezone or clock change must not erase a previously valid record.
    if (!validEntry(e) || seen.has(e.id) || (data.sample === true && e.id.startsWith('sample-'))) return false
    seen.add(e.id)
    return true
  })
  const people = typeof data.people === 'number' && Number.isInteger(data.people) && data.people >= 1 && data.people <= 20 ? data.people : 2
  const completedDays = Array.isArray(data.completedDays) ? [...new Set(data.completedDays.filter((d): d is string => validDay(d)))] : []
  return { entries, people, completedDays }
}

export function loadLog(today: string): { state: Saved; warning: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('scraps.v1')
    if (!raw) return { state: emptyLog(), warning: '' }
    const state = parseSaved(raw, today)
    const original = JSON.parse(raw)
    return { state, warning: original.sample !== true && state.entries.length < original.entries.length
      ? 'Some saved entries could not be read and are excluded from totals. The original stored data is kept for recovery.' : '' }
  } catch { return { state: emptyLog(), warning: 'The saved log could not be read. Its stored copy has been kept for recovery.' } }
}

/** Preserve the previous bytes before replacing a malformed or legacy-shaped v2 value. */
export function saveLog(state: Saved, today: string): boolean {
  try {
    const previous = localStorage.getItem(STORAGE_KEY)
    if (previous) {
      let recovered: Saved | null = null
      try { recovered = parseSaved(previous, today) } catch { /* keep a recovery copy below */ }
      if (!recovered || JSON.stringify(JSON.parse(previous)) !== JSON.stringify(recovered)) localStorage.setItem('scraps.recovery', previous)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch { return false }
}
