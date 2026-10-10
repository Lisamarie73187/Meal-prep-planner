import { useEffect, useState } from 'react'
import { groceryText, groupBySection } from '../lib/grocery'
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

/** Copy text to the clipboard, falling back to a hidden textarea where the async API isn't available. */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch { /* fall through */ }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  const ok = document.execCommand('copy')
  ta.remove()
  if (!ok) throw new Error('copy failed')
}

export function GroceryList({ planId, result, title = 'Grocery list' }: { planId: string; result: GroceryResult; title?: string }) {
  const { checked, toggle } = useChecked(planId)
  const [note, setNote] = useState<string | null>(null)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const text = groceryText(result, title)

  const share = async () => {
    try {
      await navigator.share({ title, text })
      setNote(null)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setNote("Couldn't open sharing. Use Copy and paste it into Notes.")
    }
  }
  const copy = async () => {
    try { await copyText(text); setNote('Copied. Paste it into a new note.') } catch { setNote("Couldn't copy. Select the list and copy it by hand.") }
  }
  const groups = groupBySection(result.toBuy)
  const covered = groupBySection(result.covered)

  return (
    <div className="stack">
      {result.toBuy.length === 0 && <div className="alert alert-ok">You already have everything for this plan.</div>}
      {result.toBuy.length > 0 && (
        <div className="row no-print">
          {canShare && <button className="btn" onClick={share}>Share to Notes…</button>}
          <button className="btn" onClick={copy}>Copy list</button>
          <span className="muted small" role="status">{note ?? (canShare ? 'Share opens your device\'s share sheet, where Notes is listed.' : 'Copy the list, then paste it into Apple Notes.')}</span>
        </div>
      )}
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
