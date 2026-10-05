import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { saveRecipe } from '../lib/api'
import { autoFit, TOLERANCE } from '../lib/autofit'
import type { FitResult } from '../lib/autofit'
import { perServingAmounts, perServingNutrition, round } from '../lib/nutrition'
import { NUTRIENTS, NUTRIENT_LABEL, NUTRIENT_UNIT } from '../lib/types'
import type { Amounts, Nutrition, Recipe } from '../lib/types'
import { formatAmount } from '../lib/units'
import { AmountInput } from './AmountInput'

interface Props {
  recipe: Recipe
  /** Per-meal target for this recipe's category. */
  target: Partial<Nutrition>
  initialAmounts?: Amounts
  /** When set (inside a plan) the user can apply the adjustment to this plan only. */
  onUseInPlan?: (amounts: Amounts) => void
  /** Where to go after saving a copy (defaults to the saved recipe). Ignored inside a plan, which stays put. */
  returnTo?: string
}

function gapClass(value: number, target: number | undefined) {
  if (target == null || target === 0) return ''
  const d = (value - target) / target
  if (Math.abs(d) <= TOLERANCE) return 'gap-ok'
  return d > 0 ? 'gap-over' : 'gap-under'
}

const fmt = (n: keyof Nutrition, v: number) => round(v, n === 'calories' ? 0 : 1)
const signed = (n: keyof Nutrition, v: number) => `${v > 0 ? '+' : ''}${fmt(n, v)}`

