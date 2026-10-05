import { describe, expect, it } from 'vitest'
import { dayTotals } from './grocery'
import { chicken, egg, rice } from './testData'
import type { Ingredient, MealCategory, PlanLine } from './types'

const line = (name: string, category: MealCategory, meals: number, ...ings: [Ingredient, number][]): PlanLine => ({
  recipeId: name, name, category, servings: 1, meals, instructions: [],
  ingredients: ings.map(([ingredient, perServing]) => ({ ingredient, perServing })),
})

describe('dayTotals', () => {
  it('is one portion of each meal type, not the whole batch', () => {
    // 5 lunches of 100 g chicken (165 kcal) and 5 dinners of 100 g rice (370 kcal): a day is 165 + 370, not x5.
    const { day, slots } = dayTotals([line('Chicken', 'lunch', 5, [chicken, 100]), line('Rice', 'dinner', 5, [rice, 100])])
    expect(day.calories).toBeCloseTo(165 + 370, 5)
    expect(slots).toEqual(['lunch', 'dinner'])
  })

  it('averages several recipes in one meal type, weighted by portions', () => {
    // 3 lunches at 165 kcal and 1 lunch at 370 kcal -> (3*165 + 370) / 4
    const { day } = dayTotals([line('A', 'lunch', 3, [chicken, 100]), line('B', 'lunch', 1, [rice, 100])])
    expect(day.calories).toBeCloseTo((3 * 165 + 370) / 4, 5)
  })

  it('orders meal types breakfast to snack and ignores empty ones', () => {
    const { slots } = dayTotals([line('Snack', 'snack', 2, [egg, 1]), line('Breakfast', 'breakfast', 2, [egg, 2])])
    expect(slots).toEqual(['breakfast', 'snack'])
  })

  it('is zero for an empty plan', () => {
    expect(dayTotals([])).toEqual({ day: expect.objectContaining({ calories: 0, protein: 0 }), slots: [] })
  })
})
