// The footprint of food that was thrown away, and what changing one habit would save over a year.

import { FOOD_BY_ID, PRODUCTS, type Group, type Reason } from './foods'

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
  const food = FOOD_BY_ID[e.food]
  if (!food || !(e.grams > 0)) return { kg: 0, ghg: 0, water: 0 }
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

/** Totals over the `days` days ending on `today` (inclusive). */
export function summarize(entries: Entry[], today: string, days = 7): Summary {
  const from = addDays(today, -(days - 1))
  const inRange = entries.filter((e) => e.date >= from && e.date <= today)
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
