import { Link } from 'react-router-dom'
import { IconCalendar, IconPencil } from '../Icons'
import { MEAL_META } from '../mealMeta'
import { DIETS } from '../../lib/diet'
import { setupPath } from '../../lib/setupDraft'
import type { MealCategory, PlanPreferences } from '../../lib/types'

/** A compact recap of Set up, with a way back to edit it. Editing starts from what's already saved. */
export function PlanSummary({ planId, counts, prefs, pantry, excluded }: {
  planId: string
  counts: Record<MealCategory, number>
  prefs: PlanPreferences
  pantry: number
  excluded: number
}) {
  const meals = (Object.keys(MEAL_META) as MealCategory[]).filter((c) => counts[c] > 0)
  const diets = DIETS.filter((d) => prefs.diets.includes(d.key)).map((d) => d.label)
  return (
    <section className="setup-card g-card" aria-labelledby="g-summary">
      <div className="g-card__head">
        <h2 id="g-summary" className="g-card__title"><span className="g-card__icon"><IconCalendar size={20} /></span> Plan summary</h2>
        <Link className="btn btn-sm-ds" to={setupPath('meals', planId)}><IconPencil size={16} /> Edit setup</Link>
      </div>
      <ul className="g-chips" aria-label="Your setup">
        {meals.map((c) => {
          const { Icon, label } = MEAL_META[c]
          return <li key={c} className="g-chip g-chip--meal"><Icon size={16} /> {label} · {counts[c]} {counts[c] === 1 ? 'recipe' : 'recipes'}</li>
        })}
        {diets.length === 0 ? <li className="g-chip">No dietary preferences</li> : diets.map((d) => <li key={d} className="g-chip">{d}</li>)}
        {pantry > 0 && <li className="g-chip">{pantry} pantry {pantry === 1 ? 'ingredient' : 'ingredients'}</li>}
        {excluded > 0 && <li className="g-chip">{excluded} {excluded === 1 ? 'food' : 'foods'} excluded</li>}
      </ul>
    </section>
  )
}
