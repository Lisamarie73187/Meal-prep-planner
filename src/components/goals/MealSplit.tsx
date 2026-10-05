import { Link } from 'react-router-dom'
import { IconPie } from '../Icons'
import { MEAL_META } from '../mealMeta'
import { fmtAmount, PRIMARY_TARGETS } from '../../lib/goals'
import { mealTargets, splitOf } from '../../lib/nutrition'
import { NUTRIENT_LABEL } from '../../lib/types'
import type { MealCategory, Profile } from '../../lib/types'

const pct = (share: number) => `${Math.round(share * 100)}%`

/**
 * Per-meal targets for the meals in this plan. A table on wide screens, one card per meal on phones
 * (never a sideways-scrolling table). Fiber and sugar aren't shown: recipe matching only uses calories and macros.
 */
export function MealSplit({ slots, profile, planId }: { slots: MealCategory[]; profile: Profile | null; planId: string }) {
  const split = splitOf(profile)
  const per = Object.fromEntries(slots.map((s) => [s, mealTargets(profile, s)])) as Record<MealCategory, ReturnType<typeof mealTargets>>
  const cell = (s: MealCategory, n: (typeof PRIMARY_TARGETS)[number]) => (per[s][n] != null ? `${fmtAmount(per[s][n]!)}${n === 'calories' ? '' : ' g'}` : '—')

  return (
    <section className="setup-card g-card" aria-labelledby="g-split">
      <div className="g-card__head">
        <div>
          <h2 id="g-split" className="g-card__title"><span className="g-card__icon"><IconPie size={20} /></span> How your targets are split</h2>
          <p className="g-card__lede">We'll use these numbers when finding recipes for each meal.</p>
        </div>
        <Link className="btn btn-sm-ds" to="/targets" state={{ returnTo: `/plan/${planId}/goals` }}>Adjust meal split</Link>
      </div>

      <div className="split-table-wrap">
        <table className="split-table">
          <caption className="visually-hidden">Nutrition targets for each meal in your plan</caption>
          <thead>
            <tr>
              <td />
              {slots.map((s) => {
                const { Icon, label } = MEAL_META[s]
                return <th key={s} scope="col"><span className="split-head"><Icon size={18} /> {label}</span><span className="split-share">{pct(split[s])} of your day</span></th>
              })}
            </tr>
          </thead>
          <tbody>
            {PRIMARY_TARGETS.map((n) => (
              <tr key={n}>
                <th scope="row">{NUTRIENT_LABEL[n]}{n === 'calories' ? ' (kcal)' : ''}</th>
                {slots.map((s) => <td key={s}>{cell(s, n)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="split-cards">
        {slots.map((s) => {
          const { Icon, label } = MEAL_META[s]
          const t = per[s]
          return (
            <li key={s} className="split-card">
              <h3 className="split-card__title"><Icon size={18} /> {label} <span className="split-share">{pct(split[s])} of your day</span></h3>
              <p className="split-card__kcal">{t.calories != null ? `${fmtAmount(t.calories)} kcal` : '—'}</p>
              <p>{t.protein != null ? `${fmtAmount(t.protein)} g protein` : '—'}</p>
              <p className="muted">{t.carbs != null ? `${fmtAmount(t.carbs)} g carbs` : '—'} · {t.fat != null ? `${fmtAmount(t.fat)} g fat` : '—'}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
