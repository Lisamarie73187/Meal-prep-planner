import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { createIngredient, deleteIngredient, recipesUsingIngredient, updateIngredient } from '../lib/api'
import { guessContains, TAGS, TAG_LABEL } from '../lib/diet'
import { lookupFoods } from '../lib/foodLookup'
import type { FoodHit } from '../lib/foodLookup'
import { formValues, isAllZero, rebase, savedValues } from '../lib/ingredientEdit'
import { estimateIngredients } from '../lib/ingredientEstimate'
import { NUTRIENTS, NUTRIENT_LABEL, NUTRIENT_UNIT, SECTIONS } from '../lib/types'
import type { Ingredient, IngredientTag, Nutrient, StoreSection } from '../lib/types'

const UNIT_NAME = { g: 'grams', ml: 'millilitres', each: 'each (counted)' } as const

/**
 * Create a new ingredient, or edit an existing one (`existing`). Editing keeps the unit it is stored in, because every recipe
 * amount is saved in that unit; name, aisle, density, diet flags and nutrition can all change, and recipes follow.
 */
export function IngredientModal({ existing, initialName = '', scope = 'user', onClose, onSaved, onDeleted }: {
  existing?: Ingredient
  initialName?: string
  scope?: 'user' | 'recommended'
  onClose: () => void
  onSaved: (ing: Ingredient) => void
  /** When given (and editing), a Delete button is offered. */
  onDeleted?: (ing: Ingredient) => void
}) {
  const { userId } = useAuth()
  const [name, setName] = useState(existing?.name ?? initialName)
  // Grams unless the AI says it's a liquid (ml). There is no unit picker for new ingredients for now: Fill in with AI works it out.
  const [unit, setUnit] = useState<string>(existing?.base_unit ?? 'g')
  const [section, setSection] = useState<StoreSection>(existing?.store_section ?? 'other')
  const [density, setDensity] = useState(existing?.density_g_per_ml != null ? String(existing.density_g_per_ml) : '')
  const [vals, setVals] = useState<Record<Nutrient, string>>(() => existing ? formValues(existing) : { calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '' })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [zeroOk, setZeroOk] = useState(false)
  // Deleting: check what uses it, refuse if recipes do, otherwise ask once.
  const [del, setDel] = useState<'idle' | 'checking' | 'blocked' | 'confirm' | 'deleting'>('idle')
  const [usedBy, setUsedBy] = useState<string[]>([])
  const base = unit as Ingredient['base_unit']
  const perLabel = base === 'each' ? '1 each' : `100 ${base}`
  const [hits, setHits] = useState<{ generic: FoodHit[]; branded: FoodHit[] } | null>(null)
  // Diet flags start as a guess from the name; once you touch a checkbox the guess stops overwriting your choice.
  // An existing ingredient keeps the flags it was saved with.
  const [contains, setContains] = useState<IngredientTag[]>(() => existing?.contains ?? guessContains(initialName))
  const [containsTouched, setContainsTouched] = useState(!!existing)
  useEffect(() => { if (!containsTouched) setContains(guessContains(name)) }, [name, containsTouched])
  const [looking, setLooking] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [filledFrom, setFilledFrom] = useState<string | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Look up nutrition for the name as it's typed (new ingredients only; debounced; skipped for very short names).
  useEffect(() => {
    const q = name.trim()
    setLookupError(null)
    if (existing || q.length < 3) { setHits(null); return }
    const ctl = new AbortController()
    const t = setTimeout(async () => {
      setLooking(true)
      try {
        setHits(await lookupFoods(q, ctl.signal))
      } catch (err) {
        if (!ctl.signal.aborted) { setHits(null); setLookupError((err as Error).message) }
      } finally {
        if (!ctl.signal.aborted) setLooking(false)
      }
    }, 600)
    return () => { clearTimeout(t); ctl.abort(); setLooking(false) }
  }, [name, existing])

  // USDA values are per 100 g. A new ingredient switches to grams; an existing one keeps its unit.
  const fill = (h: FoodHit) => {
    setZeroOk(false)
    setUnit('g')
    setVals(Object.fromEntries(NUTRIENTS.map((k) => [k, String(Math.round(h.per100g[k] * 100) / 100)])) as Record<Nutrient, string>)
    setFilledFrom(h.brand ? `${h.name} (${h.brand})` : h.name)
  }

  // Ask AI for the nutrition of the typed name (on request, since each ask costs a little). Fills everything for you to check.
  const fillWithAI = async () => {
    setAiBusy(true)
    setAiError(null)
    try {
      const { items } = await estimateIngredients([name.trim()])
      const est = items[0]
      if (!est) throw new Error("Couldn't get reliable numbers for that. Pick a match below or enter them by hand.")
      let per100 = est.per100
      if (existing) {
        // Keep the unit this ingredient is stored in; convert the estimate to it with the density when they differ.
        if (existing.base_unit === 'each') throw new Error('This ingredient is counted (each), so the AI can’t fill it in. Enter the numbers by hand.')
        per100 = rebase(est.per100, est.base_unit, existing.base_unit, est.density_g_per_ml)
      } else {
        setUnit(est.base_unit)
      }
      setZeroOk(false)
      setSection(est.store_section)
      setDensity(String(est.density_g_per_ml))
      setVals(Object.fromEntries(NUTRIENTS.map((k) => [k, String(Math.round(per100[k] * 100) / 100)])) as Record<Nutrient, string>)
      setFilledFrom('an AI estimate')
    } catch (err) {
      setAiError((err as Error).message)
    }
    setAiBusy(false)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation() // React events bubble through the portal; don't let the recipe form see this submit
    const n = savedValues(vals, base)
    // All zeros is almost always a mistake (it adds nothing to a recipe), so ask once before saving it.
    if (isAllZero(n) && !zeroOk) { setZeroOk(true); setError(null); return }
    setSaving(true)
    setError(null)
    try {
      const d = parseFloat(density)
      const common = { name: name.trim(), store_section: section, density_g_per_ml: base !== 'each' && d > 0 ? d : null, contains, ...n }
      const ing = existing
        ? await updateIngredient(existing.id, common)
        : await createIngredient({ owner_id: scope === 'user' ? userId : null, base_unit: base, ...common })
      onSaved(ing)
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  const startDelete = async () => {
    setError(null)
    setDel('checking')
    try {
      const names = await recipesUsingIngredient(existing!.id)
      setUsedBy(names)
      setDel(names.length > 0 ? 'blocked' : 'confirm')
    } catch (err) {
      setError((err as Error).message)
      setDel('idle')
    }
  }
  const confirmDelete = async () => {
    setDel('deleting')
    setError(null)
    try {
      await deleteIngredient(existing!.id)
      onDeleted!(existing!)
    } catch (err) {
      setError((err as Error).message)
      setDel('idle')
    }
  }

  const zeroWarning = zeroOk && isAllZero(savedValues(vals, base))
  const title = existing ? `Edit ingredient${existing.owner_id ? ' (private to you)' : ' (shared with everyone)'}` : `New ingredient${scope === 'user' ? ' (private to you)' : ' (recommended)'}`

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={existing ? 'Edit ingredient' : 'New ingredient'}>
      <form className="modal stack" onSubmit={submit}>
        <h2>{title}</h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="ni-name">Name</label>
            <input id="ni-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ni-section">Store section</label>
            <select id="ni-section" className="select" value={section} onChange={(e) => setSection(e.target.value as StoreSection)}>
              {SECTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          {base !== 'each' && (
            <div className="field">
              <label htmlFor="ni-density">Density, g per ml (optional)</label>
              <input id="ni-density" className="input" type="number" min="0" step="any" value={density} onChange={(e) => setDensity(e.target.value)} placeholder="e.g. 0.78 for dry rice" />
            </div>
          )}
        </div>
        {existing && <p className="muted small">Measured in <strong>{UNIT_NAME[existing.base_unit]}</strong>. The unit can't change because every recipe amount is saved in it. Recipes that use this ingredient update automatically.</p>}
        <div className="stack-sm" aria-live="polite">
          <strong className="small">Look up nutrition</strong>
          <div className="row">
            <button type="button" className="btn btn-sm btn-primary" disabled={aiBusy || name.trim().length < 2} onClick={fillWithAI}>
              {aiBusy ? 'Asking AI…' : 'Fill in with AI'}
            </button>
            <span className="muted small">Works out the aisle, density and nutrition for "{name.trim() || '…'}".</span>
          </div>
          {aiError && <div className="alert alert-error small" role="alert">{aiError}</div>}
          {looking && <div className="muted small">Searching…</div>}
          {lookupError && <div className="muted small">USDA search: {lookupError} You can still use Fill in with AI or enter values by hand.</div>}
          {hits && !looking && hits.generic.length + hits.branded.length === 0 && <div className="muted small">No USDA matches. Use Fill in with AI or enter values by hand.</div>}
          {hits && !looking && ([['Foods', hits.generic], ['Packaged products', hits.branded]] as const).map(([label, list]) => list.length > 0 && (
            <div key={label} className="stack-sm">
              <span className="muted small">{label}</span>
              {list.map((h) => (
                <button type="button" key={h.id} className="btn btn-sm" onClick={() => fill(h)}>
                  {h.name}{h.brand ? ` · ${h.brand}` : ''} — {h.per100g.calories} kcal, {h.per100g.protein}g protein / 100 g
                </button>
              ))}
            </div>
          ))}
          {filledFrom && <div className="alert alert-ok small" role="status">Filled from {filledFrom}. Check the numbers below and adjust if needed.</div>}
        </div>
        <fieldset className="stack-sm">
          <legend className="small"><strong>Contains</strong> <span className="muted">(used for vegetarian, vegan, dairy-free and gluten-free filters)</span></legend>
          <div className="row">
            {TAGS.map((t) => (
              <label key={t} className="row small">
                <input
                  type="checkbox" checked={contains.includes(t)}
                  onChange={() => { setContainsTouched(true); setContains(contains.includes(t) ? contains.filter((x) => x !== t) : [...contains, t]) }}
                /> {TAG_LABEL[t]}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="muted small">Nutrition per {perLabel}. Fill in with AI works out the numbers for you. A density lets you measure by cups and spoons.</p>
        <div className="form-grid">
          {NUTRIENTS.map((k) => (
            <div className="field" key={k}>
              <label htmlFor={`ni-${k}`}>{NUTRIENT_LABEL[k]} ({NUTRIENT_UNIT[k]})</label>
              <input id={`ni-${k}`} className="input" type="number" min="0" step="any" value={vals[k]} onChange={(e) => { setZeroOk(false); setVals({ ...vals, [k]: e.target.value }) }} />
            </div>
          ))}
        </div>
        {zeroWarning && (
          <div className="alert alert-warn" role="alert">
            Calories, protein, carbs and fat are all 0, so this ingredient adds nothing to a recipe's nutrition. Fill them in (try Fill in with AI), or save anyway if that's right (like salt).
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}
        {del === 'blocked' && (
          <div className="alert alert-warn" role="alert">
            <strong>It can't be deleted yet.</strong> It is used in {usedBy.length} recipe{usedBy.length === 1 ? '' : 's'}: {usedBy.join(', ')}.
            Remove it from {usedBy.length === 1 ? 'that recipe' : 'those recipes'} (or swap it for another ingredient) first, then delete it.
          </div>
        )}
        {(del === 'confirm' || del === 'deleting') && (
          <div className="alert alert-warn stack-sm" role="alert">
            <strong>Delete {existing!.name} for good?</strong> No recipe uses it. This can't be undone.
            <div className="row">
              <button type="button" className="btn btn-sm btn-danger" disabled={del === 'deleting'} onClick={confirmDelete}>{del === 'deleting' ? 'Deleting…' : 'Yes, delete it'}</button>
              <button type="button" className="btn btn-sm" disabled={del === 'deleting'} onClick={() => setDel('idle')}>Keep it</button>
            </div>
          </div>
        )}
        <div className="row row-between">
          <div className="row">
          <button className="btn btn-primary" disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : zeroWarning ? 'Save anyway' : existing ? 'Save changes' : 'Create ingredient'}
          </button>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          </div>
          {existing && onDeleted && (
            <button type="button" className="btn btn-danger" disabled={del === 'checking' || del === 'deleting'} onClick={startDelete}>
              {del === 'checking' ? 'Checking…' : 'Delete ingredient'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
