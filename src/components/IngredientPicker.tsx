import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { createIngredient } from '../lib/api'
import { guessContains, TAGS, TAG_LABEL } from '../lib/diet'
import { lookupFoods } from '../lib/foodLookup'
import type { FoodHit } from '../lib/foodLookup'
import { NUTRIENTS, NUTRIENT_LABEL, NUTRIENT_UNIT, SECTIONS } from '../lib/types'
import type { BaseUnit, Ingredient, IngredientTag, Nutrient, StoreSection } from '../lib/types'

interface Props {
  ingredients: Ingredient[]
  onPick: (ing: Ingredient) => void
  /** Called after a new ingredient is created so the parent can refresh its list. */
  onCreated: (ing: Ingredient) => void
  /** 'recommended' creates public ingredients (admin only). */
  scope?: 'user' | 'recommended'
  exclude?: Set<string>
  placeholder?: string
}

export function IngredientPicker({ ingredients, onPick, onCreated, scope = 'user', exclude, placeholder = 'Search ingredients…' }: Props) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const term = q.trim().toLowerCase()
  const matches = ingredients
    .filter((i) => !exclude?.has(i.id) && (!term || i.name.toLowerCase().includes(term)))
    .slice(0, 8)
  const exact = ingredients.some((i) => i.name.toLowerCase() === term)

  const pick = (ing: Ingredient) => {
    onPick(ing)
    setQ('')
    setOpen(false)
  }

  return (
    <div className="ac">
      <input
        className="input"
        value={q}
        placeholder={placeholder}
        aria-label="Ingredient"
        role="combobox"
        aria-expanded={open}
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (matches[0]) pick(matches[0])
          }
        }}
      />
      {open && (matches.length > 0 || (term && !exact)) && (
        <ul className="ac__list" role="listbox">
          {matches.map((i) => (
            <li key={i.id} className="ac__opt" role="option" aria-selected="false" onMouseDown={() => pick(i)}>
              <span>{i.name}</span>
              {i.owner_id && <span className="badge">mine</span>}
            </li>
          ))}
          {term && !exact && (
            <li className="ac__opt" role="option" aria-selected="false" onMouseDown={() => setCreating(true)}>
              <strong>+ Create “{q.trim()}”</strong>
            </li>
          )}
        </ul>
      )}
      {creating && (
        <NewIngredientModal
          initialName={q.trim()}
          scope={scope}
          onClose={() => setCreating(false)}
          onSaved={(ing) => {
            setCreating(false)
            onCreated(ing)
            pick(ing)
          }}
        />
      )}
    </div>
  )
}

function NewIngredientModal({ initialName, scope, onClose, onSaved }: {
  initialName: string
  scope: 'user' | 'recommended'
  onClose: () => void
  onSaved: (ing: Ingredient) => void
}) {
  const { userId } = useAuth()
  const [name, setName] = useState(initialName)
  const [unit, setUnit] = useState<BaseUnit>('g')
  const [section, setSection] = useState<StoreSection>('other')
  const [density, setDensity] = useState('')
  const [vals, setVals] = useState<Record<Nutrient, string>>({ calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '' })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const per = unit === 'each' ? 1 : 100
  const perLabel = unit === 'each' ? 'each' : `100 ${unit}`
  const [hits, setHits] = useState<{ generic: FoodHit[]; branded: FoodHit[] } | null>(null)
  // Diet flags start as a guess from the name; once you touch a checkbox the guess stops overwriting your choice.
  const [contains, setContains] = useState<IngredientTag[]>(() => guessContains(initialName))
  const [containsTouched, setContainsTouched] = useState(false)
  useEffect(() => { if (!containsTouched) setContains(guessContains(name)) }, [name, containsTouched])
  const [looking, setLooking] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [filledFrom, setFilledFrom] = useState<string | null>(null)

  // Look up nutrition for the name as it's typed (debounced; skipped for very short names).
  useEffect(() => {
    const q = name.trim()
    setLookupError(null)
    if (q.length < 3) { setHits(null); return }
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
  }, [name])

  // USDA values are per 100 g, so a pick switches the base unit to grams.
  const fill = (h: FoodHit) => {
    setUnit('g')
    setVals(Object.fromEntries(NUTRIENTS.map((k) => [k, String(Math.round(h.per100g[k] * 100) / 100)])) as Record<Nutrient, string>)
    setFilledFrom(h.brand ? `${h.name} (${h.brand})` : h.name)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const n = Object.fromEntries(NUTRIENTS.map((k) => [k, (parseFloat(vals[k]) || 0) / per])) as Record<Nutrient, number>
      const d = parseFloat(density)
      const ing = await createIngredient({
        owner_id: scope === 'user' ? userId : null,
        name: name.trim(), base_unit: unit, store_section: section,
        density_g_per_ml: unit !== 'each' && d > 0 ? d : null, contains, ...n,
      })
      onSaved(ing)
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="New ingredient">
      <form className="modal stack" onSubmit={submit}>
        <h2>New ingredient{scope === 'user' ? ' (private to you)' : ' (recommended)'}</h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="ni-name">Name</label>
            <input id="ni-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ni-unit">Base unit</label>
            <select id="ni-unit" className="select" value={unit} onChange={(e) => setUnit(e.target.value as BaseUnit)}>
              <option value="g">grams (g)</option>
              <option value="ml">millilitres (ml)</option>
              <option value="each">each (countable)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="ni-section">Store section</label>
            <select id="ni-section" className="select" value={section} onChange={(e) => setSection(e.target.value as StoreSection)}>
              {SECTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          {unit !== 'each' && (
            <div className="field">
              <label htmlFor="ni-density">Density, g per ml (optional)</label>
              <input id="ni-density" className="input" type="number" min="0" step="any" value={density} onChange={(e) => setDensity(e.target.value)} placeholder="e.g. 0.78 for dry rice" />
            </div>
          )}
        </div>
        <div className="stack-sm" aria-live="polite">
          <strong className="small">Look up nutrition</strong>
          {looking && <span className="muted small">Searching…</span>}
          {lookupError && <span className="muted small">{lookupError} You can still enter values by hand.</span>}
          {hits && !looking && hits.generic.length + hits.branded.length === 0 && <span className="muted small">No matches. Enter values by hand.</span>}
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
          {filledFrom && <span className="alert alert-ok small">Filled from {filledFrom}. Check the numbers below and adjust if needed.</span>}
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
        <p className="muted small">Nutrition per {perLabel}. A density lets you measure by weight or by cups and spoons.</p>
        <div className="form-grid">
          {NUTRIENTS.map((k) => (
            <div className="field" key={k}>
              <label htmlFor={`ni-${k}`}>{NUTRIENT_LABEL[k]} ({NUTRIENT_UNIT[k]})</label>
              <input id={`ni-${k}`} className="input" type="number" min="0" step="any" value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
            </div>
          ))}
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="row">
          <button className="btn btn-primary" disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Create ingredient'}</button>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
