import { useEffect, useMemo, useState } from 'react'
import { FOOD_BY_ID, FOODS, PRODUCTS, REASONS, type Reason } from './foods'
import { addDays, footprint, isoDay, perYear, summarize, UNEP_HOUSEHOLD_KG_PER_PERSON_YEAR, versusAverage, type Entry, type Summary } from './impact'
import { GROUP_TIPS, REASON_TIPS } from './tips'

interface Saved {
  entries: Entry[]
  people: number
  sample: boolean
}

const KEY = 'scraps.v1'
type Measure = 'ghg' | 'water' | 'kg'

function today(): string {
  return isoDay(new Date())
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as Saved
      if (Array.isArray(s.entries)) return { entries: s.entries, people: s.people || 2, sample: !!s.sample }
    }
  } catch {
    // Storage blocked: start empty.
  }
  return { entries: [], people: 2, sample: false }
}

/** A made-up week for a two-person household, dated relative to today. */
function sampleWeek(): Entry[] {
  const t = today()
  const rows: [number, string, number, Reason][] = [
    [-6, 'bread', 105, 'off'],
    [-6, 'salad', 100, 'off'],
    [-5, 'rice', 320, 'too-much'],
    [-4, 'milk', 400, 'date'],
    [-4, 'bananas', 240, 'off'],
    [-3, 'chicken', 120, 'leftovers'],
    [-2, 'cheese', 50, 'off'],
    [-2, 'potatoes', 340, 'too-much'],
    [-1, 'bread', 140, 'off'],
    [-1, 'beef', 90, 'leftovers'],
    [0, 'tomatoes', 120, 'off'],
  ]
  return rows.map(([d, food, grams, reason], k) => ({ id: `sample-${k}`, food, grams, reason, date: addDays(t, d) }))
}

function fmt(n: number, digits = 1): string {
  if (n >= 100) return Math.round(n).toLocaleString('en-US')
  return n.toFixed(n < 10 ? digits : 0)
}

