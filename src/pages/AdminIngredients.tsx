import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IngredientModal } from '../components/IngredientModal'
import { fetchIngredients } from '../lib/api'
import { formValues, isAllZero } from '../lib/ingredientEdit'
import type { Ingredient } from '../lib/types'
import { useAsync } from '../lib/useAsync'

const fmt = (s: string) => String(Math.round(parseFloat(s) * 10) / 10)

/** Admin only: every ingredient with its nutrition, so a wrong or empty one can be found and fixed. */
export function AdminIngredients() {
  const { data, error, loading, reload } = useAsync(fetchIngredients, [])
  const [q, setQ] = useState('')
  const [only, setOnly] = useState<'all' | 'zero'>('all')
  const [editing, setEditing] = useState<Ingredient | 'new' | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const all = data ?? []
  const zero = all.filter((i) => isAllZero(i))
  const term = q.trim().toLowerCase()
  const list = (only === 'zero' ? zero : all).filter((i) => !term || i.name.toLowerCase().includes(term))

  return (
    <div className="stack">
      <div className="row row-between">
        <h1>Ingredients</h1>
        <div className="row">
          <Link className="btn" to="/admin/recipes">← Recipe manager</Link>
          <button className="btn btn-primary" onClick={() => setEditing('new')}>Add ingredient</button>
        </div>
      </div>
      <p className="muted">
        Fix a wrong or empty ingredient here and every recipe that uses it updates. Shared ingredients are seen by everyone.
      </p>
      <div className="row">
        <input className="input input-narrow" style={{ width: 'min(100%, 20rem)' }} type="search" aria-label="Search ingredients" placeholder="Search ingredients…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="tabs" role="group" aria-label="Show">
          <button type="button" className="tab" aria-pressed={only === 'all'} onClick={() => setOnly('all')}>All ({all.length})</button>
          <button type="button" className="tab" aria-pressed={only === 'zero'} onClick={() => setOnly('zero')}>All zero ({zero.length})</button>
        </div>
      </div>
      <div role="status">{saved && <div className="alert alert-ok">{saved}</div>}</div>
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="alert alert-error">{error}</div>}
      {!loading && list.length === 0 && <p className="muted">{only === 'zero' ? 'No ingredients with all-zero nutrition.' : 'No ingredients match.'}</p>}
      {list.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Ingredient</th><th>Aisle</th><th className="num">kcal</th><th className="num">Protein</th><th className="num">Carbs</th><th className="num">Fat</th><th><span className="visually-hidden">Actions</span></th></tr>
            </thead>
            <tbody>
              {list.map((i) => {
                const v = formValues(i)
                const per = i.base_unit === 'each' ? 'each' : `100 ${i.base_unit}`
                return (
                  <tr key={i.id}>
                    <th scope="row">
                      {i.name}{' '}
                      {i.owner_id && <span className="badge">mine</span>}{' '}
                      {isAllZero(i) && <span className="badge badge-warn">all zero</span>}
                      <div className="muted small">per {per}</div>
                    </th>
                    <td>{i.store_section}</td>
                    <td className="num">{fmt(v.calories)}</td>
                    <td className="num">{fmt(v.protein)} g</td>
                    <td className="num">{fmt(v.carbs)} g</td>
                    <td className="num">{fmt(v.fat)} g</td>
                    <td><button className="btn btn-sm" aria-label={`Edit ${i.name}`} onClick={() => setEditing(i)}>Edit</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <IngredientModal
          existing={editing === 'new' ? undefined : editing}
          scope="recommended"
          onClose={() => setEditing(null)}
          onSaved={(ing) => { setEditing(null); setSaved(`Saved ${ing.name}.`); reload() }}
          onDeleted={(ing) => { setEditing(null); setSaved(`Deleted ${ing.name}.`); reload() }}
        />
      )}
    </div>
  )
}
