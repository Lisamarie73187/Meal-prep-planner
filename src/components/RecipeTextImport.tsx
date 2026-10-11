import { useEffect, useMemo, useState } from 'react'
import { fetchIngredients } from '../lib/api'
import { buildDraft, parseRecipeText } from '../lib/parseRecipe'
import type { RecipeDraft } from '../lib/parseRecipe'
import { PhotoPicker } from './PhotoPicker'

const MAX_CHARS = 8000

/** Paste a recipe in any format; AI reads it and opens the recipe form filled in for you to check and save. */
export function RecipeTextImport({ onDraft }: { onDraft: (draft: RecipeDraft) => void }) {
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const [parsed, catalogue] = await Promise.all([parseRecipeText(text), fetchIngredients()])
      onDraft({ ...buildDraft(parsed, catalogue), photo: photo ?? undefined })
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  return (
    <section className="card stack-sm" aria-labelledby="ri-title">
      <h2 id="ri-title">Add a recipe from text</h2>
      <p className="muted small">
        Paste or type a recipe any way you like: ingredients, steps, servings. AI reads it and fills in the form below for you to check
        before anything is saved. You can add a picture too.
      </p>
      <label className="visually-hidden" htmlFor="ri-text">Recipe text</label>
      <textarea
        id="ri-text" className="textarea" rows={6} maxLength={MAX_CHARS} value={text} disabled={busy}
        placeholder={'Chicken burrito bowls, serves 4, 30 min\n2 chicken breasts, 1 cup rice, 1 can black beans…\n1. Cook the rice…'}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="stack-sm">
        <span className="label">Picture (optional)</span>
        {preview && <img className="photo-preview" src={preview} alt="Chosen recipe photo" />}
        <PhotoPicker hasPhoto={!!photo} onFile={(f) => setPhoto(f)} onRemove={() => setPhoto(null)} />
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="row">
        <button className="btn btn-primary" disabled={busy || text.trim().length < 20} onClick={run}>{busy ? 'Reading your recipe…' : 'Read recipe with AI'}</button>
        <span className="muted small">{text.length}/{MAX_CHARS}</span>
      </div>
    </section>
  )
}
