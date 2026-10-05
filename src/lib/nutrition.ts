import { NUTRIENTS } from './types'
import type { Amounts, Ingredient, MealCategory, Nutrition, Profile, Recipe } from './types'

export const zero = (): Nutrition => ({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 })

export function addNutrition(a: Nutrition, b: Nutrition): Nutrition {
  const out = zero()
  for (const n of NUTRIENTS) out[n] = a[n] + b[n]
  return out
}

export function scaleNutrition(a: Nutrition, k: number): Nutrition {
  const out = zero()
  for (const n of NUTRIENTS) out[n] = a[n] * k
  return out
}

/** Nutrition of `amount` base units of an ingredient. */
export function ingredientNutrition(ing: Ingredient, amount: number): Nutrition {
  const out = zero()
  for (const n of NUTRIENTS) out[n] = ing[n] * amount
  return out
}

/** Nutrition for a set of per-serving amounts. Never hardcoded: always summed from ingredients. */
export function nutritionFor(items: { ingredient: Ingredient; amount: number }[]): Nutrition {
  return items.reduce((acc, it) => addNutrition(acc, ingredientNutrition(it.ingredient, it.amount)), zero())
}

export function perServingAmounts(recipe: Pick<Recipe, 'servings' | 'recipe_ingredients'>): Amounts {
  const out: Amounts = {}
  for (const ri of recipe.recipe_ingredients) {
    out[ri.ingredient_id] = (out[ri.ingredient_id] ?? 0) + ri.amount / recipe.servings
  }
  return out
}

export function perServingNutrition(
  recipe: Pick<Recipe, 'servings' | 'recipe_ingredients'>,
  amounts: Amounts = perServingAmounts(recipe),
): Nutrition {
  const seen = new Set<string>()
  const items: { ingredient: Ingredient; amount: number }[] = []
  for (const ri of recipe.recipe_ingredients) {
    if (seen.has(ri.ingredient_id)) continue
    seen.add(ri.ingredient_id)
    items.push({ ingredient: ri.ingredient, amount: amounts[ri.ingredient_id] ?? 0 })
  }
  return nutritionFor(items)
}

export const DEFAULT_SPLIT: Record<MealCategory, number> = {
  breakfast: 0.25,
  lunch: 0.3,
  dinner: 0.35,
  snack: 0.1,
}

export function dailyTargets(p: Profile | null): Partial<Nutrition> {
  if (!p) return {}
  const t: Partial<Nutrition> = {}
  for (const n of NUTRIENTS) {
    const v = p[`target_${n}` as keyof Profile] as number | null
    if (v != null) t[n] = Number(v)
  }
  return t
}

export function splitOf(p: Profile | null): Record<MealCategory, number> {
  if (!p) return DEFAULT_SPLIT
  return {
    breakfast: Number(p.split_breakfast),
    lunch: Number(p.split_lunch),
    dinner: Number(p.split_dinner),
    snack: Number(p.split_snack),
  }
}

/** Per-meal target for a category = daily target x that category's share of the day. */
export function mealTargets(p: Profile | null, category: MealCategory): Partial<Nutrition> {
  const share = splitOf(p)[category]
  const out: Partial<Nutrition> = {}
  for (const [n, v] of Object.entries(dailyTargets(p))) out[n as keyof Nutrition] = v * share
  return out
}

export const round = (v: number, digits = 0) => {
  const k = 10 ** digits
  return Math.round(v * k) / k
}
