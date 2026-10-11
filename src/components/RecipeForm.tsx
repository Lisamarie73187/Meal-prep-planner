import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { fetchIngredients, saveRecipe, uploadPhoto } from '../lib/api'
import { perServingNutrition } from '../lib/nutrition'
import type { RecipeDraft } from '../lib/parseRecipe'
import { photoUrl } from '../lib/supabase'
import { CATEGORIES } from '../lib/types'
import type { Ingredient, MealCategory, Recipe } from '../lib/types'
import { useAsync } from '../lib/useAsync'
import { AmountInput } from './AmountInput'
import { IngredientPicker } from './IngredientPicker'
import { NutritionRow } from './NutritionRow'
import { PhotoPicker } from './PhotoPicker'

interface Row {
  ingredient: Ingredient
  /** Whole-recipe amount, base unit. */
  amount: number
  display_unit: string | null
}

interface Props {
  /** 'admin' saves to the recommended table; 'user' saves to My recipes. */
  mode: 'user' | 'admin'
  existing?: Recipe
  /** Starts a new recipe from text that was read by AI. */
  draft?: RecipeDraft
}

export function RecipeForm({ mode, existing, draft }: Props) {
  const { userId } = useAuth()
  const navigate = useNavigate()
  const from = useLocation().state as { returnTo?: string; category?: MealCategory } | null
  const ings = useAsync(fetchIngredients, [])
  const [extra, setExtra] = useState<Ingredient[]>([])
  const [name, setName] = useState(existing?.name ?? draft?.name ?? '')
  const [category, setCategory] = useState<MealCategory>(existing?.category ?? draft?.category ?? from?.category ?? 'lunch')
  const [servings, setServings] = useState(existing?.servings ?? draft?.servings ?? 4)
  const [prep, setPrep] = useState(existing?.prep_minutes ?? draft?.prep_minutes ?? 20)
  const [photoPath] = useState(existing?.photo_path ?? null)
  const [file, setFile] = useState<File | null>(draft?.photo ?? null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [steps, setSteps] = useState((existing?.instructions ?? draft?.steps ?? []).join('\n'))
  const [rows, setRows] = useState<Row[]>(
    () => existing?.recipe_ingredients.map((r) => ({ ingredient: r.ingredient, amount: r.amount, display_unit: r.display_unit })) ?? draft?.rows ?? [],
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const all = [...(ings.data ?? []), ...extra]
  const live = perServingNutrition({
    servings: Math.max(1, servings),
    recipe_ingredients: rows.map((r, position) => ({ ingredient_id: r.ingredient.id, amount: r.amount, display_unit: null, position, ingredient: r.ingredient })),
  })
  // Only same-site paths, so a crafted link can't send people elsewhere after saving.
  const returnTo = from?.returnTo?.startsWith('/') && !from.returnTo.startsWith('//') ? from.returnTo : null
  const back = returnTo ?? (mode === 'admin' ? '/admin/recipes' : '/my-recipes')
  const valid = name.trim() && servings > 0 && rows.length > 0 && rows.every((r) => r.amount > 0)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    setError(null)
    try {
      let path = photoRemoved ? null : photoPath
      if (file) path = await uploadPhoto(file, mode === 'admin' ? 'recommended' : userId)
      await saveRecipe(
        {
          name: name.trim(), category, servings, prep_minutes: prep, photo_path: path,
          instructions: steps.split('\n').map((s) => s.trim()).filter(Boolean),
          copied_from: existing?.copied_from ?? null,
          ingredients: rows.map((r) => ({ ingredient_id: r.ingredient.id, amount: r.amount, display_unit: r.display_unit })),
        },
        mode === 'admin' ? null : userId,
        existing?.id,
      )
      navigate(back)
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  const localPreview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => { if (localPreview) URL.revokeObjectURL(localPreview) }, [localPreview])
  const preview = localPreview ?? (photoRemoved ? null : photoUrl(photoPath))

  return (
    <form className="stack" onSubmit={submit}>
      {draft && <DraftNotice draft={draft} />}
      <div className="card form-grid">
        <div className="field">
          <label htmlFor="rf-name">Name</label>
          <input id="rf-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="rf-cat">Category</label>
          <select id="rf-cat" className="select" value={category} onChange={(e) => setCategory(e.target.value as MealCategory)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="rf-serv">Servings</label>
          <input id="rf-serv" className="input" type="number" min="1" step="1" value={servings} onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))} />
        </div>
        <div className="field">
          <label htmlFor="rf-prep">Prep time (min)</label>
          <input id="rf-prep" className="input" type="number" min="0" value={prep} onChange={(e) => setPrep(parseInt(e.target.value) || 0)} />
        </div>
        <div className="field">
          <span className="label">Photo</span>
          {preview && <img className="photo-preview" src={preview} alt="Recipe preview" />}
          <PhotoPicker
            hasPhoto={!!preview}
            onFile={(f) => { setFile(f); setPhotoRemoved(false) }}
            onRemove={() => { setFile(null); setPhotoRemoved(true) }}
          />
        </div>
      </div>

      <div className="card stack">
        <h2>Ingredients (whole recipe)</h2>
        {ings.error && <div className="alert alert-error">{ings.error}</div>}
        {rows.map((r, i) => (
          <div className="ing-row" key={r.ingredient.id}>
            <div><strong>{r.ingredient.name}</strong></div>
            <AmountInput
              ingredient={r.ingredient} label={r.ingredient.name} value={r.amount}
              onChange={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, amount: v } : x)))}
            />
            <button type="button" className="btn btn-sm btn-danger" aria-label={`Remove ${r.ingredient.name}`} onClick={() => setRows(rows.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <IngredientPicker
          ingredients={all} scope={mode === 'admin' ? 'recommended' : 'user'}
          exclude={new Set(rows.map((r) => r.ingredient.id))}
          onCreated={(ing) => setExtra([...extra, ing])}
          onPick={(ing) => setRows([...rows, { ingredient: ing, amount: 0, display_unit: null }])}
          placeholder="Add an ingredient — search or create…"
        />
      </div>

      <div className="card stack">
        <h2>Nutrition per serving (live)</h2>
        <NutritionRow nutrition={live} />
      </div>

      <div className="card field">
        <label htmlFor="rf-steps">Instructions (one step per line)</label>
        <textarea id="rf-steps" className="textarea" value={steps} onChange={(e) => setSteps(e.target.value)} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      <div className="row">
        <button className="btn btn-primary" disabled={!valid || saving}>{saving ? 'Saving…' : existing ? 'Save changes' : 'Save recipe'}</button>
        <button type="button" className="btn" onClick={() => navigate(back)}>Cancel</button>
      </div>
    </form>
  )
}

/** What AI couldn't be sure of, so nothing slips into a saved recipe unchecked. */
function DraftNotice({ draft }: { draft: RecipeDraft }) {
  return (
    <div className="alert alert-warn stack-sm" role="status">
      <strong>Read from your text. Please check it before saving.</strong>
      {draft.unmatched.length > 0 && (
        <div>Not in your ingredient list yet: <strong>{draft.unmatched.join(', ')}</strong>. Add each with the ingredient search below (you can create it there).</div>
      )}
      {draft.closeMatches.length > 0 && <div>Matched loosely, make sure these are right: {draft.closeMatches.join('; ')}.</div>}
      {draft.needsAmount.length > 0 && <div>Fill in the amount for: <strong>{draft.needsAmount.join(', ')}</strong>.</div>}
    </div>
  )
}
