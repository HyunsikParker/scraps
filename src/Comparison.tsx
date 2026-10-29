import { useState } from 'react'
import { FOOD_BY_ID } from './foods'
import { compareWeeks } from './impact'

type Metric = 'ghg' | 'water' | 'kg'
const METRICS: Record<Metric, { label: string; unit: string; scale: number; digits: number }> = {
  ghg: { label: 'Estimated production emissions', unit: 'kg CO2e', scale: 1, digits: 2 },
  water: { label: 'Estimated freshwater withdrawals', unit: 'L', scale: 1, digits: 1 },
  kg: { label: 'Recorded food weight', unit: 'g', scale: 1000, digits: 0 },
}

function amount(value: number, metric: Metric) {
  const { unit, scale, digits } = METRICS[metric]
  const n = Math.abs(value * scale)
  const minimum = 10 ** -digits
  const number = n > 0 && n < minimum ? `<${minimum}` : n.toLocaleString('en-US', { maximumFractionDigits: digits })
  return `${number} ${unit}`
}

function change(value: number, metric: Metric) {
  return value === 0 ? 'Unchanged' : `${amount(value, metric)} ${value < 0 ? 'lower' : 'higher'}`
}

export default function Comparison({ comparison }: { comparison: ReturnType<typeof compareWeeks> }) {
  const [metric, setMetric] = useState<Metric>('ghg')
  const { current, previous, delta, periods } = comparison
  const rows = [...comparison.foodChanges].sort((a, b) => Math.abs(b.delta[metric]) - Math.abs(a.delta[metric]) || a.food.localeCompare(b.food))
  const diverges = delta && (delta.kg * delta.ghg < 0 || delta.kg * delta.water < 0)

  return <section className="comparison" aria-labelledby="comparison-title">
    <h3 id="comparison-title">Did your recorded waste change?</h3>
    {!comparison.ready || !delta ? <p>Mark all 14 days complete to compare this week with the previous one. Missing days do not count as reductions.</p> : <>
      <p className="fine comparison-dates">Previous: {periods.previousFrom} to {periods.previousTo}<br />Latest: {periods.currentFrom} to {periods.currentTo}</p>
      <p>Previous week: <strong>{previous.total.kg.toLocaleString('en-US', { maximumFractionDigits: 3 })} kg</strong>. Latest week: <strong>{current.total.kg.toLocaleString('en-US', { maximumFractionDigits: 3 })} kg</strong>.</p>
      <p>{comparison.change === 0 ? 'The recorded weight is unchanged.' : <>{amount(comparison.change, 'kg')} {comparison.change < 0 ? 'less' : 'more'} edible food recorded
        {comparison.percent !== null ? ` (${Math.abs(comparison.percent) < 0.1 ? '<0.1' : Math.abs(comparison.percent).toLocaleString('en-US', { maximumFractionDigits: 1 })}% ${comparison.change < 0 ? 'lower' : 'higher'})` : '; no percentage is calculated from a zero baseline'}.</>}</p>
      <dl className="footprint-changes">
        {(['ghg', 'water'] as const).map(m => <div key={m}>
          <dt>{METRICS[m].label}</dt>
          <dd><strong>{change(delta[m], m)}</strong><span>Previous {amount(previous.total[m], m)} · Latest {amount(current.total[m], m)}</span></dd>
        </div>)}
      </dl>
      {diverges && <p className="comparison-context">Weight and production footprints moved in different directions. The types of food recorded matter, as well as the amount.</p>}
      <p className="fine">This compares your logs, not proven emissions or water savings. Both weeks use the same global-average production factors. Changes in household size, meals or recording can affect the result.</p>
      {rows.length > 0 && <details className="food-changes">
        <summary>See what changed by food</summary>
        <label className="field"><span>Compare foods by</span><select value={metric} onChange={e => setMetric(e.target.value as Metric)}>
          {(Object.keys(METRICS) as Metric[]).map(m => <option value={m} key={m}>{METRICS[m].label}</option>)}
        </select></label>
        <p className="fine">Largest absolute change first, including both increases and decreases. Values are rounded for display.</p>
        <ul className="food-change-list" aria-label={`Food changes: ${METRICS[metric].label.toLowerCase()}`}>
          {rows.map(row => <li key={row.food}>
            <div><strong>{FOOD_BY_ID[row.food].name}</strong><span>{change(row.delta[metric], metric)}</span></div>
            <p>Previous {amount(row.previous[metric], metric)} · Latest {amount(row.current[metric], metric)}</p>
          </li>)}
        </ul>
      </details>}
    </>}
  </section>
}