export function AdjustPanel({ recipe, target, initialAmounts, onUseInPlan, returnTo }: Props) {
  const { userId } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()
  const original = useMemo(() => perServingAmounts(recipe), [recipe])
  const [amounts, setAmounts] = useState<Amounts>(initialAmounts ?? original)
  const [fit, setFit] = useState<{ before: Nutrition; result: FitResult } | null>(null)
  const [saving, setSaving] = useState(false)
  // The saved recipe and the amounts it was saved with, so the button can say "Saved" until you change something.
  const [saved, setSaved] = useState<{ id: string; key: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const allRows = useMemo(() => {
    const seen = new Set<string>()
    return recipe.recipe_ingredients.filter((ri) => !seen.has(ri.ingredient_id) && !!seen.add(ri.ingredient_id))
  }, [recipe])
  // A removed ingredient is kept at amount 0, which is how a plan records "leave this out".
  const [removed, setRemoved] = useState<Set<string>>(() => new Set(Object.entries(initialAmounts ?? {}).filter(([, v]) => v === 0).map(([k]) => k)))
  const rows = allRows.filter((ri) => !removed.has(ri.ingredient_id))
  const removedRows = allRows.filter((ri) => removed.has(ri.ingredient_id))
  const nutrition = perServingNutrition(recipe, amounts)
  const hasTarget = Object.keys(target).length > 0
  const hasZero = rows.some((ri) => !(amounts[ri.ingredient_id] > 0))
  const hasNone = rows.length === 0
  const remove = (id: string) => { setRemoved(new Set(removed).add(id)); setAmounts({ ...amounts, [id]: 0 }); setFit(null) }
  const addBack = (id: string) => {
    const next = new Set(removed)
    next.delete(id)
    setRemoved(next)
    setAmounts({ ...amounts, [id]: original[id] })
    setFit(null)
  }
  const isOwn = recipe.owner_id === userId && userId !== null
  const isSaved = saved !== null && saved.key === JSON.stringify(amounts)

  const runFit = () => {
    const result = autoFit(rows.map((ri) => ({ ingredient: ri.ingredient, amount: original[ri.ingredient_id] })), target)
    setFit({ before: nutrition, result })
  }

  const save = async (mode: 'copy' | 'overwrite') => {
    if (!userId) return
    setSaving(true)
    setError(null)
    try {
      const id = await saveRecipe(
        {
          name: mode === 'copy' ? `${recipe.name} (adjusted)` : recipe.name,
          category: recipe.category, servings: recipe.servings, prep_minutes: recipe.prep_minutes,
          photo_path: recipe.photo_path, instructions: recipe.instructions,
          copied_from: mode === 'copy' ? recipe.id : recipe.copied_from,
          ingredients: rows.map((ri) => ({
            ingredient_id: ri.ingredient_id, amount: amounts[ri.ingredient_id] * recipe.servings, display_unit: ri.display_unit,
          })),
        },
        userId,
        mode === 'overwrite' ? recipe.id : undefined,
      )
      setSaving(false)
      setSaved({ id, key: JSON.stringify(amounts) })
      // Inside a plan the page you'd return to is the one you're on, so navigating would do nothing visible.
      // Stay put and confirm instead.
      if (!onUseInPlan) navigate(returnTo ?? `/recipes/${id}`)
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>Per serving vs. your per-meal target</h2>
        {!hasTarget && <p className="alert alert-warn">Set daily targets on the Targets page to see gaps and use auto-fit.</p>}
        <CompareTable nutrition={nutrition} target={target} />
      </div>

      <div className="card stack">
        <div className="row row-between">
          <h2>Ingredients per serving</h2>
          <div className="row no-print">
            <button className="btn btn-sm" onClick={() => { setAmounts(original); setRemoved(new Set()); setFit(null) }}>Reset</button>
            <button className="btn btn-sm btn-primary" disabled={!hasTarget} onClick={runFit}>Auto-fit to my macros</button>
          </div>
        </div>
        {rows.map((ri) => (
          <div className="ing-row" key={ri.ingredient_id}>
            <div>
              <strong>{ri.ingredient.name}</strong>
              <div className="muted small">original: {formatAmount(original[ri.ingredient_id], ri.ingredient).text}</div>
            </div>
            <AmountInput
              ingredient={ri.ingredient} label={ri.ingredient.name}
              value={amounts[ri.ingredient_id] ?? 0}
              onChange={(v) => setAmounts({ ...amounts, [ri.ingredient_id]: v })}
            />
            <button
              type="button" className="btn btn-sm btn-danger" disabled={rows.length === 1}
              aria-label={`Remove ${ri.ingredient.name}`} title={rows.length === 1 ? 'A recipe needs at least one ingredient' : 'Leave this ingredient out'}
              onClick={() => remove(ri.ingredient_id)}
            >✕</button>
          </div>
        ))}
        {removedRows.length > 0 && (
          <div className="stack-sm">
            <span className="muted small">Left out:</span>
            <div className="row">
              {removedRows.map((ri) => (
                <button type="button" key={ri.ingredient_id} className="btn btn-sm" onClick={() => addBack(ri.ingredient_id)} aria-label={`Add back ${ri.ingredient.name}`}>
                  + {ri.ingredient.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {fit && (
        <FitPreview
          fit={fit} target={target}
          onAccept={() => { setAmounts({ ...amounts, ...fit.result.amounts }); setFit(null) }}
          onCancel={() => setFit(null)}
          names={Object.fromEntries(rows.map((r) => [r.ingredient_id, r.ingredient.name]))}
        />
      )}

      {error && <div className="alert alert-error">{error}</div>}
      <div className="card stack">
        <h2>Keep this adjustment</h2>
        <p className="muted small">The original recipe is never changed.</p>
        {hasZero && <p className="alert alert-warn">Every ingredient needs an amount above zero. Use ✕ to leave one out.</p>}
        {hasNone && <p className="alert alert-warn">A recipe needs at least one ingredient.</p>}
        {!userId && (
          <p className="muted small">
            To keep your own copy, <Link to="/sign-in" state={{ from: loc.pathname }}>sign in</Link> or <Link to="/sign-up" state={{ from: loc.pathname }}>create a free account</Link>.
            You can still use this adjustment in your plan.
          </p>
        )}
        {isSaved && saved && (
          <div className="alert alert-ok">Saved to My recipes. <Link to={`/recipes/${saved.id}`}>View it</Link>. This plan still uses the amounts above.</div>
        )}
        <div className="row">
          {onUseInPlan && <button className="btn btn-primary" disabled={hasZero || hasNone} onClick={() => onUseInPlan(amounts)}>Use in this plan only</button>}
          <button className="btn" disabled={saving || hasZero || hasNone || !userId || isSaved} onClick={() => save('copy')}>
            {saving ? 'Saving…' : isSaved ? 'Saved ✓' : isOwn ? 'Save as new in My recipes' : 'Save copy to My recipes'}
          </button>
          {isOwn && <button className="btn" disabled={saving || hasZero || hasNone || isSaved} onClick={() => save('overwrite')}>Overwrite this recipe</button>}
        </div>
      </div>
    </div>
  )
}

function CompareTable({ nutrition, target }: { nutrition: Nutrition; target: Partial<Nutrition> }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th></th><th className="num">Serving</th><th className="num">Target</th><th className="num">Gap</th></tr></thead>
        <tbody>
          {NUTRIENTS.map((n) => (
            <tr key={n}>
              <th scope="row">{NUTRIENT_LABEL[n]} ({NUTRIENT_UNIT[n]})</th>
              <td className="num">{fmt(n, nutrition[n])}</td>
              <td className="num">{target[n] != null ? fmt(n, target[n]!) : '—'}</td>
              <td className={`num ${gapClass(nutrition[n], target[n])}`}>{target[n] != null ? signed(n, nutrition[n] - target[n]!) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FitPreview({ fit, target, names, onAccept, onCancel }: {
  fit: { before: Nutrition; result: FitResult }
  target: Partial<Nutrition>
  names: Record<string, string>
  onAccept: () => void
  onCancel: () => void
}) {
  const { result, before } = fit
  const missed = (['calories', 'protein', 'carbs', 'fat'] as const).filter((n) => target[n] != null && !result.met[n])
  return (
    <div className="card stack" role="region" aria-label="Auto-fit result">
      <h2>Auto-fit result</h2>
      {result.allMet ? (
        <div className="alert alert-ok">Calories, protein, carbs and fat are all within {TOLERANCE * 100}% of your target.</div>
      ) : (
        <div className="alert alert-warn">
          Couldn't reach {missed.map((n) => NUTRIENT_LABEL[n].toLowerCase()).join(', ')} within 50%–200% of the original
          amounts{result.atBound.length ? ` (limits hit: ${result.atBound.map((id) => names[id]).join(', ')})` : ''}. This is the closest result.
        </div>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th></th><th className="num">Before</th><th className="num">After</th><th className="num">Target</th></tr></thead>
          <tbody>
            {NUTRIENTS.map((n) => (
              <tr key={n}>
                <th scope="row">{NUTRIENT_LABEL[n]}</th>
                <td className="num">{fmt(n, before[n])}</td>
                <td className={`num ${gapClass(result.nutrition[n], target[n])}`}>{fmt(n, result.nutrition[n])}</td>
                <td className="num">{target[n] != null ? fmt(n, target[n]!) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row">
        <button className="btn btn-primary" onClick={onAccept}>Accept (then tweak if you like)</button>
        <button className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
