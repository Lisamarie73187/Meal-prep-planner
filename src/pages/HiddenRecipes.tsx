import { Link } from 'react-router-dom'
import { fetchRecipes } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { useHidden } from '../lib/useHidden'

export function HiddenRecipes() {
  const { hidden, unhide, error } = useHidden()
  const recipes = useAsync(() => fetchRecipes('all'), [])
  const list = (recipes.data ?? []).filter((r) => hidden.has(r.id))
  return (
    <div className="stack">
      <h1>Hidden recipes</h1>
      <p className="muted">Recipes you chose "Never show again" on. They're hidden from every plan's suggestions until you show them again here.</p>
      {(error || recipes.error) && <div className="alert alert-error">{error ?? recipes.error}</div>}
      {recipes.loading && !recipes.data && <p className="muted">Loading…</p>}
      {!recipes.loading && list.length === 0 && <p className="muted">Nothing hidden.</p>}
      {list.map((r) => (
        <div className="card row row-between" key={r.id}>
          <div>
            <strong><Link to={`/recipes/${r.id}`} className="link-plain">{r.name}</Link></strong>
            <div className="muted small">{r.category}</div>
          </div>
          <button className="btn btn-sm" onClick={() => unhide(r.id)}>Show again</button>
        </div>
      ))}
    </div>
  )
}
