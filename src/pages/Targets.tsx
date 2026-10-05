import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { updateProfile } from '../lib/api'
import { DEFAULT_SPLIT, mealTargets, round, splitOf } from '../lib/nutrition'
import { CATEGORIES, NUTRIENTS, NUTRIENT_LABEL, NUTRIENT_UNIT } from '../lib/types'
import type { Nutrient } from '../lib/types'

export function Targets() {
  const { profile, userId, refreshProfile } = useAuth()
  const [vals, setVals] = useState<Record<Nutrient, string>>({ calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '' })
  const [split, setSplit] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const returnTo = (useLocation().state as { returnTo?: string } | null)?.returnTo

  useEffect(() => {
    if (!profile) return
    setVals(Object.fromEntries(NUTRIENTS.map((n) => [n, profile[`target_${n}`] != null ? String(profile[`target_${n}`]) : ''])) as Record<Nutrient, string>)
    const s = splitOf(profile)
    setSplit(Object.fromEntries(CATEGORIES.map((c) => [c, String(round(s[c] * 100))])))
  }, [profile])

  const pct = CATEGORIES.map((c) => parseFloat(split[c]) || 0)
  const sum = pct.reduce((a, b) => a + b, 0)
  const sumOk = Math.abs(sum - 100) < 0.5

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !sumOk) return
    try {
      const patch: Record<string, number | null> = {}
      for (const n of NUTRIENTS) patch[`target_${n}`] = vals[n] === '' ? null : parseFloat(vals[n])
      CATEGORIES.forEach((c, i) => (patch[`split_${c}`] = pct[i] / 100))
      await updateProfile(userId, patch)
      await refreshProfile()
      setMsg({ ok: true, text: 'Saved.' })
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message })
    }
  }

  const preview = (c: (typeof CATEGORIES)[number]) => {
    const t = mealTargets({ ...profile!, ...Object.fromEntries(NUTRIENTS.map((n) => [`target_${n}`, vals[n] === '' ? null : parseFloat(vals[n])])), [`split_${c}`]: (parseFloat(split[c]) || 0) / 100 }, c)
    return t.calories != null ? `${round(t.calories)} kcal · ${round(t.protein ?? 0)}P ${round(t.carbs ?? 0)}C ${round(t.fat ?? 0)}F` : '—'
  }

  return (
    <form className="stack" onSubmit={save}>
      <h1>Macro targets</h1>
      {returnTo?.startsWith('/') && !returnTo.startsWith('//') && <p><Link to={returnTo}>← Back to my plan</Link></p>}
      <div className="card stack">
        <h2>Daily targets</h2>
        <div className="form-grid">
          {NUTRIENTS.map((n) => (
            <div className="field" key={n}>
              <label htmlFor={`t-${n}`}>{NUTRIENT_LABEL[n]} ({NUTRIENT_UNIT[n]})</label>
              <input id={`t-${n}`} className="input" type="number" min="0" step="any" value={vals[n]} onChange={(e) => setVals({ ...vals, [n]: e.target.value })} />
            </div>
          ))}
        </div>
      </div>
      <div className="card stack">
        <h2>How your day splits (%)</h2>
        <div className="form-grid">
          {CATEGORIES.map((c) => (
            <div className="field" key={c}>
              <label htmlFor={`s-${c}`}>{c} (default {Math.round(DEFAULT_SPLIT[c] * 100)}%)</label>
              <input id={`s-${c}`} className="input" type="number" min="0" max="100" step="any" value={split[c] ?? ''} onChange={(e) => setSplit({ ...split, [c]: e.target.value })} />
              <span className="muted small">Per meal: {profile ? preview(c) : '—'}</span>
            </div>
          ))}
        </div>
        {!sumOk && <div className="alert alert-warn">Split adds up to {round(sum, 1)}%; it needs to total 100%.</div>}
      </div>
      {msg && <div className={`alert ${msg.ok ? 'alert-ok' : 'alert-error'}`}>{msg.text}</div>}
      <div><button className="btn btn-primary" disabled={!sumOk}>Save targets</button></div>
    </form>
  )
}
