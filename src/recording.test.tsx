import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from './App'
import { addDays, compareWeeks, completedInWindow, footprint, isoDay, summarize, validDay, type Entry } from './impact'

import { loadLog, parseSaved, saveLog, STORAGE_KEY } from './storage'

const day = isoDay(new Date())
const entry = (overrides: Partial<Entry> = {}): Entry => ({ id: 'one', food: 'bread', grams: 100, reason: 'off', date: day, ...overrides })

beforeEach(() => localStorage.clear())
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('record integrity', () => {
  it('rejects infinite amounts', () => {
    expect(footprint({ food: 'bread', grams: Infinity })).toEqual({ kg: 0, ghg: 0, water: 0 })
  })
  it('treats object property names as unknown food ids', () => {
    expect(footprint({ food: 'constructor', grams: 100 })).toEqual({ kg: 0, ghg: 0, water: 0 })
  })
  it('excludes invalid rows from totals and recommendations', () => {
    const s = summarize([entry({ food: 'missing' }), entry({ grams: -50 }), entry({ date: '2026-10-32' })], '2026-11-01')
    expect(s.foods).toEqual([])
    expect(s.total).toEqual({ kg: 0, ghg: 0, water: 0 })
  })
  it('keeps the app usable when a stored row is malformed', () => {
    localStorage.setItem('scraps.v1', JSON.stringify({ people: 2, sample: false, entries: [entry(), { food: 'missing', grams: 100, date: day }, null] }))
    expect(() => render(<App />)).not.toThrow()
    expect(screen.getByRole('button', { name: 'Add to my log' })).toBeVisible()
  })
})

describe('honest reporting', () => {
  it('does not annualize an incomplete log as a measured weekly rate', () => {
    localStorage.setItem('scraps.v1', JSON.stringify({ people: 2, sample: false, entries: [entry()] }))
    const { container } = render(<App />)
    expect(container.querySelector('.year')).toBeNull()
  })
  it('uses two people for the labelled two-person example', () => {
    localStorage.setItem('scraps.v1', JSON.stringify({ people: 7, sample: false, entries: [] }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Show a made-up example week' }))
    expect(screen.getByLabelText('People in your household')).toHaveValue(2)
  })
  it('does not store a made-up week in the personal log', () => {
    const view = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Show a made-up example week' }))
    view.unmount()
    const reopened = render(<App />)
    expect(reopened.container.querySelector('.entries tbody tr')).toBeNull()
  })
  it('reports a save failure rather than implying the log is stored', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Full storage') })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add to my log' }))
    expect(screen.getByText(/could not save/i)).toBeVisible()
  })
  it('labels a weight-ranked reason as weight, not frequency', () => {
    localStorage.setItem('scraps.v1', JSON.stringify({ people: 2, sample: false, entries: [entry({ grams: 1000, reason: 'leftovers' }), entry({ id: 'two', grams: 10 }), entry({ id: 'three', grams: 10 })] }))
    render(<App />)
    expect(screen.queryByText(/Most common reason/)).toBeNull()
    expect(screen.getByText(/Most waste by weight/)).toBeVisible()
  })
})


describe('completed weeks', () => {
  const today = '2026-10-24'
  const complete = Array.from({ length: 14 }, (_, i) => addDays(today, -i))
  const rows = [entry({ date: today, grams: 100 }), entry({ id: 'prior', date: '2026-10-17', grams: 200 })]
  it('compares two complete adjacent weeks without counting the boundary twice', () => {
    const result = compareWeeks(rows, complete, today)
    expect(result.ready).toBe(true)
    expect(result.current.total.kg).toBe(0.1)
    expect(result.previous.total.kg).toBe(0.2)
    expect(result.change).toBe(-0.1)
    expect(result.percent).toBe(-50)
  })
  it('keeps a partial week unready even with duplicate completion dates', () => {
    expect(completedInWindow([...complete.slice(1), today, today], today)).toHaveLength(7)
    const result = compareWeeks(rows, [...complete.slice(1), complete[1]], today)
    expect(result.ready).toBe(false)
    expect(result.percent).toBeNull()
  })
  it('permits a completed zero-waste week and avoids percentages from zero', () => {
    const result = compareWeeks([rows[0]], complete, today)
    expect(result.ready).toBe(true)
    expect(result.previous.total.kg).toBe(0)
    expect(result.percent).toBeNull()
    expect(result.change).toBe(0.1)
    expect(compareWeeks([rows[1]], complete, today).percent).toBe(-100)
    expect(compareWeeks([], complete, today).change).toBe(0)
  })
  it('validates leap years and rejects overflow dates', () => {
    expect(validDay('2024-02-29')).toBe(true)
    for (const invalid of ['2025-02-29', '2026-02-30', '2026-13-01', '2026-00-01', '2026-1-01', null]) expect(validDay(invalid)).toBe(false)
  })
})

describe('stored history', () => {
  it('preserves real legacy rows and strips only legacy example rows', () => {
    const raw = JSON.stringify({ sample: true, people: 4, entries: [entry(), entry({ id: 'sample-0' }), null] })
    localStorage.setItem('scraps.v1', raw)
    const loaded = loadLog(day)
    expect(loaded.state.entries).toEqual([entry()])
    expect(loaded.state.people).toBe(4)
    expect(saveLog(loaded.state, day)).toBe(true)
    expect(localStorage.getItem('scraps.v1')).toBe(raw)
  })
  it('backs up corrupt v2 bytes before writing a usable log', () => {
    localStorage.setItem(STORAGE_KEY, '{broken')
    const loaded = loadLog(day)
    expect(loaded.warning).toMatch(/could not be read/)
    expect(saveLog(loaded.state, day)).toBe(true)
    expect(localStorage.getItem('scraps.recovery')).toBe('{broken')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ entries: [], people: 2, completedDays: [] })
  })
  it('deduplicates ids and completed dates and rejects invalid household size', () => {
    const raw = JSON.stringify({ people: 2.5, entries: [entry(), entry({ grams: 300 }), entry({ id: 'bad', grams: null as unknown as number })], completedDays: [day, day, '2026-02-30'] })
    expect(parseSaved(raw, day)).toEqual({ people: 2, entries: [entry()], completedDays: [] })
  })
  it('does not erase valid stored dates when the device clock moves backwards', () => {
    const tomorrow = addDays(day, 1)
    const state = { entries: [entry({ date: tomorrow })], people: 2, completedDays: [tomorrow] }
    expect(parseSaved(JSON.stringify(state), day)).toEqual(state)
    expect(summarize(state.entries, day).total.kg).toBe(0)
  })
})
