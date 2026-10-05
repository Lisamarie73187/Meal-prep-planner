import { useEffect, useState } from 'react'
import { groupBySection } from '../lib/grocery'
import type { BuyLine, GroceryResult } from '../lib/grocery'
import { formatAmount } from '../lib/units'

const storeKey = (planId: string) => `meal-prep:grocery:${planId}`

function useChecked(planId: string) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey(planId))
      if (raw) setChecked(new Set(JSON.parse(raw) as string[]))
    } catch { /* storage unavailable: checkboxes just won't persist */ }
  }, [planId])
  const toggle = (key: string) => {
    const next = new Set(checked)
    if (!next.delete(key)) next.add(key)
    setChecked(next)
    try { localStorage.setItem(storeKey(planId), JSON.stringify([...next])) } catch { /* ignore */ }
  }
  return { checked, toggle }
}

export function GroceryList({ planId, result }: { planId: string; result: GroceryResult }) {
  const { checked, toggle } = useChecked(planId)
  const groups = groupBySection(result.toBuy)
  const covered = groupBySection(result.covered)

  return (
    <div className="stack">
      {result.toBuy.length === 0 && <div className="alert alert-ok">You already have everything for this plan.</div>}
      {groups.map((g) => (
        <section key={g.section} className="grocery-section recipe-block">
          <h3>{g.section}</h3>
          {g.lines.map((l: BuyLine) => (
            <label key={l.key} className={`check-item${checked.has(l.key) ? ' done' : ''}`}>
              <input type="checkbox" checked={checked.has(l.key)} onChange={() => toggle(l.key)} />
              <span>
                <span className="name">{l.ingredient.name}</span>
                {l.have > 0 && <span className="note"> · need {formatAmount(l.needed, l.ingredient).text}, have {formatAmount(l.have, l.ingredient).text}</span>}
              </span>
              <span className="qty">{formatAmount(l.buy, l.ingredient, 'up').text}</span>
            </label>
          ))}
        </section>
      ))}
      {covered.length > 0 && (
        <section className="recipe-block">
          <h3>Already have</h3>
          <p className="muted small">Covered by your fridge and pantry. Nothing to buy.</p>
          {covered.map((g) => g.lines.map((l: BuyLine) => (
            <div key={l.key} className="check-item">
              <span className="name">{l.ingredient.name}</span>
              <span className="qty muted">need {formatAmount(l.needed, l.ingredient).text} · have {formatAmount(l.have, l.ingredient).text}</span>
            </div>
          )))}
        </section>
      )}
    </div>
  )
}
