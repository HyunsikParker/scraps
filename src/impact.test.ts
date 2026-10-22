import { describe, expect, it } from 'vitest'
import { FOODS, PRODUCTS } from './foods'
import { footprint, perYear, summarize, versusAverage, type Entry } from './impact'
import { GROUP_TIPS } from './tips'

const e = (food: string, grams: number, date: string, reason: Entry['reason'] = 'off'): Entry => ({ id: `${food}${date}${grams}`, food, grams, reason, date })

describe('footprint', () => {
  it('uses the per-kilogram factors', () => {
    const bread = footprint({ food: 'bread', grams: 1000 })
    expect(bread.ghg).toBeCloseTo(1.57)
    expect(bread.water).toBeCloseTo(648)
    expect(footprint({ food: 'beef', grams: 150 }).ghg).toBeCloseTo(99.48 * 0.15)
  })

  it('converts cooked rice, pasta and pulses back to dry weight', () => {
    expect(footprint({ food: 'rice', grams: 280 }).ghg).toBeCloseTo(4.45 * 0.1)
    expect(footprint({ food: 'pulses', grams: 250 }).ghg).toBeCloseTo(1.79 * 0.1)
  })

  it('ignores unknown foods and non-positive amounts', () => {
    expect(footprint({ food: 'nope', grams: 100 })).toEqual({ kg: 0, ghg: 0, water: 0 })
    expect(footprint({ food: 'bread', grams: 0 })).toEqual({ kg: 0, ghg: 0, water: 0 })
  })

  it('maps every food to a product with a tip for its group', () => {
    for (const f of FOODS) {
      expect(PRODUCTS[f.product]).toBeDefined()
      expect(GROUP_TIPS[f.group].length).toBeGreaterThan(20)
    }
  })
})

describe('summarize', () => {
  const entries = [
    e('bread', 100, '2026-10-20'),
    e('bread', 50, '2026-10-22', 'leftovers'),
    e('cheese', 50, '2026-10-21'),
    e('apples', 180, '2026-10-10'), // outside the 7 days
  ]
  const s = summarize(entries, '2026-10-22', 7)

  it('totals the last seven days and ranks foods by footprint', () => {
    expect(s.total.kg).toBeCloseTo(0.2)
    expect(s.total.ghg).toBeCloseTo(0.15 * 1.57 + 0.05 * 23.88)
    expect(s.foods.map((f) => [f.food, f.count])).toEqual([['cheese', 1], ['bread', 2]])
    expect(s.reasons.map((r) => r.reason)).toEqual(['off', 'leftovers'])
  })

  it('scales to a year and compares with the UNEP household average', () => {
    expect(perYear(s.total, 7).kg).toBeCloseTo(0.2 * 365 / 7)
    expect(versusAverage(s.total, 7, 2)).toBeCloseTo((0.2 * 365 / 7) / 2 / 79)
  })
})
