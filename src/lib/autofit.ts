import type { Amounts, Ingredient, Nutrition, Recipe } from './types'
import { nutritionFor, perServingAmounts } from './nutrition'

const FIT_NUTRIENTS = ['calories', 'protein', 'carbs', 'fat'] as const
export const MIN_SCALE = 0.5
export const MAX_SCALE = 2
/** A target counts as "met" when within this fraction of it. */
export const TOLERANCE = 0.05

export interface FitInput {
  ingredient: Ingredient
  /** Original per-serving amount (base unit). */
  amount: number
}

export interface FitResult {
  amounts: Amounts
  nutrition: Nutrition
  /** Nutrients (of calories/protein/carbs/fat) that ended within tolerance of the target. */
  met: Record<(typeof FIT_NUTRIENTS)[number], boolean>
  allMet: boolean
  /** Ingredients pinned at the 50% / 200% limit. */
  atBound: string[]
}

/** Round to an amount you could actually measure: 0.5 each, 1 g/ml below 25, else 5. */
export function practicalAmount(amount: number, ing: Pick<Ingredient, 'base_unit'>): number {
  if (ing.base_unit === 'each') return Math.max(0.5, Math.round(amount * 2) / 2)
  if (amount < 25) return Math.max(1, Math.round(amount))
  return Math.round(amount / 5) * 5
}

/**
 * Find ingredient multipliers in [0.5, 2] minimising the relative error of calories, protein,
 * carbs and fat vs the per-meal target. Every ingredient is kept. Solved by projected coordinate
 * descent (convex bounded least squares); a tiny pull toward 1 keeps untouched ingredients stable.
 */
export function autoFit(inputs: FitInput[], target: Partial<Nutrition>): FitResult {
  const ks = FIT_NUTRIENTS.filter((k) => target[k] != null && target[k]! > 0)
  const x = inputs.map(() => 1)
  // c[k][i] = what ingredient i contributes to nutrient k at its original amount
  const c = ks.map((k) => inputs.map((it) => it.ingredient[k] * it.amount))
  const w = ks.map((k) => 1 / target[k]! ** 2)
  const lambda = 1e-4

  for (let iter = 0; iter < 400 && ks.length; iter++) {
    for (let j = 0; j < inputs.length; j++) {
      let num = lambda
      let den = lambda
      ks.forEach((k, a) => {
        let others = 0
        for (let i = 0; i < inputs.length; i++) if (i !== j) others += c[a][i] * x[i]
        num += w[a] * c[a][j] * (target[k]! - others)
        den += w[a] * c[a][j] ** 2
      })
      x[j] = Math.min(MAX_SCALE, Math.max(MIN_SCALE, num / den))
    }
  }

  const amounts: Amounts = {}
  const atBound: string[] = []
  inputs.forEach((it, i) => {
    amounts[it.ingredient.id] = practicalAmount(it.amount * x[i], it.ingredient)
    if (x[i] <= MIN_SCALE + 1e-3 || x[i] >= MAX_SCALE - 1e-3) atBound.push(it.ingredient.id)
  })
  const nutrition = nutritionFor(inputs.map((it) => ({ ingredient: it.ingredient, amount: amounts[it.ingredient.id] })))
  const met = { calories: true, protein: true, carbs: true, fat: true }
  for (const k of ks) met[k] = Math.abs(nutrition[k] - target[k]!) <= TOLERANCE * target[k]!
  return { amounts, nutrition, met, allMet: ks.every((k) => met[k]), atBound }
}

export interface RecipeFit extends FitResult {
  /** False when the recipe already fits (or fitting could not improve it), so amounts are the originals. */
  changed: boolean
}

const relMiss = (n: Nutrition, target: Partial<Nutrition>, ks: readonly (typeof FIT_NUTRIENTS)[number][]) =>
  ks.reduce((a, k) => a + Math.abs(n[k] - target[k]!) / target[k]!, 0) / ks.length

/**
 * Fit a whole recipe's per-serving amounts to a per-meal target. Returns null with no calorie/macro target.
 * Leaves the recipe alone when it is already within tolerance or when fitting would not get closer.
 */
export function fitRecipe(recipe: Pick<Recipe, 'servings' | 'recipe_ingredients'>, target: Partial<Nutrition>): RecipeFit | null {
  const ks = FIT_NUTRIENTS.filter((k) => target[k] != null && target[k]! > 0)
  if (ks.length === 0) return null
  const original = perServingAmounts(recipe)
  const seen = new Set<string>()
  const inputs: FitInput[] = []
  for (const ri of recipe.recipe_ingredients) {
    if (seen.has(ri.ingredient_id)) continue
    seen.add(ri.ingredient_id)
    inputs.push({ ingredient: ri.ingredient, amount: original[ri.ingredient_id] })
  }
  const before = nutritionFor(inputs)
  const met = { calories: true, protein: true, carbs: true, fat: true }
  for (const k of ks) met[k] = Math.abs(before[k] - target[k]!) <= TOLERANCE * target[k]!
  const unchanged: RecipeFit = { amounts: original, nutrition: before, met, allMet: ks.every((k) => met[k]), atBound: [], changed: false }
  if (unchanged.allMet) return unchanged
  const fit = autoFit(inputs, target)
  return relMiss(fit.nutrition, target, ks) < relMiss(before, target, ks) ? { ...fit, changed: true } : unchanged
}
