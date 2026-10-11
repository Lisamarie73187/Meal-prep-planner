import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { RecipeCard } from '../components/RecipeCard'
import { fetchRecipes } from '../lib/api'
import { CATEGORIES } from '../lib/types'
import type { MealCategory } from '../lib/types'
import { useAsync } from '../lib/useAsync'
import { RecipeManager } from './MyRecipes'

type Cat = MealCategory | 'all'

/** One place for every recipe: the shared ones everyone sees (the "Recipes" tab), and when signed in, your own. */
export function Recipes() {
  const { session, loading: authLoading } = useAuth()
  const [params, setParams] = useSearchParams()
  const [cat, setCat] = useState<Cat>('all')
  const mine = params.get('tab') === 'mine'
  // Signed-out visitors only have the shared recipes.
  const showMine = mine && !!session
  const setTab = (t: 'shared' | 'mine') => setParams(t === 'mine' ? { tab: 'mine' } : {}, { replace: true })

  if (mine && authLoading) return <p className="muted">Loading…</p>
  return (
    <div className="stack">
      <h1>Recipes</h1>
      {session && (
        <div className="tabs recipes-switch" role="tablist" aria-label="Which recipes">
          <button role="tab" aria-selected={!showMine} className="tab" onClick={() => setTab('shared')}>Recipes</button>
          <button role="tab" aria-selected={showMine} className="tab" onClick={() => setTab('mine')}>My recipes</button>
        </div>
      )}
      <div className="tabs recipes-cats" role="tablist" aria-label="Meal type">
        {(['all', ...CATEGORIES] as const).map((c) => (
          <button key={c} role="tab" aria-selected={cat === c} className="tab" onClick={() => setCat(c)}>{c === 'all' ? 'All' : c[0].toUpperCase() + c.slice(1)}</button>
        ))}
      </div>
      {showMine ? <RecipeManager scope="mine" embedded category={cat} /> : <SharedRecipes category={cat} />}
    </div>
  )
}

function SharedRecipes({ category }: { category: Cat }) {
  const { session, isAdmin } = useAuth()
  const { data, error, loading } = useAsync(() => fetchRecipes('recommended'), [])
  const list = (data ?? []).filter((r) => category === 'all' || r.category === category)
  return (
    <>
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="alert alert-error">{error}</div>}
      {data && list.length === 0 && <p className="muted">No {category === 'all' ? '' : `${category} `}recipes here yet.</p>}
      <div className="grid-cards">{list.map((r) => (
        <RecipeCard
          key={r.id} recipe={r}
          actions={session ? (
            isAdmin
              ? <Link className="btn btn-sm" to={`/admin/recipes/${r.id}/edit`}>Edit</Link>
              : <Link className="btn btn-sm" to={`/recipes/${r.id}/edit`} title="Your changes are saved as your own copy in My recipes">Edit my copy</Link>
          ) : undefined}
        />
      ))}</div>
    </>
  )
}
