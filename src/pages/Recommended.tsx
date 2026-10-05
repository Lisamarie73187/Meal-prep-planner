import { useState } from 'react'
import { RecipeCard } from '../components/RecipeCard'
import { fetchRecipes } from '../lib/api'
import { CATEGORIES } from '../lib/types'
import type { MealCategory } from '../lib/types'
import { useAsync } from '../lib/useAsync'

export function Recommended() {
  const { data, error, loading } = useAsync(() => fetchRecipes('recommended'), [])
  const [cat, setCat] = useState<MealCategory | 'all'>('all')
  const list = (data ?? []).filter((r) => cat === 'all' || r.category === cat)
  return (
    <div className="stack">
      <h1>Recommended recipes</h1>
      <div className="tabs" role="tablist">
        {(['all', ...CATEGORIES] as const).map((c) => (
          <button key={c} role="tab" aria-selected={cat === c} className="tab" onClick={() => setCat(c)}>{c === 'all' ? 'All' : c[0].toUpperCase() + c.slice(1)}</button>
        ))}
      </div>
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="alert alert-error">{error}</div>}
      <div className="grid-cards">{list.map((r) => <RecipeCard key={r.id} recipe={r} />)}</div>
    </div>
  )
}
