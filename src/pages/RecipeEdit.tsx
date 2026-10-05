import { useParams } from 'react-router-dom'
import { RecipeForm } from '../components/RecipeForm'
import { fetchRecipe } from '../lib/api'
import { useAsync } from '../lib/useAsync'

export function RecipeEdit({ mode, isNew }: { mode: 'user' | 'admin'; isNew?: boolean }) {
  const { id } = useParams()
  const { data, error, loading } = useAsync(() => (isNew ? Promise.resolve(null) : fetchRecipe(id!)), [id, isNew])
  if (loading) return <p className="muted">Loading…</p>
  if (error) return <div className="alert alert-error">{error}</div>
  return (
    <div className="stack">
      <h1>{isNew ? 'Add a recipe' : 'Edit recipe'}{mode === 'admin' && ' (recommended)'}</h1>
      <RecipeForm mode={mode} existing={data ?? undefined} />
    </div>
  )
}
