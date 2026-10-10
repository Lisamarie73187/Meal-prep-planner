import { Link } from 'react-router-dom'
import { IconPie } from '../Icons'
import { MEAL_META } from '../mealMeta'
import { MacroDonut } from './MacroDonut'
import { fmtAmount, macroShares } from '../../lib/goals'
import { mealTargets, splitOf } from '../../lib/nutrition'
import type { MealCategory, Profile } from '../../lib/types'

const pct = (share: number) => `${Math.round(share * 100)}%`

/**
 * Per-meal targets for the meals in this plan. One card per meal in a grid (1 column on phones, more as there's room). Fiber and sugar aren't shown: recipe matching only uses calories and macros.
 */
export function MealSplit({ slots, profile, planId }: { slots: MealCategory[]; profile: Profile | null; planId: string }) {
  const split = splitOf(profile)
  const per = Object.fromEntries(slots.map((s) => [s, mealTargets(profile, s)])) as Record<MealCategory, ReturnType<typeof mealTargets>>
  const shares = Object.fromEntries(slots.map((s) => [s, macroShares(per[s])])) as Record<MealCategory, ReturnType<typeof macroShares>>

  return (
    <section className="setup-card g-card" aria-labelledby="g-split">
      <div className="g-card__head">
        <div>
          <h2 id="g-split" className="g-card__title"><span className="g-card__icon"><IconPie size={20} /></span> How your targets are split</h2>
          <p className="g-card__lede">We'll use these numbers when finding recipes for each meal.</p>
        </div>
        <Link className="btn btn-sm-ds" to="/targets" state={{ returnTo: `/plan/${planId}/goals` }}>Adjust meal split</Link>
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
              {shares[s] && <MacroDonut shares={shares[s]!} dayShare={pct(split[s])} meal={label} />}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
