import { describe, expect, it } from 'vitest'
import { buildLines } from './api'
import { chicken, oil, rice } from './testData'
import type { PlanItemRow, Recipe } from './types'

const recipe = {
  id: 'r1', owner_id: null, copied_from: null, name: 'Bowl', category: 'lunch', servings: 2, prep_minutes: 10, photo_path: null, instructions: [],
  recipe_ingredients: [chicken, rice, oil].map((ingredient, position) => ({ ingredient_id: ingredient.id, amount: 200, display_unit: null, position, ingredient })),
} as unknown as Recipe

const item = (amount_overrides: Record<string, number> | null): PlanItemRow =>
  ({ plan_id: 'p', recipe_id: 'r1', category: 'lunch', meals: 3, amount_overrides, snapshot: null })

describe('leaving an ingredient out of a plan', () => {
  const recipes = new Map([['r1', recipe]])

  it('keeps every ingredient when nothing is overridden', () => {
    const [l] = buildLines([item(null)], recipes)
    expect(l.ingredients.map((i) => i.ingredient.name)).toEqual(['Chicken', 'Rice', 'Oil'])
  })

  it('drops an ingredient whose override is 0, and keeps the rest', () => {
    const [l] = buildLines([item({ [rice.id]: 0 })], recipes)
    expect(l.ingredients.map((i) => i.ingredient.name)).toEqual(['Chicken', 'Oil'])
    expect(l.ingredients[0].perServing).toBe(100) // untouched ingredients still use the recipe's per-serving amount
  })

  it('uses a positive override instead of the recipe amount', () => {
    const [l] = buildLines([item({ [chicken.id]: 150 })], recipes)
    expect(l.ingredients.find((i) => i.ingredient.id === chicken.id)!.perServing).toBe(150)
  })

  it('also applies to a frozen snapshot', () => {
    const snap: PlanItemRow = { ...item({ [oil.id]: 0 }), snapshot: { name: 'Bowl', servings: 2, instructions: [], ingredients: [chicken, rice, oil].map((ingredient) => ({ ingredient, amount: 200 })) } }
    const [l] = buildLines([snap], new Map())
    expect(l.ingredients.map((i) => i.ingredient.name)).toEqual(['Chicken', 'Rice'])
  })
})