function measureText(m: Measure, v: number): string {
  if (m === 'ghg') return `${fmt(v)} kg CO2e`
  if (m === 'water') return `${fmt(v, 0)} L water`
  return `${fmt(v * 1000, 0)} g`
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

const IRREGULAR: Record<string, string> = { potato: 'potatoes', tomato: 'tomatoes' }

function portions(n: number, label: string): string {
  return plural(n, label, IRREGULAR[label] ?? (/(s|sh|ch|x)$/.test(label) ? `${label}es` : `${label}s`))
}

export default function App() {
  const [state, setState] = useState<Saved>(load)
  const [foodId, setFoodId] = useState('bread')
  const [count, setCount] = useState(1)
  const [grams, setGrams] = useState('')
  const [reason, setReason] = useState<Reason>('off')
  const [day, setDay] = useState(today())
  const [measure, setMeasure] = useState<Measure>('ghg')
  const [note, setNote] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // Not saving is fine.
    }
  }, [state])

  const food = FOOD_BY_ID[foodId]
  const amount = grams.trim() ? Number(grams) : count * food.portion.grams
  const preview = footprint({ food: foodId, grams: Number.isFinite(amount) ? amount : 0 })
  const t = today()
  const week = useMemo(() => summarize(state.entries, t, 7), [state.entries, t])

  const add = () => {
    if (!(amount > 0) || amount > 50_000) {
      setNote('Enter an amount in grams, or choose how many.')
      return
    }
    const entry: Entry = { id: `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, food: foodId, grams: Math.round(amount), reason, date: day }
    setState((s) => ({ ...s, entries: [entry, ...s.entries.filter((e) => !s.sample || !e.id.startsWith('sample-'))], sample: false }))
    setNote(`Added ${food.name.toLowerCase()}, ${Math.round(amount)} g: ${fmt(preview.ghg, 2)} kg CO2e and ${fmt(preview.water, 0)} litres of water to produce.`)
    setGrams('')
    setCount(1)
  }

  const remove = (id: string) => setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }))

  return (
    <div className="app">
      <header className="masthead">
        <p className="brand"><span className="mark" aria-hidden="true" />Scraps</p>
        <h1>See what your food waste costs the planet, then waste less</h1>
        <p className="lede">
          Log what you throw away for a week. Scraps shows the greenhouse gas and water it took to produce, which foods and
          habits matter most, and what one change would save in a year. Nothing leaves your phone.
        </p>
        {!state.entries.length && (
          <button type="button" className="secondary" onClick={() => setState((s) => ({ ...s, entries: sampleWeek(), sample: true }))}>
            Show a made-up example week
          </button>
        )}
        {state.sample && (
          <p className="sample-note">This is a made-up week for a two-person household.{' '}
            <button type="button" className="link" onClick={() => setState((s) => ({ ...s, entries: [], sample: false }))}>Clear it and start my own</button>
          </p>
        )}
      </header>

      <main className="grid">
        <section className="panel log" aria-labelledby="log-title">
          <h2 id="log-title">Log something you threw away</h2>
          <form onSubmit={(e) => { e.preventDefault(); add() }}>
            <label className="field">
              <span>Food</span>
              <select value={foodId} onChange={(e) => { setFoodId(e.target.value); setCount(1); setGrams('') }}>
                {FOODS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
            <div className="field">
              <span id="amount-label">How much</span>
              <div className="amount" role="group" aria-labelledby="amount-label">
                <button type="button" className="step" onClick={() => { setGrams(''); setCount(Math.max(1, count - 1)) }} aria-label={`One ${food.portion.label} less`}>−</button>
                <span className="count" aria-live="polite">{portions(count, food.portion.label)}</span>
                <button type="button" className="step" onClick={() => { setGrams(''); setCount(count + 1) }} aria-label={`One ${food.portion.label} more`}>+</button>
                <span className="or">or</span>
                <label className="grams">
                  <input type="number" inputMode="numeric" min={1} max={50000} value={grams} placeholder={String(count * food.portion.grams)} onChange={(e) => setGrams(e.target.value)} />
                  <span>grams</span>
                </label>
              </div>
              <p className="hint">One {food.portion.label} is about {food.portion.grams} g{food.cookedFactor ? ' (cooked weight)' : ''}.</p>
            </div>
            <fieldset className="field reasons">
              <legend>Why was it thrown away?</legend>
              {REASONS.map((r) => (
                <label key={r.id} className={`chip${reason === r.id ? ' is-on' : ''}`}>
                  <input type="radio" name="reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} />
                  {r.label}
                </label>
              ))}
            </fieldset>
            <label className="field date">
              <span>Day</span>
              <input type="date" value={day} max={t} onChange={(e) => e.target.value && setDay(e.target.value)} />
            </label>
            <p className="preview">Producing this took about <strong>{fmt(preview.ghg, 2)} kg CO2e</strong> and <strong>{fmt(preview.water, 0)} litres of water</strong>.</p>
            <button type="submit" className="primary">Add to my log</button>
            {note && <p className="note" role="status">{note}</p>}
          </form>
        </section>

        <section className="panel week" aria-labelledby="week-title">
          <h2 id="week-title">Your last 7 days</h2>
          {week.foods.length ? <Week summary={week} people={state.people} measure={measure} setMeasure={setMeasure} setPeople={(people) => setState((s) => ({ ...s, people }))} /> : (
            <p className="empty">Nothing logged in the last 7 days yet. Add what you throw away, or look at the example week.</p>
          )}
        </section>
      </main>

      {state.entries.length > 0 && (
        <section className="panel entries" aria-labelledby="entries-title">
          <h2 id="entries-title">Your log</h2>
          <table>
            <thead>
              <tr><th scope="col">Day</th><th scope="col">Food</th><th scope="col">Amount</th><th scope="col">Why</th><th scope="col">CO2e</th><th scope="col"><span className="sr-only">Remove</span></th></tr>
            </thead>
            <tbody>
              {[...state.entries].sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
                <tr key={e.id}>
                  <td data-label="Day">{e.date}</td>
                  <td data-label="Food">{FOOD_BY_ID[e.food]?.name ?? e.food}</td>
                  <td data-label="Amount">{e.grams} g</td>
                  <td data-label="Why">{REASONS.find((r) => r.id === e.reason)?.label}</td>
                  <td data-label="CO2e">{fmt(footprint(e).ghg, 2)} kg</td>
                  <td><button type="button" className="link" onClick={() => remove(e.id)} aria-label={`Remove ${FOOD_BY_ID[e.food]?.name ?? e.food} from ${e.date}`}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="footer">
        <p>
          Footprints are global averages for producing each food, from farm to shop: greenhouse gas emissions and freshwater
          withdrawals per kilogram from Poore &amp; Nemecek (2018), <cite>Science</cite> 360(6392), as published by{' '}
          <a href="https://ourworldindata.org/grapher/ghg-per-kg-poore">Our World in Data</a> (CC BY 4.0). Cooked rice, pasta and
          pulses are converted back to their dry weight. The household average is from the{' '}
          <a href="https://www.unep.org/resources/publication/food-waste-index-report-2024">UNEP Food Waste Index Report 2024</a>.
          Your log stays in this browser; the page cannot make network requests. Built for Green Shift Hacks 2026.
        </p>
      </footer>
    </div>
  )
}

function Week({ summary, people, measure, setMeasure, setPeople }: {
  summary: Summary
  people: number
  measure: Measure
  setMeasure: (m: Measure) => void
  setPeople: (n: number) => void
}) {
  const { total, foods, reasons } = summary
  const year = perYear(total, summary.days)
  const ratio = versusAverage(total, summary.days, people)
  const top = foods[0]
  const topFood = FOOD_BY_ID[top.food]
  const topYear = perYear(top, summary.days)
  const topReason = reasons[0]
  const max = Math.max(...foods.map((f) => f[measure]), 1e-9)
  return (
    <>
      <dl className="totals">
        <div><dt>Food thrown away</dt><dd>{fmt(total.kg, 2)} kg</dd></div>
        <div><dt>Emissions to produce it</dt><dd>{fmt(total.ghg)} kg CO2e</dd></div>
        <div><dt>Water to produce it</dt><dd>{fmt(total.water, 0)} L</dd></div>
      </dl>
      <p className="year">At this rate that is about <strong>{fmt(year.kg, 0)} kg</strong> of food, <strong>{fmt(year.ghg, 0)} kg CO2e</strong> and{' '}
        <strong>{fmt(year.water / 1000, 1)} m³ of water</strong> a year.</p>
      <div className="people">
        <label>
          <span>People in your household</span>
          <input type="number" min={1} max={20} value={people} onChange={(e) => setPeople(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
        </label>
        <p>{fmt(year.kg / people, 0)} kg per person a year, {ratio >= 1 ? `${fmt(ratio, 1)} times` : `${Math.round(ratio * 100)}% of`} the household average of {UNEP_HOUSEHOLD_KG_PER_PERSON_YEAR} kg (UNEP 2024).</p>
      </div>

      <div className="lever">
        <h3>Your biggest lever: {topFood.name.toLowerCase()}</h3>
        <p>{topFood.name} {top.count === 1 ? 'was' : 'were'} {Math.round((top.ghg / Math.max(total.ghg, 1e-9)) * 100)}% of this week&rsquo;s footprint
          ({fmt(top.ghg)} kg CO2e from {fmt(top.kg * 1000, 0)} g). Wasting half as much for a year would avoid about{' '}
          <strong>{fmt(topYear.ghg / 2, 0)} kg CO2e</strong> and <strong>{fmt(topYear.water / 2, 0)} litres of water</strong>.</p>
        <p className="tip"><strong>Try:</strong> {GROUP_TIPS[topFood.group]}</p>
        {topReason && <p className="tip"><strong>Most common reason, &ldquo;{REASONS.find((r) => r.id === topReason.reason)?.label.toLowerCase()}&rdquo;:</strong> {REASON_TIPS[topReason.reason]}</p>}
      </div>

      <div className="chart-head">
        <h3 id="chart-title">By food</h3>
        <div className="toggle" role="group" aria-label="Show">
          {(['ghg', 'water', 'kg'] as Measure[]).map((m) => (
            <button key={m} type="button" aria-pressed={measure === m} onClick={() => setMeasure(m)}>{m === 'ghg' ? 'CO2e' : m === 'water' ? 'Water' : 'Weight'}</button>
          ))}
        </div>
      </div>
      <ol className="bars" aria-labelledby="chart-title">
        {[...foods].sort((a, b) => b[measure] - a[measure]).map((f) => (
          <li key={f.food}>
            <span className="bar-name">{FOOD_BY_ID[f.food]?.name}</span>
            <svg className="bar" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
              <rect className="fill" x="0" y="0" width={Math.max(1.5, (f[measure] / max) * 100)} height="10" rx="2" />
            </svg>
            <span className="bar-value">{measureText(measure, f[measure])}</span>
          </li>
        ))}
      </ol>
      <p className="fine">For scale: producing a kilogram of {topFood.cookedFactor ? `dry ${topFood.product.toLowerCase()}` : topFood.name.toLowerCase()} emits about {PRODUCTS[topFood.product].ghg} kg CO2e,
        against {topFood.product === 'Beef (beef herd)' ? `${PRODUCTS['Poultry Meat'].ghg} for chicken and ${PRODUCTS['Wheat & Rye'].ghg} for bread` : `${PRODUCTS['Apples'].ghg} for apples and ${PRODUCTS['Beef (beef herd)'].ghg} for beef`}.</p>
    </>
  )
}
