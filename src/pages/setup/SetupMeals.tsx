import { Link, useOutletContext } from 'react-router-dom'
import { IconArrowRight, IconMinus, IconPlus } from '../../components/Icons'
import { MEAL_META } from '../../components/mealMeta'
import { setupPath } from '../../lib/setupDraft'
import type { MealCategory } from '../../lib/types'
import type { SetupCtx } from './SetupLayout'

const MAX_PER_MEAL = 6

const MEALS = (['breakfast', 'lunch', 'dinner', 'snack'] as MealCategory[]).map((key) => ({ key, ...MEAL_META[key] }))

export function SetupMeals() {
  const { draft, update, total, planId } = useOutletContext<SetupCtx>()
  const set = (key: MealCategory, n: number) => update({ counts: { ...draft.counts, [key]: Math.min(MAX_PER_MEAL, Math.max(0, n)) } })

  return (
    <section className="setup-page" aria-labelledby="setup-title">
      <header className="setup-head">
        <h1 id="setup-title">Let's plan your prep</h1>
      </header>

      <div className="setup-card">
        <h2>How many different recipes do you want?</h2>
        <p className="setup-lede">Pick how many different recipes you'd like for each meal. You'll choose servings later.</p>

        <ul className="meal-rows">
          {MEALS.map(({ key, label, noun, Icon }) => {
            const n = draft.counts[key]
            return (
              <li key={key} className="meal-row">
                <span className="meal-row__icon"><Icon size={22} /></span>
                <span className="meal-row__name">{label}</span>
                <span className="meal-row__ctl">
                  <button type="button" className="round-btn" aria-label={`Remove ${noun} recipe`} disabled={n === 0} onClick={() => set(key, n - 1)}>
                    <IconMinus size={20} />
                  </button>
                  <output className="meal-row__count" aria-live="polite">
                    {n}<span className="visually-hidden"> {n === 1 ? 'recipe' : 'recipes'} for {noun}</span>
                  </output>
                  <button type="button" className="round-btn round-btn--add" aria-label={`Add ${noun} recipe`} disabled={n >= MAX_PER_MEAL} onClick={() => set(key, n + 1)}>
                    <IconPlus size={20} />
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="wizard-actions">
        <p className="wizard-summary" aria-live="polite">
          <strong>{total} {total === 1 ? 'recipe' : 'recipes'} selected</strong>
          {total === 0 && <span> · choose at least one to continue</span>}
        </p>
        {total > 0 ? (
          <Link className="btn btn-primary btn-lg" to={setupPath('ingredients', planId)}>Continue <IconArrowRight size={20} /></Link>
        ) : (
          <button type="button" className="btn btn-primary btn-lg" disabled>Continue <IconArrowRight size={20} /></button>
        )}
      </div>
    </section>
  )
}
