import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import App from './App'
import { addDays, compareWeeks, isoDay, type Entry } from './impact'
import { loadLog, parseSaved, saveLog, STORAGE_KEY } from './storage'

const day = isoDay(new Date())
const complete = Array.from({ length: 14 }, (_, i) => addDays(day, -i))
const entry = (overrides: Partial<Entry> = {}): Entry => ({ id: 'current', date: day, grams: 100, food: 'bread', reason: 'off', ...overrides })
const prior = entry({ id: 'prior', date: addDays(day, -7), grams: 200 })

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('recovery must not turn missing records into a waste reduction', () => {
  it('reopens a known day whose row was discarded, preserving unaffected completed days', () => {
    const raw = JSON.stringify({ entries: [prior, entry({ grams: null as unknown as number })], people: 2, completedDays: complete })
    const recovered = parseSaved(raw, day)
    expect(recovered.entries).toEqual([prior])
    expect(recovered.completedDays).toEqual(complete.filter(d => d !== day))
    const comparison = compareWeeks(recovered.entries, recovered.completedDays, day)
    expect(comparison.ready).toBe(false)
    expect(comparison.percent).toBeNull()
  })

  it('reopens both dates when conflicting entries share an id', () => {
    const other = addDays(day, -3)
    const recovered = parseSaved(JSON.stringify({ entries: [entry(), entry({ date: other, grams: 700 })], people: 2, completedDays: complete }), day)
    expect(recovered.entries).toEqual([entry()])
    expect(recovered.completedDays).toEqual(complete.filter(d => d !== day && d !== other))
  })

  it.each([null, { id: 'bad', date: '2026-02-30' }, { id: 'bad' }])('reopens all completion marks when a discarded row cannot be dated: %j', (bad) => {
    const recovered = parseSaved(JSON.stringify({ entries: [prior, bad], people: 2, completedDays: complete }), day)
    expect(recovered.entries).toEqual([prior])
    expect(recovered.completedDays).toEqual([])
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: [prior, bad], people: 2, completedDays: complete }))
    expect(loadLog(day).warning).toContain('all completed days were reopened')
  })

  it('warns about damaged real rows even when a legacy sample flag is present', () => {
    localStorage.setItem('scraps.v1', JSON.stringify({ sample: true, people: 2, entries: [prior, entry({ grams: -1 }), entry({ id: 'sample-0' })], completedDays: complete }))
    const loaded = loadLog(day)
    expect(loaded.warning).toMatch(/could not be read/)
    expect(loaded.warning).toMatch(/completed days|completion/i)
  })

  it('keeps original bytes for recovery and persists the reopened days across reloads', () => {
    const raw = JSON.stringify({ entries: [prior, entry({ food: 'unknown' })], people: 2, completedDays: complete })
    localStorage.setItem(STORAGE_KEY, raw)
    expect(saveLog(loadLog(day).state, day)).toBe(true)
    expect(localStorage.getItem('scraps.recovery')).toBe(raw)
    const reloaded = loadLog(day).state
    expect(reloaded.completedDays).not.toContain(day)
    expect(compareWeeks(reloaded.entries, reloaded.completedDays, day).ready).toBe(false)
  })

  it('keeps valid zero-waste and future-dated history intact', () => {
    const state = { entries: [prior, entry({ date: addDays(day, 1) })], people: 2, completedDays: [...complete, addDays(day, 1)] }
    expect(parseSaved(JSON.stringify(state), day)).toEqual(state)
    expect(compareWeeks([prior], complete, day).percent).toBe(-100)
  })

  it('does not show a complete zero-waste week, annual scenario or percentage reduction after data loss', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: [prior, entry({ grams: null as unknown as number })], people: 2, completedDays: complete }))
    const { container } = render(<App />)
    expect(screen.getByText(/could not be read/)).toBeVisible()
    expect(container.querySelector('.coverage-status')).toHaveTextContent('6 of 7 days marked complete')
    expect(container.querySelector('.year')).toBeNull()
    expect(container.querySelector('.comparison')).toHaveTextContent('Mark all 14 days complete')
    expect(container.querySelector('.comparison')).not.toHaveTextContent('100% lower')
    expect(container.querySelector('.empty')).not.toHaveTextContent('all 7 days complete')
  })
})
