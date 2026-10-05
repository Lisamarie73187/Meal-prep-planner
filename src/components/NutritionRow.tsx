import { NUTRIENTS, NUTRIENT_LABEL } from '../lib/types'
import type { Nutrition } from '../lib/types'
import { round } from '../lib/nutrition'

export function NutritionRow({ nutrition }: { nutrition: Nutrition }) {
  return (
    <div className="nutr" aria-label="Nutrition per serving">
      {NUTRIENTS.map((n) => (
        <div key={n}>
          <span className="nutr__v">{round(nutrition[n], n === 'calories' ? 0 : 1)}</span>
          <span className="nutr__l">{n === 'calories' ? 'kcal' : NUTRIENT_LABEL[n]}</span>
        </div>
      ))}
    </div>
  )
}
