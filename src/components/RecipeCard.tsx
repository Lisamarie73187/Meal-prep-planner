import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { photoUrl } from '../lib/supabase'
import { perServingNutrition } from '../lib/nutrition'
import type { Nutrition, Recipe } from '../lib/types'
import { NutritionRow } from './NutritionRow'

interface Props {
  recipe: Recipe
  selected?: boolean
  /** How many of the recipe's ingredients match what the person said they have, out of all its ingredients. */
  have?: { have: number; total: number }
  /** When set, shown as "Makes N portions" instead of the recipe's own serving count. */
  portions?: number
  /** Per-serving nutrition to show instead of the recipe's own (e.g. after fitting portions). */
  nutrition?: Nutrition
  actions?: ReactNode
}

const EMOJI = { breakfast: '🍳', lunch: '🥗', dinner: '🍲', snack: '🍎' }

export function RecipeCard({ recipe, selected, have, nutrition, portions, actions }: Props) {
  const img = photoUrl(recipe.photo_path)
  return (
    <article className={`card recipe-card${selected ? ' selected' : ''}`}>
      {img ? (
        <img className="recipe-card__img" src={img} alt="" loading="lazy" />
      ) : (
        <div className="recipe-card__img" aria-hidden="true">{EMOJI[recipe.category]}</div>
      )}
      <div className="recipe-card__body">
        <h3 className="recipe-card__title">
          <Link to={`/recipes/${recipe.id}`} className="link-plain">{recipe.name}</Link>
        </h3>
        <div className="row small muted">
          <span>⏱ {recipe.prep_minutes} min</span>
          <span>· {portions != null ? `makes ${portions} ${portions === 1 ? 'portion' : 'portions'}` : `${recipe.servings} servings`}</span>
          {recipe.copied_from && <span className="badge">adjusted copy</span>}
        </div>
        <NutritionRow nutrition={nutrition ?? perServingNutrition(recipe)} />
        {have && (
          <span className={`badge ${have.have === have.total ? 'badge-ok' : have.have > 0 ? 'badge-warn' : ''}`}>
            {have.have} of {have.total} ingredients on hand
          </span>
        )}
        {actions && <div className="recipe-card__actions">{actions}</div>}
      </div>
    </article>
  )
}
