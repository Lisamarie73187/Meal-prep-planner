import { useState } from 'react'
import { createIngredient } from '../lib/api'
import { guessContains } from '../lib/diet'
import { estimateIngredients, perUnit } from '../lib/ingredientEstimate'
import type { EstimatedIngredient } from '../lib/ingredientEstimate'
import { rowFor } from '../lib/parseRecipe'
import type { DraftRow, ParsedRecipe } from '../lib/parseRecipe'
import type { Ingredient } from '../lib/types'

type Item = ParsedRecipe['ingredients'][number]
const cap = (s: string) => s.trim().replace(/^./, (c) => c.toUpperCase())
const round = (v: number) => String(Math.round(v * 10) / 10)

interface Props {
  /** Ingredients from the text that aren't in the ingredient list yet. */
  items: Item[]
  /** Who the new ingredients belong to: null makes them shared (admin only). */
  ownerId: string | null
  onAdded: (created: Ingredient[], rows: DraftRow[]) => void
}

/** Asks AI for the nutrition of ingredients that don't exist yet, shows it for a check, then adds them and puts them in the recipe. */
export function MissingIngredients({ items, ownerId, onAdded }: Props) {
  const [stage, setStage] = useState<'idle' | 'loading' | 'review' | 'saving'>('idle')
  const [estimates, setEstimates] = useState<EstimatedIngredient[]>([])
  const [skipped, setSkipped] = useState<string[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  if (items.length === 0) return note ? <div role="status">{note}</div> : null

  const lookUp = async () => {
    setStage('loading')
    setError(null)
    try {
      const { items: got, failed } = await estimateIngredients(items.map((i) => i.name))
      setEstimates(got)
      setSkipped(failed)
      setPicked(new Set(got.map((g) => g.name)))
      setStage('review')
    } catch (e) {
      setError((e as Error).message)
      setStage('idle')
    }
  }

  const add = async () => {
    setStage('saving')
    setError(null)
    const created: Ingredient[] = []
    const rows: DraftRow[] = []
    const noAmount: string[] = []
    const problems: string[] = []
    for (const est of estimates.filter((e) => picked.has(e.name))) {
      try {
        const name = cap(est.name)
        const ing = await createIngredient({
          owner_id: ownerId, name, base_unit: est.base_unit, store_section: est.store_section,
          density_g_per_ml: est.density_g_per_ml, contains: guessContains(name), ...perUnit(est.per100),
        })
        created.push(ing)
        const item = items.find((i) => i.name === est.name)!
        const { row, known } = rowFor(item, ing)
        rows.push(row)
        if (!known) noAmount.push(ing.name)
      } catch (e) {
        problems.push(`${cap(est.name)}: ${(e as Error).message}`)
      }
    }
    if (created.length) {
      onAdded(created, rows)
      setNote(`Added ${created.map((c) => c.name).join(', ')} to your ingredients and to this recipe.${noAmount.length ? ` Fill in the amount for: ${noAmount.join(', ')}.` : ''}`)
    }
    setError(problems.length ? problems.join(' ') : null)
    setStage(problems.length ? 'review' : 'idle')
    if (problems.length) setEstimates(estimates.filter((e) => !created.some((c) => c.name.toLowerCase() === e.name.toLowerCase())))
  }

  return (
    <div className="stack-sm missing">
      <div>Not in your ingredient list yet: <strong>{items.map((i) => i.name).join(', ')}</strong>.</div>
      {note && <div role="status">{note}</div>}
      {stage === 'idle' && <div><button type="button" className="btn btn-sm btn-primary" onClick={lookUp}>Look up nutrition and add them</button></div>}
      {stage === 'loading' && <div role="status" className="muted">Looking up nutrition…</div>}
      {(stage === 'review' || stage === 'saving') && (
        <div className="stack-sm">
          <p className="small">AI estimated these (per 100 g, or 100 ml for liquids). Check them, then add.</p>
          <ul className="missing__list">
            {estimates.map((e) => (
              <li key={e.name}>
                <label>
                  <input
                    type="checkbox" checked={picked.has(e.name)} disabled={stage === 'saving'}
                    onChange={() => setPicked((p) => { const n = new Set(p); if (!n.delete(e.name)) n.add(e.name); return n })}
                  />
                  <span><strong>{cap(e.name)}</strong> <span className="muted small">{e.store_section} · {round(e.per100.calories)} kcal · {round(e.per100.protein)} g protein · {round(e.per100.carbs)} g carbs · {round(e.per100.fat)} g fat</span></span>
                </label>
              </li>
            ))}
          </ul>
          {skipped.length > 0 && <p className="small">Couldn't get reliable numbers for {skipped.join(', ')}. Add {skipped.length === 1 ? 'it' : 'those'} with the ingredient search below.</p>}
          <div className="row">
            <button type="button" className="btn btn-sm btn-primary" disabled={stage === 'saving' || picked.size === 0} onClick={add}>{stage === 'saving' ? 'Adding…' : `Add ${picked.size} to my ingredients and recipe`}</button>
            <button type="button" className="btn btn-sm btn-ghost" disabled={stage === 'saving'} onClick={() => setStage('idle')}>Cancel</button>
          </div>
        </div>
      )}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
    </div>
  )
}
