import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { AdjustPanel } from '../components/AdjustPanel'
import { RecipeCard } from '../components/RecipeCard'
import { Stepper } from '../components/Stepper'
import { fetchPlan, fetchRecipes, replacePlanItems, updatePlan } from '../lib/api'
import { parseHave, recipeMatch } from '../lib/have'
import { mealTargets } from '../lib/nutrition'
import { emptyPrefs, passesPrefs, prefsOf } from '../lib/suggest'
import { CATEGORIES } from '../lib/types'
import type { Amounts, MealCategory, PlanPreferences, Recipe } from '../lib/types'
import { useAsync } from '../lib/useAsync'
import { useHidden } from '../lib/useHidden'

interface Selection {
  meals: number
  overrides: Amounts | null
}

/** A selection is a recipe in a meal slot: any recipe can fill any slot, and one recipe can fill several. */
const selKey = (slot: MealCategory, recipeId: string) => `${slot}|${recipeId}`
const splitKey = (key: string) => key.split('|') as [MealCategory, string]
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

export function PlanChoose() {
  const { id } = useParams()
  const { userId, profile } = useAuth()
  const navigate = useNavigate()
  const [sel, setSel] = useState<Record<string, Selection>>({})
  const [loaded, setLoaded] = useState(false)
  const [tabs, setTabs] = useState<Record<string, 'recommended' | 'mine'>>({})
  const [types, setTypes] = useState<Record<string, MealCategory | 'all'>>({})
  // What's in the fridge ("turkey, chicken, spinach"), starting from what was entered on the first screen and saved back to the plan.
  const [prefs, setPrefs] = useState<PlanPreferences>(emptyPrefs)
  const [haveText, setHaveText] = useState('')
  const [applyPrefs, setApplyPrefs] = useState(true)
  const { hidden, hide, unhide } = useHidden()
  const [justHidden, setJustHidden] = useState<{ id: string; name: string } | null>(null)
  const terms = useMemo(() => parseHave(haveText), [haveText])
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const changeHave = (v: string) => {
    setHaveText(v)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { if (id) updatePlan(id, { preferences: { ...prefs, have: v } }).catch(() => {}) }, 600)
  }
  const hasFilters = prefs.diets.length > 0 || parseHave(prefs.dislikes).length > 0
  const [adjusting, setAdjusting] = useState<{ recipe: Recipe; slot: MealCategory } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const data = useAsync(async () => {
    const [{ plan, items }, recipes] = await Promise.all([fetchPlan(id!), fetchRecipes('all')])
    setSel(Object.fromEntries(items.filter((i) => i.recipe_id).map((i) => [selKey(i.category, i.recipe_id!), { meals: i.meals, overrides: i.amount_overrides }])))
    const p = prefsOf(plan)
    setPrefs(p)
    setHaveText(p.have)
    setLoaded(true)
    return { plan, recipes }
  }, [id])

  const recipes = useMemo(() => data.data?.recipes ?? [], [data.data])
  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes])
  const counts = data.data?.plan.counts

  const toItems = (s: Record<string, Selection>) =>
    Object.entries(s)
      .map(([key, v]) => ({ key, v, slot: splitKey(key)[0], rid: splitKey(key)[1] }))
      .filter(({ v, slot, rid }) => v.meals > 0 && byId.has(rid) && (counts?.[slot] ?? 0) > 0)
      .map(({ v, slot, rid }) => ({ recipe_id: rid, category: slot, meals: v.meals, amount_overrides: v.overrides, snapshot: null }))

  // Autosave selections so nothing is lost when leaving to save an adjusted copy.
  const first = useRef(true)
  useEffect(() => {
    if (!loaded || !id) return
    if (first.current) { first.current = false; return }
    const t = setTimeout(() => replacePlanItems(id, toItems(sel)).catch((e) => setError(e.message)), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel])

  if (data.loading && !loaded) return <p className="muted">Loading…</p>
  if (data.error || !counts) return <div className="alert alert-error">{data.error ?? 'Plan not found'}</div>

  const assigned = (slot: MealCategory) =>
    Object.entries(sel).reduce((a, [key, v]) => a + (splitKey(key)[0] === slot && v.meals > 0 ? 1 : 0), 0)
  const active = CATEGORIES.filter((c) => counts[c] > 0)
  const ready = active.every((c) => assigned(c) === counts[c])
  const setMeals = (slot: MealCategory, rid: string, meals: number) =>
    setSel({ ...sel, [selKey(slot, rid)]: { overrides: sel[selKey(slot, rid)]?.overrides ?? null, meals: Math.max(0, meals) } })
  const remove = (slot: MealCategory, rid: string) => { const { [selKey(slot, rid)]: _, ...rest } = sel; setSel(rest) }

  // Creating a recipe needs an account; guests sign up first and are sent on to the editor, then back here.
  const returnTo = `/plan/${id}/choose`
  const createRecipe = (category: MealCategory, label: string, cls = 'btn btn-sm') =>
    userId ? (
      <Link className={cls} to="/my-recipes/new" state={{ returnTo, category }}>{label}</Link>
    ) : (
      <Link className={cls} to="/sign-up" state={{ from: '/my-recipes/new', returnTo, category }}>{label}</Link>
    )

  const have = (r: Recipe) => ({ have: recipeMatch(r, terms).count, total: r.recipe_ingredients.length })

  const cont = async () => {
    try {
      await replacePlanItems(id!, toItems(sel))
      navigate(`/plan/${id}/review`)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="stack">
      <Stepper current={2} planId={id} />
      <h1>Choose recipes</h1>
      <p className="muted">Any recipe can go in any meal. A dinner recipe can be your lunch, and you can use the same recipe in more than one meal.</p>
      <div className="card stack-sm">
        <label htmlFor="have-input"><strong>What do you have?</strong> <span className="muted small">Optional. Separate with commas.</span></label>
        <div className="row">
          <input
            id="have-input" className="input grow" value={haveText} placeholder="turkey, chicken, spinach"
            onChange={(e) => changeHave(e.target.value)}
          />
          {haveText && <button type="button" className="btn btn-sm" onClick={() => changeHave('')}>Clear</button>}
        </div>
        {terms.length > 0 && <span className="muted small">Showing recipes that use {terms.join(', ')}, best matches first.</span>}
        {hasFilters && (
          <label className="row small">
            <input type="checkbox" checked={applyPrefs} onChange={(e) => setApplyPrefs(e.target.checked)} /> Hide recipes that don't fit my diet and dislikes
          </label>
        )}
      </div>
      {active.map((c) => {
        const tab = tabs[c] ?? 'recommended'
        const type = types[c] ?? 'all'
        let list = recipes.filter((r) =>
          (tab === 'recommended' ? r.owner_id === null : userId !== null && r.owner_id === userId) && (type === 'all' || r.category === type) &&
          (!applyPrefs || passesPrefs(r, prefs)) && !hidden.has(r.id))
        // Recipes made for this meal come first; ingredient matches outrank that when you've listed what you have.
        const fits = (r: Recipe) => (r.category === c ? 0 : 1)
        if (terms.length) {
          const score = new Map(list.map((r) => [r.id, recipeMatch(r, terms)]))
          list = list.filter((r) => score.get(r.id)!.count > 0)
            .sort((a, b) => score.get(b.id)!.terms.length - score.get(a.id)!.terms.length || score.get(b.id)!.count - score.get(a.id)!.count || fits(a) - fits(b))
        } else {
          list = [...list].sort((a, b) => fits(a) - fits(b))
        }
        const n = assigned(c)
        return (
          <section key={c} className="stack" aria-label={c}>
            <div className="row row-between">
              <h2>{cap(c)} <span className={`badge ${n === counts[c] ? 'badge-ok' : 'badge-warn'}`}>{n} of {counts[c]} {counts[c] === 1 ? 'recipe' : 'recipes'} chosen</span></h2>
              <div className="row">
                {createRecipe(c, '+ Create my own')}
                <select className="select" aria-label={`Recipe type shown for ${c}`} value={type} onChange={(e) => setTypes({ ...types, [c]: e.target.value as MealCategory | 'all' })}>
                  <option value="all">All recipes</option>
                  {CATEGORIES.map((t) => <option key={t} value={t}>{cap(t)} recipes</option>)}
                </select>
                <div className="tabs" role="tablist">
                  {(['recommended', 'mine'] as const).map((t) => (
                    <button key={t} role="tab" aria-selected={tab === t} className="tab" onClick={() => setTabs({ ...tabs, [c]: t })}>{t === 'mine' ? 'My recipes' : 'Recommended'}</button>
                  ))}
                </div>
              </div>
            </div>
            {n > counts[c] && <div className="alert alert-warn">You've chosen more than {counts[c]} {c} {counts[c] === 1 ? 'recipe' : 'recipes'}.</div>}
            {list.length === 0 && (
              <p className="muted">
                {terms.length > 0 ? `No recipes here use ${terms.join(', ')}. Try removing one.`
                  : tab !== 'mine' ? 'No recipes.'
                  : userId ? <>No recipes of your own yet. {createRecipe(c, 'Create one', 'link')}.</>
                  : <><Link to="/sign-in" state={{ from: `/plan/${id}/choose` }}>Sign in</Link> to use your own recipes.</>}
              </p>
            )}
            <div className="grid-cards">
              {list.map((r) => {
                const s = sel[selKey(c, r.id)]
                return (
                  <RecipeCard key={r.id} recipe={r} selected={!!s && s.meals > 0} have={have(r)} actions={<>
                    {s && s.meals > 0 ? (
                      <>
                        <div className="stepper-ctl">
                          <button aria-label={`Fewer ${r.name}`} onClick={() => setMeals(c, r.id, s.meals - 1)}>−</button>
                          <output aria-label={`${r.name} meals`}>{s.meals}</output>
                          <button aria-label={`More ${r.name}`} onClick={() => setMeals(c, r.id, s.meals + 1)}>+</button>
                        </div>
                        <button className="btn btn-sm btn-ghost" onClick={() => remove(c, r.id)}>Remove</button>
                      </>
                    ) : (
                      <button className="btn btn-sm btn-primary" onClick={() => setMeals(c, r.id, r.servings)}>Add</button>
                    )}
                    <button className="btn btn-sm" onClick={() => setAdjusting({ recipe: r, slot: c })}>Adjust</button>
                    {!(s && s.meals > 0) && (
                      <button
                        className="btn btn-sm btn-ghost"
                        title="Hides this recipe from every future suggestion. You can bring it back from the Hidden recipes page."
                        onClick={() => { hide(r.id); setJustHidden({ id: r.id, name: r.name }) }}
                      >Never show again</button>
                    )}
                    {s?.overrides && <span className="badge badge-accent">adjusted</span>}
                  </>} />
                )
              })}
            </div>
          </section>
        )
      })}
      {error && <div className="alert alert-error">{error}</div>}
      {justHidden && hidden.has(justHidden.id) && (
        <div className="alert alert-ok" role="status">
          <strong>"{justHidden.name}" is hidden for good.</strong> It won't be suggested again in any plan.{' '}
          <button className="btn btn-sm" onClick={() => { unhide(justHidden.id); setJustHidden(null) }}>Undo</button>{' '}
          <Link to="/hidden">See all hidden recipes</Link>
        </div>
      )}
      <div className="sticky-bar">
        <span className="muted small">{ready ? 'All recipes chosen.' : 'Choose the number of recipes you asked for in each meal to continue.'}</span>
        <div className="row">
          <Link className="btn" to={`/plan/setup/meals?plan=${id}`}>← Back</Link>
          <button className="btn btn-primary" disabled={!ready} onClick={cont}>Review →</button>
        </div>
      </div>

      {adjusting && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Adjust ${adjusting.recipe.name}`}>
          <div className="modal stack">
            <div className="row row-between"><h2>{adjusting.recipe.name} <span className="muted small">for {adjusting.slot}</span></h2><button className="btn btn-sm" onClick={() => setAdjusting(null)}>Close</button></div>
            <AdjustPanel
              recipe={adjusting.recipe}
              target={mealTargets(profile, adjusting.slot)}
              initialAmounts={sel[selKey(adjusting.slot, adjusting.recipe.id)]?.overrides ?? undefined}
              returnTo={`/plan/${id}/choose`}
              onUseInPlan={(amounts) => {
                const { recipe, slot } = adjusting
                const key = selKey(slot, recipe.id)
                setSel({ ...sel, [key]: { meals: sel[key]?.meals || recipe.servings, overrides: amounts } })
                setAdjusting(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
