import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { RecipeCard } from '../components/RecipeCard'
import { deleteRecipe, fetchRecipes } from '../lib/api'
import { useAsync } from '../lib/useAsync'

/** Shared by "My recipes" and the admin recipe manager. */
export function RecipeManager({ scope }: { scope: 'mine' | 'recommended' }) {
  const { userId } = useAuth()
  const { data, error, loading, reload } = useAsync(() => fetchRecipes(scope, userId ?? undefined), [scope, userId])
  const base = scope === 'mine' ? '/my-recipes' : '/admin/recipes'
  return (
    <div className="stack">
      <div className="row row-between">
        <h1>{scope === 'mine' ? 'My recipes' : 'Recommended recipe manager'}</h1>
        <Link className="btn btn-primary" to={`${base}/new`}>Add recipe</Link>
      </div>
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="alert alert-error">{error}</div>}
      {data && data.length === 0 && <p className="muted">Nothing here yet.</p>}
      <div className="grid-cards">
        {(data ?? []).map((r) => (
          <RecipeCard key={r.id} recipe={r} actions={<>
            <Link className="btn btn-sm" to={`${base}/${r.id}/edit`}>Edit</Link>
            <button className="btn btn-sm btn-danger" onClick={async () => {
              if (!confirm(`Delete “${r.name}”?`)) return
              await deleteRecipe(r.id)
              reload()
            }}>Delete</button>
          </>} />
        ))}
      </div>
    </div>
  )
}

export const MyRecipes = () => <RecipeManager scope="mine" />
export const AdminRecipes = () => <RecipeManager scope="recommended" />
