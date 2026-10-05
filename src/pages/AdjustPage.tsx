import { useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { AdjustPanel } from '../components/AdjustPanel'
import { fetchRecipe } from '../lib/api'
import { mealTargets } from '../lib/nutrition'
import { useAsync } from '../lib/useAsync'

export function AdjustPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { data: r, error, loading } = useAsync(() => fetchRecipe(id!), [id])
  if (loading) return <p className="muted">Loading…</p>
  if (error || !r) return <div className="alert alert-error">{error ?? 'Recipe not found'}</div>
  return (
    <div className="stack">
      <h1>Adjust: {r.name}</h1>
      <p className="muted">Target shown is your per-meal goal for {r.category}.</p>
      <AdjustPanel recipe={r} target={mealTargets(profile, r.category)} />
    </div>
  )
}
