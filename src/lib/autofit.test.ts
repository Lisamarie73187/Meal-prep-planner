import { describe, expect, it } from 'vitest'
import { autoFit } from './autofit'
import { perServingNutrition } from './nutrition'
import { chicken, oil, rice } from './testData'

const inputs = [
  { ingredient: chicken, amount: 100 },
  { ingredient: rice, amount: 50 },
  { ingredient: oil, amount: 10 },
]

describe('autoFit', () => {
  it('hits an achievable target and keeps every ingredient', () => {
    const base = perServingNutrition({
      servings: 1,
      recipe_ingredients: inputs.map((i, p) => ({ ingredient_id: i.ingredient.id, amount: i.amount, display_unit: null, position: p, ingredient: i.ingredient })),
    })
    const target = { calories: base.calories * 1.2, protein: base.protein * 1.2, carbs: base.carbs * 1.2, fat: base.fat * 1.2 }
    const r = autoFit(inputs, target)
    expect(Object.keys(r.amounts)).toHaveLength(3)
    expect(r.allMet).toBe(true)
  })
  it('stays within 50%-200% and reports unreachable targets', () => {
    const r = autoFit(inputs, { calories: 5000, protein: 300, carbs: 10, fat: 1 })
    expect(r.allMet).toBe(false)
    for (const i of inputs) {
      const a = r.amounts[i.ingredient.id]
      expect(a).toBeGreaterThanOrEqual(i.amount * 0.5 - 1)
      expect(a).toBeLessThanOrEqual(i.amount * 2 + 1)
    }
    expect(r.atBound.length).toBeGreaterThan(0)
  })
})
