import { Link } from 'react-router-dom'
import { deletePlan, listPlans } from '../lib/api'
import { CATEGORIES } from '../lib/types'
import { useAsync } from '../lib/useAsync'

export function Plans() {
  const { data, error, loading, reload } = useAsync(listPlans, [])
  return (
    <div className="stack">
      <div className="row row-between">
        <h1>Past plans</h1>
        <Link className="btn btn-primary" to="/plan/setup/meals">New plan</Link>
      </div>
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="alert alert-error">{error}</div>}
      {data?.length === 0 && <p className="muted">No plans yet.</p>}
      {(data ?? []).map((p) => (
        <div className="card row row-between" key={p.id}>
          <div>
            <strong>{p.name}</strong>
            <div className="muted small">
              {new Date(p.created_at).toLocaleDateString()} · {CATEGORIES.filter((c) => p.counts[c] > 0).map((c) => `${p.counts[c]} ${c}`).join(', ') || 'no meals'}
            </div>
          </div>
          <div className="row">
            <span className={`badge ${p.status === 'confirmed' ? 'badge-ok' : 'badge-warn'}`}>{p.status}</span>
            <Link className="btn btn-sm" to={p.status === 'confirmed' ? `/plan/${p.id}/results` : `/plan/${p.id}/choose`}>{p.status === 'confirmed' ? 'Open list' : 'Continue'}</Link>
            <button className="btn btn-sm btn-danger" onClick={async () => { if (confirm('Delete this plan?')) { await deletePlan(p.id); reload() } }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  )
}
