import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { RecipeCard } from '../components/RecipeCard'
import { deleteRecipe, fetchRecipes } from '../lib/api'
import type { MealCategory } from '../lib/types'
import { useAsync } from '../lib/useAsync'

/**
 * Your recipes (inside the Recipes page) and the admin recipe manager. `embedded` leaves out the page heading,
 * `category` narrows the list to one meal type.
 */
export function RecipeManager({ scope, embedded, category = 'all' }: { scope: 'mine' | 'recommended'; embedded?: boolean; category?: MealCategory | 'all' }) {
  const { userId } = useAuth()
  const { data, error, loading, reload } = useAsync(() => fetchRecipes(scope, userId ?? undefined), [scope, userId])
  const base = scope === 'mine' ? '/my-recipes' : '/admin/recipes'
  const list = (data ?? []).filter((r) => category === 'all' || r.category === category)
  return (
    <div className="stack">
      <div className="row row-between">
        {embedded ? <p className="muted">Recipes you made or saved. Only you see these.</p> : <h1>{scope === 'mine' ? 'My recipes' : 'Recommended recipe manager'}</h1>}
        <div className="row">
          {scope === 'recommended' && <Link className="btn" to="/admin/ingredients">Manage ingredients</Link>}
          <Link className="btn btn-primary" to={`${base}/new`}>Add recipe</Link>
        </div>
      </div>
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="alert alert-error">{error}</div>}
      {data && list.length === 0 && <p className="muted">{data.length === 0 ? 'Nothing here yet.' : `No ${category} recipes here yet.`}</p>}
      <div className="grid-cards">
        {list.map((r) => (
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

export const AdminRecipes = () => <RecipeManager scope="recommended" />
