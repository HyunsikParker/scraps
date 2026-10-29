import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { addDays, compareWeeks, type Entry } from './impact'
import Comparison from './Comparison'

const day = '2026-10-30'
const complete = Array.from({ length: 14 }, (_, i) => addDays(day, -i))
const row = (food: string, grams: number, offset: number): Entry => ({ id: `${food}-${grams}-${offset}`, food, grams, date: addDays(day, offset), reason: 'off' })
afterEach(cleanup)

describe('environmental comparison', () => {
  it('does not confuse less weight with less estimated production footprint', () => {
    const result = compareWeeks([row('bread', 1000, -7), row('beef', 100, 0)], complete, day)
    expect(result.change).toBeCloseTo(-0.9)
    expect(result.delta?.ghg).toBeCloseTo(8.378)
    expect(result.delta?.water).toBeCloseTo(-502.9)
    render(<Comparison comparison={result} />)
    expect(screen.getByText('8.38 kg CO2e higher')).toBeVisible()
    expect(screen.getByText('502.9 L lower')).toBeVisible()
    expect(screen.getByText(/moved in different directions/)).toBeVisible()
    expect(screen.getByText(/not proven emissions or water savings/)).toBeVisible()
  })
  it('includes both new and disappeared foods and reconciles each metric', () => {
    const result = compareWeeks([row('rice', 560, -13), row('beef', 100, -7), row('rice', 280, -6), row('cheese', 50, 0), row('nuts', 300, -14), row('beef', 900, 1)], complete, day)
    expect(result.foodChanges.map(f => f.food).sort()).toEqual(['beef', 'cheese', 'rice'])
    expect(result.foodChanges.find(f => f.food === 'rice')?.delta.ghg).toBeCloseTo(-0.445)
    expect(result.foodChanges.find(f => f.food === 'beef')?.current.kg).toBe(0)
    expect(result.foodChanges.find(f => f.food === 'cheese')?.previous.kg).toBe(0)
    for (const metric of ['kg', 'ghg', 'water'] as const) {
      expect(result.foodChanges.reduce((sum, f) => sum + f.delta[metric], 0)).toBeCloseTo(result.delta![metric], 9)
    }
  })
  it('withholds derived deltas and attribution when any date is incomplete', () => {
    const result = compareWeeks([row('bread', 1000, -7)], complete.slice(1), day)
    expect(result.delta).toBeNull()
    expect(result.foodChanges).toEqual([])
    render(<Comparison comparison={result} />)
    expect(screen.queryByText(/CO2e/)).toBeNull()
    expect(screen.getByText(/Missing days/)).toBeVisible()
  })
  it('allows complete zero-waste weeks without inventing a percentage', () => {
    const result = compareWeeks([], complete, day)
    render(<Comparison comparison={result} />)
    expect(screen.getAllByText('Unchanged')).toHaveLength(2)
    expect(screen.queryByText('See what changed by food')).toBeNull()
    expect(result.percent).toBeNull()
  })
  it('shows a small nonzero footprint rather than rounding it to zero', () => {
    render(<Comparison comparison={compareWeeks([row('onions', 1, 0)], complete, day)} />)
    expect(screen.getAllByText('<0.01 kg CO2e higher')[0]).toBeVisible()
    expect(screen.getByText('<0.1 L higher')).toBeVisible()
    expect(screen.getByText(/no percentage is calculated from a zero baseline/)).toBeVisible()
  })
  it('treats equivalent portions as unchanged despite floating-point grouping', () => {
    const result = compareWeeks([row('bread', 100, -7), row('bread', 200, -7), row('bread', 300, 0)], complete, day)
    expect(result.delta).toEqual({ kg: 0, ghg: 0, water: 0 })
    expect(result.foodChanges[0].delta).toEqual({ kg: 0, ghg: 0, water: 0 })
  })
})
