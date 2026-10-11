import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { RecipeCard } from '../components/RecipeCard'
import { Stepper } from '../components/Stepper'
import { fetchPlan, fetchRecipes, replacePlanItems } from '../lib/api'
import { DIETS } from '../lib/diet'
import { mealTargets, round } from '../lib/nutrition'
import { parseHave, recipeMatch } from '../lib/have'
import { prefsOf, sameMealType, suggest } from '../lib/suggest'
import type { Suggestion } from '../lib/suggest'
import { CATEGORIES, NUTRIENT_LABEL } from '../lib/types'
import type { Amounts, MealCategory, Nutrition } from '../lib/types'
import { useAsync } from '../lib/useAsync'
import { useHidden } from '../lib/useHidden'

const PER_PAGE = 6
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
const SHOWN = ['calories', 'protein', 'carbs', 'fat'] as const

/** A recipe picked for this meal type and the portions it will make (changed on the review page). */
interface Chosen {
  recipe_id: string
  meals: number
  overrides: Amounts | null
}

/**
 * One screen per meal type: pick the number of different recipes you asked for on the setup screen.
 * Each starts at its own serving count; you set portions on the review page.
 */
export function PlanPick() {
  const { id, slot } = useParams()
  const { profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [browsing, setBrowsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [fit, setFit] = useState(true)
  const [chosen, setChosen] = useState<Chosen[]>([])
  const { hidden, hide, unhide } = useHidden()
  const [justHidden, setJustHidden] = useState<{ id: string; name: string } | null>(null)
  // Recipes load once; the saved picks reload on each meal screen so Back always shows what you chose.
  const recipesQ = useAsync(() => fetchRecipes('all'), [])
  const planQ = useAsync(() => fetchPlan(id!), [id, slot])

  // The same component serves every meal screen, so reset per-screen state when the meal changes.
  // (Without clearing `busy`, the buttons stayed disabled after the first pick.)
  useEffect(() => { setPage(0); setBrowsing(false); setBusy(false); setError(null); setJustHidden(null) }, [slot])

  const plan = planQ.data?.plan
  const recipes = recipesQ.data
  const prefs = useMemo(() => (plan ? prefsOf(plan) : null), [plan])
  const slots = plan ? CATEGORIES.filter((c) => plan.counts[c] > 0) : []
  const current = slot as MealCategory | undefined

  // Start from what's already saved for this meal type.
  useEffect(() => {
    if (!planQ.data || !current) return
    setChosen(planQ.data.items.filter((i) => i.category === current && i.recipe_id).map((i) => ({ recipe_id: i.recipe_id!, meals: i.meals, overrides: i.amount_overrides })))
  }, [planQ.data, current])

  const target = useMemo(() => (current ? mealTargets(profile, current) : {}), [profile, current])
  const hasMacros = (['calories', 'protein', 'carbs', 'fat'] as const).some((k) => (target[k] ?? 0) > 0)
  const ranked = useMemo(
    () => (recipes && prefs && current && slots.includes(current) ? suggest(recipes.filter((r) => !hidden.has(r.id)), current, target, prefs, { fit: fit && hasMacros }) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipes, prefs, current, target, fit, hasMacros, hidden],
  )

  const err = recipesQ.error ?? planQ.error
  if (err) return <div className="alert alert-error">{err}</div>
  if (!plan || !recipes || !prefs || authLoading) return <p className="muted">Loading…</p>
  if (slots.length === 0) return <div className="alert alert-warn">This plan has no meals. <Link to={`/plan/setup/meals?plan=${id}`}>Set up your meals</Link></div>
  if (!current || !slots.includes(current)) return <Navigate to={`/plan/${id}/pick/${slots[0]}`} replace />

  const idx = slots.indexOf(current)
  const next = slots[idx + 1]
  const prev = slots[idx - 1]
  const asked = plan.counts[current]
  const haveTerms = parseHave(prefs.have)
  // Can't pick more recipes than there are to choose from.
  const pool = new Set([...ranked.map((s) => s.recipe.id), ...chosen.map((c) => c.recipe_id)]).size
  const need = Math.max(1, Math.min(asked, pool))
  const chosenIds = new Set(chosen.map((c) => c.recipe_id))
  const complete = chosen.length === need
  const goNext = next ? `/plan/${id}/pick/${next}` : `/plan/${id}/review`

  // Cycle through the ranked list a page at a time; picks stay on screen even if they rank lower.
  const pages = Math.max(1, Math.ceil(ranked.length / PER_PAGE))
  const start = (page % pages) * PER_PAGE
  const pinned = ranked.filter((s) => chosenIds.has(s.recipe.id))
  const options = browsing
    ? ranked // "Browse all recipes": the whole ranked list, right here
    : [...pinned, ...ranked.slice(start, start + PER_PAGE).filter((s) => !chosenIds.has(s.recipe.id))].slice(0, Math.max(PER_PAGE, pinned.length))

  /** Show the new picks at once, save them, and optionally move on to the next meal type. */
  const apply = async (list: Chosen[], advance = false) => {
    setChosen(list)
    setBusy(true)
    setError(null)
    try {
      // Re-read the saved picks so other screens' choices are never overwritten with stale data.
      const { items } = await fetchPlan(id!)
      const others = items.filter((i) => i.category !== current).map(({ id: _i, plan_id: _p, ...rest }) => rest)
      await replacePlanItems(id!, [
        ...others,
        ...list.map((c) => ({ recipe_id: c.recipe_id, category: current, meals: c.meals, amount_overrides: c.overrides, snapshot: null })),
      ])
      if (advance) { navigate(goNext); return }
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  const pick = (s: Suggestion) => {
    const kept = chosen.find((c) => c.recipe_id === s.recipe.id)
    const entry: Chosen = { recipe_id: s.recipe.id, meals: kept?.meals ?? s.recipe.servings, overrides: s.fitted ? s.fitted.amounts : null }
    if (need === 1) return apply([entry], true) // one recipe for this meal type: pick it and move on
    if (chosen.length >= need) return
    apply([...chosen, entry])
  }
  const unpick = (rid: string) => apply(chosen.filter((c) => c.recipe_id !== rid))

  const targetLine = (n: Nutrition) =>
    SHOWN.filter((k) => target[k] != null).map((k) => `${NUTRIENT_LABEL[k].toLowerCase()} ${round(n[k], k === 'calories' ? 0 : 1)} / ${round(target[k]!, k === 'calories' ? 0 : 1)}`).join(' · ')

  const dietNames = DIETS.filter((d) => prefs.diets.includes(d.key)).map((d) => d.label.toLowerCase())
  const nameOf = (rid: string) => recipes.find((r) => r.id === rid)?.name ?? 'recipe'

  return (
    <div className="stack">
      <Stepper current={2} planId={id} />
      <div className="row row-between">
        <h1>{cap(current)}</h1>
        <span className="muted small">Meal {idx + 1} of {slots.length}</span>
      </div>
      {need === 1 ? (
        <p className="muted">
          Pick one {current} recipe. You'll choose how many portions to make on the review page.
          {hasMacros && ' Under each recipe: its numbers per serving / your target for this meal.'}
        </p>
      ) : (
        <p className="muted">
          Pick {need} different {current} recipes. You'll choose how many portions of each to make on the review page.
          {hasMacros && ' Under each recipe: its numbers per serving / your target for this meal.'}
        </p>
      )}
      {need < asked && (
        <div className="alert alert-warn">Only {pool} recipe{pool === 1 ? '' : 's'} match your preferences, so you'll pick {need} instead of {asked}.</div>
      )}
      {hasMacros && (
        <label className="row small">
          <input type="checkbox" checked={fit} onChange={(e) => setFit(e.target.checked)} />
          Adjust portions to hit my macros (recipes are ranked and shown after adjusting; you can still tweak on the review page)
        </label>
      )}

      {options.length === 0 && (
        <div className="alert alert-warn">
          No recipes match {dietNames.length ? `your diet settings (${dietNames.join(', ')})` : 'your preferences'}{prefs.dislikes.trim() ? ` without ${prefs.dislikes.trim()}` : ''}.{' '}
          <Link to={`/plan/setup/meals?plan=${id}`}>Loosen your preferences</Link> or <Link to={`/my-recipes/new`} state={{ returnTo: `/plan/${id}/pick/${current}`, category: current }}>create your own recipe</Link>.
        </div>
      )}
      <div className="grid-cards">
        {options.map((s) => {
          const c = chosen.find((x) => x.recipe_id === s.recipe.id)
          return (
            <RecipeCard
              key={s.recipe.id} recipe={s.recipe} selected={!!c} nutrition={s.fitted?.nutrition}
              have={s.uses.length ? { have: recipeMatch(s.recipe, haveTerms).count, total: s.recipe.recipe_ingredients.length } : undefined}
              actions={
                <div className="stack-sm" style={{ flexBasis: '100%' }}>
                  {s.uses.length > 0 && <div className="small">Uses your {s.uses.join(', ')}</div>}
                  {!sameMealType(s.recipe.category, current) && <div className="row"><span className="badge">a {s.recipe.category} recipe</span></div>}
                  {hasMacros && <div className="muted small">{targetLine(s.fitted?.nutrition ?? s.nutrition)}</div>}
                  {s.fitted && !s.fitted.allMet && <div className="muted small">Closest this recipe can get to all four targets.</div>}
                  {c && need > 1 ? (
                    <div className="row">
                      <span className="badge badge-ok">Chosen</span>
                      <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => unpick(s.recipe.id)}>Remove</button>
                    </div>
                  ) : (
                    <div className="row">
                      <button className="btn btn-primary" disabled={busy || (need > 1 && chosen.length >= need)} onClick={() => pick(s)}>
                        {c ? 'Keep this one' : need > 1 ? `Add to my ${current}` : `Use for my ${current}`}
                      </button>
                      {!c && (
                        <button
                          className="btn btn-sm btn-ghost"
                          title="Hides this recipe from every future suggestion. You can bring it back from the Hidden recipes page."
                          onClick={() => { hide(s.recipe.id); setJustHidden({ id: s.recipe.id, name: s.recipe.name }) }}
                        >Never show again</button>
                      )}
                    </div>
                  )}
                </div>
              }
            />
          )
        })}
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {justHidden && hidden.has(justHidden.id) && (
        <div className="alert alert-ok" role="status">
          <strong>"{justHidden.name}" is hidden for good.</strong> It won't be suggested again in any plan.{' '}
          <button className="btn btn-sm" onClick={() => { unhide(justHidden.id); setJustHidden(null) }}>Undo</button>{' '}
          <Link to="/hidden">See all hidden recipes</Link>
        </div>
      )}

      <div className="sticky-bar">
        <div className="row">
          {!browsing && ranked.length > PER_PAGE && <button className="btn" onClick={() => setPage((page + 1) % pages)}>Show different options</button>}
          {ranked.length > PER_PAGE && (
            <button className="btn btn-ghost" aria-pressed={browsing} onClick={() => setBrowsing(!browsing)}>
              {browsing ? `Show fewer recipes` : `Browse all recipes (${ranked.length})`}
            </button>
          )}
          {hidden.size > 0 && <Link className="btn btn-ghost" to="/hidden">Hidden recipes ({hidden.size})</Link>}
        </div>
        <div className="row">
          {need > 1 && (
            <span className="muted small">
              {chosen.length === 0 ? `Pick ${need}` : chosen.map((c) => nameOf(c.recipe_id)).join(' · ')}
            </span>
          )}
          <Link className="btn" to={prev ? `/plan/${id}/pick/${prev}` : `/plan/${id}/goals`}>← Back</Link>
          {complete ? (
            <Link className="btn btn-primary" to={goNext}>{next ? 'Next meal →' : 'Review →'}</Link>
          ) : need > 1 ? (
            <button className="btn btn-primary" disabled>Pick {need - chosen.length} more</button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
