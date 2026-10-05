import { lineNutrition } from '../lib/grocery'
import type { PlanLine } from '../lib/types'
import { formatAmount, formatPortion } from '../lib/units'
import { NutritionRow } from './NutritionRow'

/** Each recipe scaled to the number of portions, with its steps. */
export function ScaledRecipes({ lines }: { lines: PlanLine[] }) {
  return (
    <div className="stack">
      {lines.map((l) => (
        <article className="card recipe-block stack-sm" key={`${l.recipeId}-${l.category}`}>
          <h2>{l.name}</h2>
          <p className="muted small">Batch for {l.meals} {l.meals === 1 ? 'portion' : 'portions'} ({l.category})</p>
          <ul>
            {l.ingredients.map((i) => (
              <li key={i.ingredient.id}>{formatAmount(i.perServing * l.meals, i.ingredient).text} {i.ingredient.name}</li>
            ))}
          </ul>
          <ol className="steps-list">{l.instructions.map((s, n) => <li key={n}>{s}</li>)}</ol>
        </article>
      ))}
    </div>
  )
}

/** Exact amounts for one meal container, with that container's nutrition. */
export function PortionGuide({ lines }: { lines: PlanLine[] }) {
  return (
    <div className="stack">
      {lines.map((l) => (
        <article className="card recipe-block stack-sm" key={`${l.recipeId}-${l.category}`}>
          <h2>{l.name} <span className="badge">{l.meals} containers</span></h2>
          <p><strong>Per container:</strong> {l.ingredients.map((i) => `${formatPortion(i.perServing, i.ingredient)} ${i.ingredient.name}`).join(', ')}</p>
          <NutritionRow nutrition={lineNutrition(l)} />
        </article>
      ))}
    </div>
  )
}
