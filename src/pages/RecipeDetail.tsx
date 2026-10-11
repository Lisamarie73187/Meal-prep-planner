import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { NutritionRow } from '../components/NutritionRow'
import { PhotoPicker } from '../components/PhotoPicker'
import { deleteRecipe, fetchRecipe, setRecipePhoto, uploadPhoto } from '../lib/api'
import { perServingAmounts, perServingNutrition } from '../lib/nutrition'
import { photoUrl } from '../lib/supabase'
import { useAsync } from '../lib/useAsync'
import { formatPortion } from '../lib/units'

export function RecipeDetail() {
  const { id } = useParams()
  const { userId, isAdmin } = useAuth()
  const navigate = useNavigate()
  const { data: r, error, loading } = useAsync(() => fetchRecipe(id!), [id])
  // undefined = show the saved photo; a string or null = what you just set here
  const [photo, setPhoto] = useState<string | null | undefined>(undefined)
  if (loading) return <p className="muted">Loading…</p>
  if (error || !r) return <div className="alert alert-error">{error ?? 'Recipe not found'}</div>

  const per = perServingAmounts(r)
  const img = photoUrl(photo === undefined ? r.photo_path : photo)
  const own = r.owner_id !== null && r.owner_id === userId
  const manage = own || (r.owner_id === null && isAdmin)
  const editPath = r.owner_id === null ? `/admin/recipes/${r.id}/edit` : `/my-recipes/${r.id}/edit`

  return (
    <div className="stack">
      <div className="row row-between">
        <h1>{r.name}</h1>
        <div className="row no-print">
          {userId && <Link className="btn btn-primary" to={`/recipes/${r.id}/adjust`}>Adjust to my macros</Link>}
          {manage && <Link className="btn" to={editPath}>Edit</Link>}
          {manage && (
            <button className="btn btn-danger" onClick={async () => {
              if (!confirm('Delete this recipe?')) return
              await deleteRecipe(r.id)
              navigate(r.owner_id === null ? '/admin/recipes' : '/my-recipes')
            }}>Delete</button>
          )}
        </div>
      </div>
      {img && <img className="photo-preview" src={img} alt="" />}
      {manage && userId && (
        <div className="no-print">
          <PhotoPicker
            hasPhoto={!!img}
            onFile={async (f) => {
              const path = await uploadPhoto(f, r.owner_id === null ? 'recommended' : userId)
              await setRecipePhoto(r.id, path)
              setPhoto(path)
            }}
            onRemove={async () => { await setRecipePhoto(r.id, null); setPhoto(null) }}
          />
        </div>
      )}
      <p className="muted">{r.category} · ⏱ {r.prep_minutes} min · {r.servings} servings {r.copied_from && '· adjusted copy of another recipe'}</p>
      <div className="card stack">
        <h2>Per serving</h2>
        <NutritionRow nutrition={perServingNutrition(r)} />
      </div>
      <div className="card">
        <h2>Ingredients ({r.servings} servings)</h2>
        <ul>
          {r.recipe_ingredients.map((ri) => (
            <li key={ri.ingredient_id}>{formatPortion(ri.amount, ri.ingredient)} {ri.ingredient.name}</li>
          ))}
        </ul>
        <p className="muted small">Per serving: {r.recipe_ingredients.map((ri) => `${formatPortion(per[ri.ingredient_id], ri.ingredient)} ${ri.ingredient.name}`).join(', ')}</p>
      </div>
      <div className="card">
        <h2>Instructions</h2>
        <ol className="steps-list">{r.instructions.map((s, i) => <li key={i}>{s}</li>)}</ol>
      </div>
    </div>
  )
}
