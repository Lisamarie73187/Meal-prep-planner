import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { AdjustPanel } from '../components/AdjustPanel'
import { NutritionRow } from '../components/NutritionRow'
import { clampPortions, PortionsInput } from '../components/PortionsInput'
import { Stepper } from '../components/Stepper'
import { replacePlanItems } from '../lib/api'
import { fitRecipe, practicalAmount } from '../lib/autofit'
import { dayTotals, lineNutrition } from '../lib/grocery'
import { mealTargets, perServingAmounts, round, splitOf } from '../lib/nutrition'
import { NUTRIENTS, NUTRIENT_LABEL, NUTRIENT_UNIT } from '../lib/types'
import type { Amounts, MealCategory, Nutrition, PlanItemRow, PlanLine, Recipe } from '../lib/types'
import { usePlan } from '../lib/usePlan'

const MACROS = ['calories', 'protein', 'carbs', 'fat'] as const
const hasMacros = (t: Partial<Nutrition>) => MACROS.some((k) => (t[k] ?? 0) > 0)

export function PlanReview() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { data, loading, error, lines, reload } = usePlan(id!)
  const [adjusting, setAdjusting] = useState<{ recipe: Recipe; item: PlanItemRow; slot: MealCategory } | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ key: string; text: string; ok: boolean } | null>(null)
  if (loading && !data) return <p className="muted">Loading…</p>
  if (error || !data) return <div className="alert alert-error">{error ?? 'Plan not found'}</div>

  const { plan, items, recipes } = data
  const editable = plan.status !== 'confirmed'
  // One day = one portion of each meal type in the plan, compared with your target for those same meal types.
  const { day, slots } = dayTotals(lines)
  const target: Partial<Nutrition> = {}
  for (const n of NUTRIENTS) {
    let sum = 0
    let any = false
    for (const s of slots) {
      const t = mealTargets(profile, s)[n]
      if (t != null) { sum += t; any = true }
    }
    if (any) target[n] = sum
  }
  const wholeDay = Math.abs(slots.reduce((a, s) => a + splitOf(profile)[s], 0) - 1) < 0.005
  const fmt = (n: keyof Nutrition, v: number) => round(v, n === 'calories' ? 0 : 1)

  const keyOf = (l: PlanLine) => `${l.recipeId ?? l.name}-${l.category}`
  const itemOf = (l: PlanLine) => items.find((i) => i.recipe_id === l.recipeId && i.category === l.category)

  /** Save a change to one recipe in the plan (its portions, or its per-serving amounts). */
  const updateItem = async (item: PlanItemRow, patch: Partial<PlanItemRow>, key: string, ok?: string) => {
    setBusy(true)
    setNote(null)
    try {
      const next = items.map((i) => (i === item ? { ...i, ...patch } : i)).map(({ id: _i, plan_id: _p, ...rest }) => rest)
      await replacePlanItems(id!, next)
      if (ok) setNote({ key, text: ok, ok: true })
      reload()
    } catch (e) {
      setNote({ key, text: (e as Error).message, ok: false })
    }
    setBusy(false)
  }
  /** Save new per-serving amounts for one meal (null puts it back to the recipe as written). */
  const saveAmounts = (item: PlanItemRow, amounts: Amounts | null, key: string, ok: string) => updateItem(item, { amount_overrides: amounts }, key, ok)
  const savePortions = (item: PlanItemRow, meals: number, key: string) => updateItem(item, { meals: clampPortions(meals) }, key)

  const fitOne = (l: PlanLine, item: PlanItemRow, recipe: Recipe) => {
    // Fit only the ingredients still in the plan, and keep the left-out ones at 0.
    const leftOut = Object.fromEntries(Object.entries(item.amount_overrides ?? {}).filter(([, v]) => v === 0))
    const kept = { ...recipe, recipe_ingredients: recipe.recipe_ingredients.filter((ri) => !(ri.ingredient_id in leftOut)) }
    const fit = kept.recipe_ingredients.length ? fitRecipe(kept, mealTargets(profile, l.category)) : null
    const key = keyOf(l)
    if (!fit) return setNote({ key, text: 'Set macro targets first to fit this meal.', ok: false })
    if (!fit.changed) return setNote({ key, text: fit.allMet ? 'Already within 5% of your targets.' : 'Adjusting the portions would not get any closer.', ok: true })
    saveAmounts(item, { ...fit.amounts, ...leftOut }, key, fit.allMet ? 'Adjusted to your macros.' : 'Adjusted as close as this recipe allows.')
  }

  /** Scale every ingredient by `k` (e.g. 1.1 for a 10% bigger portion). */
  const scaleOne = (l: PlanLine, item: PlanItemRow, recipe: Recipe, k: number) => {
    const current = item.amount_overrides ?? perServingAmounts(recipe)
    const scaled: Amounts = {}
    for (const ri of recipe.recipe_ingredients) {
      if (ri.ingredient_id in scaled) continue
      const now = current[ri.ingredient_id] ?? 0
      scaled[ri.ingredient_id] = now === 0 ? 0 : practicalAmount(now * k, ri.ingredient) // a left-out ingredient stays out
    }
    saveAmounts(item, scaled, keyOf(l), k > 1 ? 'Portion made 10% bigger.' : 'Portion made 10% smaller.')
  }

  return (
    <div className="stack">
      <Stepper current={3} planId={id} />
      <h1>Review your plan</h1>
      {editable && lines.length > 0 && <p className="muted">Choose how many portions of each recipe to make. The grocery list and recipes are scaled to these.</p>}
      {lines.length === 0 && <div className="alert alert-warn">No meals selected. <Link to={`/plan/${id}/pick`}>Choose recipes</Link></div>}
      {lines.map((l) => {
        const item = itemOf(l)
        const recipe = l.recipeId ? recipes.get(l.recipeId) : undefined
        const mt = mealTargets(profile, l.category)
        const n = lineNutrition(l)
        const key = keyOf(l)
        const canEdit = editable && !!item && !!recipe
        return (
          <div className="card stack-sm" key={key}>
            <div className="row row-between">
              <strong>{l.name}</strong>
              <span className="row">
                {item?.amount_overrides && <span className="badge badge-accent">portions adjusted</span>}
                <span className="badge">{l.category}</span>
                {editable && item ? (
                  <span className="row no-print">
                    <span className="small muted">Portions</span>
                    <PortionsInput name={l.name} value={l.meals} disabled={busy} onChange={(v) => savePortions(item, v, key)} />
                  </span>
                ) : null}
                <span className={editable && item ? 'print-only' : 'badge'}>{l.meals} {l.meals === 1 ? 'portion' : 'portions'}</span>
              </span>
            </div>
            <NutritionRow nutrition={n} />
            {hasMacros(mt) && (
              <span className="muted small">
                Per meal vs your {l.category} target: {MACROS.filter((k) => mt[k] != null).map((k) => `${NUTRIENT_LABEL[k].toLowerCase()} ${fmt(k, n[k])} / ${fmt(k, mt[k]!)}`).join(' · ')}
              </span>
            )}
            {canEdit && (
              <div className="row no-print">
                {hasMacros(mt) && <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => fitOne(l, item!, recipe!)}>Fit to my macros</button>}
                <button className="btn btn-sm" disabled={busy} onClick={() => scaleOne(l, item!, recipe!, 0.9)} aria-label={`Smaller portion of ${l.name}`}>− 10%</button>
                <button className="btn btn-sm" disabled={busy} onClick={() => scaleOne(l, item!, recipe!, 1.1)} aria-label={`Bigger portion of ${l.name}`}>+ 10%</button>
                <button className="btn btn-sm" disabled={busy} onClick={() => setAdjusting({ recipe: recipe!, item: item!, slot: l.category })}>Adjust ingredients…</button>
                {item!.amount_overrides && <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => saveAmounts(item!, null, key, 'Back to the recipe as written.')}>Reset</button>}
              </div>
            )}
            {note?.key === key && <div className={`alert ${note.ok ? 'alert-ok' : 'alert-error'} no-print`}>{note.text}</div>}
          </div>
        )
      })}
      <div className="card stack">
        <h2>One day vs. your targets</h2>
        <p className="muted small">
          A day is one portion of each meal in your plan ({slots.join(' + ') || 'none yet'}), not the whole batch.
          {slots.length > 1 && ' Where a meal has more than one recipe, they are averaged.'}
          {!wholeDay && slots.length > 0 && ' The target covers only these meals\' share of your day.'}
        </p>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th></th><th className="num">One day</th><th className="num">{wholeDay ? 'Daily target' : 'Target for these meals'}</th><th className="num">Gap</th></tr></thead>
            <tbody>
              {NUTRIENTS.map((n) => {
                const gap = target[n] != null ? day[n] - target[n]! : null
                return (
                  <tr key={n}>
                    <th scope="row">{NUTRIENT_LABEL[n]} ({NUTRIENT_UNIT[n]})</th>
                    <td className="num">{fmt(n, day[n])}</td>
                    <td className="num">{target[n] != null ? fmt(n, target[n]!) : '—'}</td>
                    <td className={`num ${gap == null ? '' : Math.abs(gap) <= target[n]! * 0.05 ? 'gap-ok' : gap > 0 ? 'gap-over' : 'gap-under'}`}>
                      {gap == null ? '—' : `${gap > 0 ? '+' : ''}${fmt(n, gap)}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {Object.keys(target).length === 0 && <p className="muted small">Set daily targets on the <Link to="/targets">Targets</Link> page to compare.</p>}
        {!editable && <p className="muted small">This plan is confirmed, so portions are frozen.</p>}
      </div>
      <div className="sticky-bar">
        <span />
        <div className="row">
          <Link className="btn" to={`/plan/${id}/pick`}>← Change recipes</Link>
          <Link className="btn btn-primary" to={`/plan/${id}/results`}>Generate grocery list →</Link>
        </div>
      </div>

      {adjusting && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Adjust ${adjusting.recipe.name}`}>
          <div className="modal stack">
            <div className="row row-between"><h2>{adjusting.recipe.name} <span className="muted small">for {adjusting.slot}</span></h2><button className="btn btn-sm" onClick={() => setAdjusting(null)}>Close</button></div>
            <AdjustPanel
              recipe={adjusting.recipe}
              target={mealTargets(profile, adjusting.slot)}
              initialAmounts={adjusting.item.amount_overrides ?? undefined}
              returnTo={`/plan/${id}/review`}
              onUseInPlan={(amounts) => {
                const { item, recipe, slot } = adjusting
                setAdjusting(null)
                saveAmounts(item, amounts, `${recipe.id}-${slot}`, 'Portions updated.')
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
