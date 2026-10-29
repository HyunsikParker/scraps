// Estimated production footprints of recorded food waste; comparisons are not verified savings.

import { FOOD_BY_ID, PRODUCTS, REASONS, type Group, type Reason } from './foods'

export interface Entry {
  id: string
  food: string // Food id
  grams: number
  reason: Reason
  date: string // YYYY-MM-DD
}

export interface Footprint {
  kg: number // weight thrown away
  ghg: number // kg CO2e it took to produce
  water: number // litres of freshwater it took to produce
}

/** UNEP Food Waste Index Report 2024: households waste 79 kg of food per person per year on average. */
export const UNEP_HOUSEHOLD_KG_PER_PERSON_YEAR = 79

export function footprint(e: Pick<Entry, 'food' | 'grams'>): Footprint {
  if (!Object.hasOwn(FOOD_BY_ID, e.food) || !Number.isFinite(e.grams) || e.grams <= 0) return { kg: 0, ghg: 0, water: 0 }
  const food = FOOD_BY_ID[e.food]
  const product = PRODUCTS[food.product]
  const productKg = e.grams / 1000 / (food.cookedFactor ?? 1)
  return { kg: e.grams / 1000, ghg: productKg * product.ghg, water: productKg * product.water }
}

function add(a: Footprint, b: Footprint): Footprint {
  return { kg: a.kg + b.kg, ghg: a.ghg + b.ghg, water: a.water + b.water }
}

const ZERO: Footprint = { kg: 0, ghg: 0, water: 0 }

export interface FoodTotal extends Footprint {
  food: string
  count: number
}

export interface ReasonTotal extends Footprint {
  reason: Reason
  count: number
}

export interface Summary {
  days: number
  total: Footprint
  foods: FoodTotal[] // biggest footprint first
  reasons: ReasonTotal[]
  groups: Partial<Record<Group, Footprint>>
}

export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`
}

export function validDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1900) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function validEntry(value: unknown): value is Entry {
  if (!value || typeof value !== 'object') return false
  const e = value as Entry
  return typeof e.id === 'string' && e.id.length > 0 && typeof e.food === 'string' && Object.hasOwn(FOOD_BY_ID, e.food)
    && Number.isFinite(e.grams) && e.grams >= 1 && e.grams <= 50_000 && validDay(e.date)
    && REASONS.some((r) => r.id === e.reason)
}

/** Explicitly completed days include days with no waste; absence of an entry is not a zero. */
export function completedInWindow(completed: string[], today: string, days = 7): string[] {
  return Array.from({ length: days }, (_, i) => addDays(today, -i)).filter((d) => completed.includes(d))
}

export function compareWeeks(entries: Entry[], completed: string[], today: string) {
  const current = summarize(entries, today)
  const previousEnd = addDays(today, -7)
  const previous = summarize(entries, previousEnd)
  const ready = completedInWindow(completed, today).length === 7 && completedInWindow(completed, previousEnd).length === 7
  const difference = (a: Footprint, b: Footprint): Footprint => {
    // Equal totals can differ by floating-point noise when entries are grouped differently.
    const delta = (x: number, y: number) => Math.abs(x - y) < 1e-9 ? 0 : x - y
    return { kg: delta(a.kg, b.kg), ghg: delta(a.ghg, b.ghg), water: delta(a.water, b.water) }
  }
  const change = difference(current.total, previous.total).kg
  const currentFoods = new Map(current.foods.map(f => [f.food, f]))
  const previousFoods = new Map(previous.foods.map(f => [f.food, f]))
  const foodChanges = ready ? [...new Set([...currentFoods.keys(), ...previousFoods.keys()])].map(food => {
    const before = previousFoods.get(food) ?? ZERO
    const after = currentFoods.get(food) ?? ZERO
    return { food, previous: before, current: after, delta: difference(after, before) }
  }) : []
  return {
    current, previous, ready, change,
    percent: ready && previous.total.kg > 0 ? change / previous.total.kg * 100 : null,
    delta: ready ? difference(current.total, previous.total) : null,
    foodChanges,
    periods: { previousFrom: addDays(today, -13), previousTo: previousEnd, currentFrom: addDays(today, -6), currentTo: today },
  }
}

/** Totals over the `days` days ending on `today` (inclusive). */
export function summarize(entries: Entry[], today: string, days = 7): Summary {
  const from = addDays(today, -(days - 1))
  const inRange = entries.filter((e) => validEntry(e) && e.date >= from && e.date <= today)
  const foods = new Map<string, FoodTotal>()
  const reasons = new Map<Reason, ReasonTotal>()
  const groups: Partial<Record<Group, Footprint>> = {}
  let total = ZERO
  for (const e of inRange) {
    const f = footprint(e)
    total = add(total, f)
    const ft = foods.get(e.food) ?? { food: e.food, count: 0, ...ZERO }
    foods.set(e.food, { ...add(ft, f), food: e.food, count: ft.count + 1 })
    const rt = reasons.get(e.reason) ?? { reason: e.reason, count: 0, ...ZERO }
    reasons.set(e.reason, { ...add(rt, f), reason: e.reason, count: rt.count + 1 })
    const g = FOOD_BY_ID[e.food]?.group
    if (g) groups[g] = add(groups[g] ?? ZERO, f)
  }
  return {
    days,
    total,
    foods: [...foods.values()].sort((a, b) => b.ghg - a.ghg || b.kg - a.kg),
    reasons: [...reasons.values()].sort((a, b) => b.kg - a.kg),
    groups,
  }
}

/** A footprint measured over `days` days, scaled to a year. */
export function perYear(f: Footprint, days: number): Footprint {
  const k = 365 / Math.max(1, days)
  return { kg: f.kg * k, ghg: f.ghg * k, water: f.water * k }
}

/** How this household's waste per person compares with the UNEP household average (1 = average). */
export function versusAverage(total: Footprint, days: number, people: number): number {
  return perYear(total, days).kg / Math.max(1, people) / UNEP_HOUSEHOLD_KG_PER_PERSON_YEAR
}
