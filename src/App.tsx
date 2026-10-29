import { useEffect, useMemo, useState } from 'react'
import { FOOD_BY_ID, FOODS, PRODUCTS, REASONS, type Reason } from './foods'
import { addDays, compareWeeks, completedInWindow, footprint, isoDay, perYear, summarize, validDay, type Entry, type Summary } from './impact'
import { GROUP_TIPS, REASON_TIPS } from './tips'
import { loadLog, saveLog, type Saved } from './storage'
import Comparison from './Comparison'
type Measure = 'ghg' | 'water' | 'kg'

function today(): string {
  return isoDay(new Date())
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
  const [loaded] = useState(() => loadLog(today()))
  const [state, setState] = useState<Saved>(loaded.state)
  const [example, setExample] = useState(false)
  const [examplePeople, setExamplePeople] = useState(2)
  const [saveFailed, setSaveFailed] = useState(false)
  const [foodId, setFoodId] = useState('bread')
  const [count, setCount] = useState(1)
  const [grams, setGrams] = useState('')
  const [reason, setReason] = useState<Reason>('off')
  const [day, setDay] = useState(today())
  const [measure, setMeasure] = useState<Measure>('ghg')
  const [note, setNote] = useState('')

  useEffect(() => {
    setSaveFailed(!saveLog(state, today()))
  }, [state])

  const food = FOOD_BY_ID[foodId]
  const amount = grams.trim() ? Number(grams) : count * food.portion.grams
  const preview = footprint({ food: foodId, grams: Number.isFinite(amount) ? amount : 0 })
  const t = today()
  const entries = useMemo(() => example ? sampleWeek() : state.entries, [example, state.entries, t])
  const completed = example ? Array.from({ length: 7 }, (_, i) => addDays(t, -i)) : state.completedDays
  const week = useMemo(() => summarize(entries, t, 7), [entries, t])
  const daysComplete = completedInWindow(completed, t).length
  const comparison = compareWeeks(entries, completed, t)

  const add = () => {
    if (!Number.isFinite(amount) || amount < 1 || amount > 50_000 || !validDay(day) || day > t) {
      setNote('Enter an amount in grams, or choose how many.')
      return
    }
    const entry: Entry = { id: `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, food: foodId, grams: Math.round(amount), reason, date: day }
    setState((s) => ({ ...s, entries: [entry, ...s.entries], completedDays: s.completedDays.filter((d) => d !== day) }))
    setExample(false)
    setNote(`Added ${food.name.toLowerCase()}, ${Math.round(amount)} g: ${fmt(preview.ghg, 2)} kg CO2e and ${fmt(preview.water, 0)} litres of water to produce.`)
    setGrams('')
    setCount(1)
  }

  const remove = (id: string) => setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id), completedDays: s.completedDays.filter((d) => d !== s.entries.find((e) => e.id === id)?.date) }))

  return (
    <div className="app">
      <header className="masthead">
        <p className="brand"><span className="mark" aria-hidden="true" />Scraps</p>
        <h1>See what your food waste costs the planet, then waste less</h1>
        <p className="lede">
          Log edible food you throw away, choose a habit to change, and compare two completed weeks.
          See estimated production footprints alongside the amounts you record. Your log stays in this browser.
        </p>
        {!example && (
          <button type="button" className="secondary" onClick={() => { setExamplePeople(2); setExample(true) }}>
            Show a made-up example week
          </button>
        )}
        {example && (
          <p className="sample-note">This is a made-up week for a two-person household.{' '}
            It is not saved in your log.{' '}
            <button type="button" className="link" onClick={() => setExample(false)}>Back to my log</button>
          </p>
        )}
        {saveFailed && <p className="note" role="alert">This browser could not save your log. Keep this page open; changes may be lost when it closes.</p>}
        {loaded.warning && <p className="note" role="status">{loaded.warning}</p>}
      </header>

      <main className="grid">
        <section className="panel log" aria-labelledby="log-title">
          <h2 id="log-title">Log something you threw away</h2>
          <p className="hint">Record the edible portion, without packaging, bones or peels you do not eat. For a mixed meal, log its ingredients separately.</p>
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
              <input type="date" value={day} min="1900-01-01" max={t} required onChange={(e) => setDay(e.target.value)} />
            </label>
            <p className="preview">Estimated production footprint: <strong>{fmt(preview.ghg, 2)} kg CO2e</strong> and <strong>{fmt(preview.water, 0)} litres of freshwater withdrawals</strong>.
              <span className="assumption">Uses the global average for {food.product}{food.cookedFactor ? `; cooked weight divided by ${food.cookedFactor}` : ''}. This is a proxy, not a measurement of your food.</span></p>
            <button type="submit" className="primary">Add to my log</button>
            {note && <p className="note" role="status">{note}</p>}
          </form>
        </section>

        <section className="panel week" aria-labelledby="week-title">
          <h2 id="week-title">{example ? 'Example: last 7 days' : 'Your last 7 days'}</h2>
          <p className="coverage-status">{daysComplete} of 7 days marked complete · {addDays(t, -6)} to {t}</p>
          {!example && <details className="coverage">
            <summary>Mark completed days, including zero-waste days</summary>
            <p>Check a day after recording all its edible food waste. An unchecked day is missing data, not zero. Adding or removing an entry reopens that day.</p>
            <fieldset><legend>Days in this and the previous week</legend>
              {Array.from({ length: 14 }, (_, i) => addDays(t, -i)).map((date) => <label key={date}>
                <input type="checkbox" checked={state.completedDays.includes(date)} onChange={(e) => setState((s) => ({ ...s, completedDays: e.target.checked ? [...s.completedDays, date] : s.completedDays.filter((d) => d !== date) }))} />
                {date}
              </label>)}
            </fieldset>
          </details>}
          {week.foods.length ? <Week summary={week} complete={daysComplete === 7} people={example ? examplePeople : state.people} measure={measure} setMeasure={setMeasure} setPeople={(people) => example ? setExamplePeople(people) : setState((s) => ({ ...s, people }))} /> : (
            <p className="empty">{daysComplete === 7 ? 'You marked all 7 days complete with no edible food waste recorded.' : 'Nothing logged in the last 7 days yet. Add what you throw away, or look at the example week.'}</p>
          )}
          {!example && <Comparison comparison={comparison} />}
        </section>
      </main>

      {entries.length > 0 && (
        <section className="panel entries" aria-labelledby="entries-title">
          <h2 id="entries-title">{example ? 'Example log · not saved' : 'Your log'}</h2>
          <table>
            <thead>
              <tr><th scope="col">Day</th><th scope="col">Food</th><th scope="col">Amount</th><th scope="col">Why</th><th scope="col">CO2e</th><th scope="col"><span className="sr-only">Remove</span></th></tr>
            </thead>
            <tbody>
              {[...entries].sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
                <tr key={e.id}>
                  <td data-label="Day">{e.date}</td>
                  <td data-label="Food">{FOOD_BY_ID[e.food]?.name ?? e.food}</td>
                  <td data-label="Amount">{e.grams} g</td>
                  <td data-label="Why">{REASONS.find((r) => r.id === e.reason)?.label}</td>
                  <td data-label="CO2e">{fmt(footprint(e).ghg, 2)} kg</td>
                  <td>{!example && <button type="button" className="link" onClick={() => remove(e.id)} aria-label={`Remove ${FOOD_BY_ID[e.food]?.name ?? e.food} from ${e.date}`}>Remove</button>}</td>
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
          Its 79 kg household estimate includes inedible parts, so it is not a like-for-like benchmark for this edible-food log.
          The app has no uploads or analytics. Built for Green Shift Hacks 2026.
        </p>
      </footer>
    </div>
  )
}

function Week({ summary, complete, people, measure, setMeasure, setPeople }: {
  summary: Summary
  complete: boolean
  people: number
  measure: Measure
  setMeasure: (m: Measure) => void
  setPeople: (n: number) => void
}) {
  const { total, foods, reasons } = summary
  const year = perYear(total, summary.days)
  const top = foods[0]
  const topFood = FOOD_BY_ID[top.food]
  const topYear = perYear(top, summary.days)
  const topReason = reasons[0]
  const max = Math.max(...foods.map((f) => f[measure]), 1e-9)
  return (
    <>
      <dl className="totals">
        <div><dt>Food thrown away</dt><dd>{fmt(total.kg, 2)} kg</dd></div>
        <div><dt>Estimated production emissions</dt><dd>{fmt(total.ghg)} kg CO2e</dd></div>
        <div><dt>Estimated freshwater withdrawals</dt><dd>{fmt(total.water, 0)} L</dd></div>
      </dl>
      {complete ? <p className="year">If this completed week repeated for a year: about <strong>{fmt(year.kg, 0)} kg</strong> of food, <strong>{fmt(year.ghg, 0)} kg CO2e</strong> and{' '}
        <strong>{fmt(year.water / 1000, 1)} m³ of freshwater withdrawals</strong>. This is a scenario, not a measured annual total.</p> :
        <p className="fine">Annual scenarios stay hidden until all 7 days are marked complete.</p>}
      <div className="people">
        <label>
          <span>People in your household</span>
          <input type="number" min={1} max={20} step={1} value={people} onChange={(e) => setPeople(Math.max(1, Math.min(20, Math.round(Number(e.target.value)) || 1)))} />
        </label>
        <p>{fmt(total.kg / people, 2)} kg of edible food recorded per person in this window.</p>
      </div>

      <div className="lever">
        <h3>Your biggest lever: {topFood.name.toLowerCase()}</h3>
        <p>{topFood.name} accounted for {Math.round((top.ghg / Math.max(total.ghg, 1e-9)) * 100)}% of this week&rsquo;s estimated production emissions
          ({fmt(top.ghg)} kg CO2e from {fmt(top.kg * 1000, 0)} g).</p>
        {complete && <p>Scenario: half as much {topFood.name.toLowerCase()} waste, with this week repeating for a year, corresponds to about{' '}
          <strong>{fmt(topYear.ghg / 2, 0)} kg CO2e</strong> and <strong>{fmt(topYear.water / 2, 0)} litres of freshwater withdrawals</strong> in estimated production footprint. These are not verified savings.</p>}
        <p className="tip"><strong>Try:</strong> {GROUP_TIPS[topFood.group]}</p>
        {topReason && <p className="tip"><strong>Most waste by weight, &ldquo;{REASONS.find((r) => r.id === topReason.reason)?.label.toLowerCase()}&rdquo;:</strong> {REASON_TIPS[topReason.reason]}</p>}
        <p className="fine">Follow packaging and local food-safety guidance. <a href="https://www.gov.uk/government/publications/student-guide-to-food-safety-and-hygiene/student-guide-to-food-safety-and-hygiene">Food Standards Agency advice</a>.</p>
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
      <p className="fine">Estimate for {topFood.name.toLowerCase()}: the dataset category is {topFood.product}, at {PRODUCTS[topFood.product].ghg} kg CO2e per kg.
        Global averages and proxy categories do not identify the actual footprint of a particular product.</p>
    </>
  )
}
