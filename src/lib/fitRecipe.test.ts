import { describe, expect, it } from 'vitest'
import { fitRecipe, MAX_SCALE, MIN_SCALE } from './autofit'
import { perServingNutrition } from './nutrition'
import { suggest } from './suggest'
import { chicken, oil, rice } from './testData'
import type { Recipe } from './types'

// One serving: 150 g chicken, 100 g rice, 10 ml oil.
const recipeOf = (name: string, chickenG: number, riceG: number, oilMl: number): Recipe => ({
  id: name, owner_id: null, copied_from: null, name, category: 'dinner', servings: 1, prep_minutes: 10, photo_path: null, instructions: [],
  recipe_ingredients: [
    { ingredient_id: chicken.id, amount: chickenG, display_unit: null, position: 0, ingredient: chicken },
    { ingredient_id: rice.id, amount: riceG, display_unit: null, position: 1, ingredient: rice },
    { ingredient_id: oil.id, amount: oilMl, display_unit: null, position: 2, ingredient: oil },
  ],
}) as Recipe

const target = { calories: 500, protein: 45, carbs: 40, fat: 10 }
const prefs = { have: '', dislikes: '', diets: [] }

describe('fitRecipe', () => {
  it('returns null without a calorie or macro target', () => {
    expect(fitRecipe(recipeOf('a', 150, 100, 10), {})).toBeNull()
    expect(fitRecipe(recipeOf('a', 150, 100, 10), { fiber: 30 })).toBeNull()
  })

  it('moves a too-heavy recipe toward the target, within the 50%-200% limits', () => {
    const r = recipeOf('heavy', 150, 200, 20)
    const fit = fitRecipe(r, target)!
    expect(fit.changed).toBe(true)
    expect(fit.nutrition.calories).toBeLessThan(perServingNutrition(r).calories)
    for (const ri of r.recipe_ingredients) {
      const k = fit.amounts[ri.ingredient_id] / ri.amount
      expect(k).toBeGreaterThanOrEqual(MIN_SCALE - 0.05)
      expect(k).toBeLessThanOrEqual(MAX_SCALE + 0.05)
    }
  })

  it('leaves a recipe that already fits alone, with its original amounts', () => {
    const r = recipeOf('fits', 150, 100, 10)
    const exact = perServingNutrition(r)
    const fit = fitRecipe(r, { calories: exact.calories, protein: exact.protein })!
    expect(fit.changed).toBe(false)
    expect(fit.allMet).toBe(true)
    expect(fit.amounts[chicken.id]).toBe(150)
  })
})

describe('suggest with fit', () => {
  const prefsAll = prefs
  it('ranks a recipe by what its portions can reach, not by how it is written', () => {
    // "big" is 1.6x the target as written but fits when scaled down; "tiny-protein" can never reach the protein.
    const big = recipeOf('big', 240, 160, 16)
    const stuck = recipeOf('stuck', 20, 100, 10)
    const asWritten = suggest([big, stuck], 'dinner', target, prefsAll).map((s) => s.recipe.name)
    const fitted = suggest([big, stuck], 'dinner', target, prefsAll, { fit: true })
    expect(fitted[0].recipe.name).toBe('big')
    expect(fitted[0].fitted).not.toBeNull()
    expect(fitted[0].miss!).toBeLessThan(suggest([big], 'dinner', target, prefsAll)[0].miss!)
    expect(asWritten).toHaveLength(2)
  })
  it('does not fit when not asked, and keeps the as-written numbers on the suggestion', () => {
    const [s] = suggest([recipeOf('big', 240, 160, 16)], 'dinner', target, prefsAll)
    expect(s.fitted).toBeNull()
  })
})
