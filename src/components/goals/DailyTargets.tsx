import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { updateProfile } from '../../lib/api'
import { calorieMismatch, fmtAmount, inputsToPatch, PRIMARY_TARGETS, SECONDARY_TARGETS, targetsToInputs } from '../../lib/goals'
import { NUTRIENT_LABEL, NUTRIENT_UNIT } from '../../lib/types'
import type { Nutrient, Nutrition, Profile } from '../../lib/types'
import { IconBars, IconChevronDown, IconDrop, IconDumbbell, IconFlame, IconPencil, IconTarget, IconWheat } from '../Icons'

const ACCENT: Record<(typeof PRIMARY_TARGETS)[number], { Icon: typeof IconFlame; cls: string }> = {
  calories: { Icon: IconFlame, cls: 'stat--calories' },
  protein: { Icon: IconDumbbell, cls: 'stat--protein' },
  carbs: { Icon: IconWheat, cls: 'stat--carbs' },
  fat: { Icon: IconDrop, cls: 'stat--fat' },
}

const unitOf = (n: Nutrient) => NUTRIENT_UNIT[n]

/** Daily targets as a few clear numbers, with an editor that opens in place (no trip to another page). */
export function DailyTargets({ daily, planId }: { daily: Partial<Nutrition>; planId: string }) {
  const { userId, refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [inputs, setInputs] = useState(() => targetsToInputs(daily))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<{ text: string; field?: Nutrient } | null>(null)
  const [saved, setSaved] = useState(false)

  const hasAny = [...PRIMARY_TARGETS, ...SECONDARY_TARGETS].some((n) => daily[n] != null)
  const mismatch = calorieMismatch(daily)

  const open = () => { setInputs(targetsToInputs(daily)); setError(null); setSaved(false); setEditing(true) }
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    const parsed = inputsToPatch(inputs)
    if (!parsed.ok) return setError({ text: parsed.error, field: parsed.field })
    setSaving(true)
    setError(null)
    try {
      await updateProfile(userId, parsed.patch as Partial<Profile>)
      await refreshProfile()
      setEditing(false)
      setSaved(true)
    } catch (err) {
      setError({ text: (err as Error).message })
    }
    setSaving(false)
  }

  const action = !userId ? (
    <Link className="btn btn-sm-ds" to="/sign-up" state={{ from: `/plan/${planId}/goals` }}>Sign up to set targets</Link>
  ) : editing ? null : (
    <button type="button" className="btn btn-sm-ds" onClick={open}><IconPencil size={16} /> {hasAny ? 'Change targets' : 'Set my targets'}</button>
  )

  return (
    <section className="setup-card g-card" aria-labelledby="g-daily">
      <div className="g-card__head">
        <div>
          <h2 id="g-daily" className="g-card__title"><span className="g-card__icon"><IconTarget size={20} /></span> Daily targets</h2>
          <p className="g-card__lede">These are the nutrition targets we'll use when matching recipes.</p>
        </div>
        {action}
      </div>

      <div role="status" aria-live="polite">{saved && <p className="g-saved">Targets saved.</p>}</div>

      {editing ? (
        <form className="target-form" onSubmit={save} noValidate>
          <div className="target-form__grid">
            {[...PRIMARY_TARGETS, ...SECONDARY_TARGETS].map((n) => (
              <div className="target-field" key={n}>
                <label htmlFor={`t-${n}`}>{NUTRIENT_LABEL[n]} <span className="muted">({unitOf(n)} per day)</span></label>
                <input
                  id={`t-${n}`} className="input" type="number" inputMode="decimal" min={0} step="any" value={inputs[n]}
                  aria-invalid={error?.field === n} aria-describedby={error?.field === n ? 'target-error' : undefined}
                  onChange={(e) => setInputs({ ...inputs, [n]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <p className="setup-note">Leave a box empty to skip that target. Fiber and sugar are optional.</p>
          {error && <div id="target-error" className="alert alert-error" role="alert">{error.text}</div>}
          <div className="target-form__actions">
            <button type="button" className="btn btn-lg" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-primary btn-lg" disabled={saving}>{saving ? 'Saving…' : 'Save targets'}</button>
          </div>
        </form>
      ) : !hasAny ? (
        <div className="g-empty">
          <p><strong>No nutrition targets yet.</strong></p>
          <p className="muted">Add your daily calories and macros and recipes will be matched to them. You can also continue without targets, and we'll suggest recipes from what you have and what you like.</p>
        </div>
      ) : (
        <>
          <ul className="stat-grid">
            {PRIMARY_TARGETS.map((n) => {
              const { Icon, cls } = ACCENT[n]
              const v = daily[n]
              return (
                <li key={n} className={`stat ${cls}`}>
                  <span className="stat__icon"><Icon size={20} /></span>
                  <span className="stat__label">{NUTRIENT_LABEL[n]}</span>
                  {v != null ? (
                    <>
                      <span className="stat__value">{fmtAmount(v)}{n === 'calories' ? '' : ' g'}</span>
                      <span className="stat__unit">{n === 'calories' ? 'kcal per day' : 'per day'}</span>
                    </>
                  ) : (
                    <span className="stat__unit">Not set</span>
                  )}
                </li>
              )
            })}
          </ul>

          {mismatch && (
            <p className="g-hint" role="note">
              Heads up: your protein, carbs and fat add up to about {fmtAmount(Math.round(mismatch.implied))} kcal, but your calorie target is {fmtAmount(mismatch.target)}.
              Recipes can't match both exactly, so we'll land in between.
            </p>
          )}

          <details className="more-targets">
            <summary>
              <span className="more-targets__icon"><IconBars size={18} /></span>
              <span className="more-targets__text"><strong>More targets</strong><span className="muted"> Fiber and sugar (optional)</span></span>
              <IconChevronDown size={20} />
            </summary>
            <ul className="more-targets__rows">
              {SECONDARY_TARGETS.map((n) => (
                <li key={n}><span>{NUTRIENT_LABEL[n]}</span><strong>{daily[n] != null ? `${fmtAmount(daily[n]!)} g per day` : 'Not set'}</strong></li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  )
}
