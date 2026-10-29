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

function inspectSaved(raw: string): { state: Saved; excludedEntries: number; reopenedDays: number; unknownDay: boolean } {
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object') throw new Error('Invalid saved log')
  const data = value as Record<string, unknown>
  if (!Array.isArray(data.entries)) throw new Error('Invalid entries')
  const seen = new Map<string, Entry>()
  const uncertainDays = new Set<string>()
  let unknownDay = false
  let excludedEntries = 0
  let removedExample = false
  const reopen = (row: unknown) => {
    const date = row && typeof row === 'object' ? (row as Record<string, unknown>).date : null
    if (validDay(date)) uncertainDays.add(date)
    else unknownDay = true
  }
  const entries = data.entries.filter((e): e is Entry => {
    // A timezone or clock change must not erase a previously valid record.
    if (data.sample === true && e && typeof e.id === 'string' && e.id.startsWith('sample-')) {
      removedExample = true
      return false
    }
    if (!validEntry(e)) {
      excludedEntries++
      reopen(e)
      return false
    }
    const previous = seen.get(e.id)
    if (previous) {
      excludedEntries++
      reopen(previous)
      reopen(e)
      return false
    }
    seen.set(e.id, e)
    return true
  })
  const people = typeof data.people === 'number' && Number.isInteger(data.people) && data.people >= 1 && data.people <= 20 ? data.people : 2
  const markedDays = Array.isArray(data.completedDays) ? [...new Set(data.completedDays.filter((d): d is string => validDay(d)))] : []
  // Missing records cannot establish a zero-waste day or a reduction. If a discarded
  // row has no usable date, there is no sound way to limit that uncertainty to one day.
  const completedDays = unknownDay || removedExample ? [] : markedDays.filter(d => !uncertainDays.has(d))
  return { state: { entries, people, completedDays }, excludedEntries, reopenedDays: markedDays.length - completedDays.length, unknownDay }
}

export function parseSaved(raw: string, _today: string): Saved {
  return inspectSaved(raw).state
}

export function loadLog(_today: string): { state: Saved; warning: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('scraps.v1')
    if (!raw) return { state: emptyLog(), warning: '' }
    const { state, excludedEntries, reopenedDays, unknownDay } = inspectSaved(raw)
    const completionNotice = reopenedDays
      ? (unknownDay ? 'The discarded records could not be dated, so all completed days were reopened. ' : 'Completed days affected by the missing records were reopened. ')
        + 'Replace any missing entries before marking those days complete again. '
      : ''
    const warning = excludedEntries
      ? 'Some saved entries could not be read and are excluded from totals. '
        + completionNotice
        + 'The original stored data is kept for recovery.'
      : ''
    return { state, warning }
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
