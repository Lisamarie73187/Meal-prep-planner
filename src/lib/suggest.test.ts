import { describe, expect, it } from 'vitest'
import { passesPrefs, prefsOf, reconcileItems, suggest } from './suggest'
import type { IngredientTag, MealCategory, PlanItemRow, Recipe } from './types'

let n = 0
const recipe = (name: string, category: MealCategory, opts: { cal?: number; protein?: number; ings?: [string, IngredientTag[]][] } = {}): Recipe => {
  const ings = opts.ings ?? [[name, []]]
  return {
    id: `r${n++}`, owner_id: null, copied_from: null, name, category, servings: 1, prep_minutes: 10, photo_path: null, instructions: [],
    recipe_ingredients: ings.map(([iname, contains], position) => ({
      ingredient_id: `${name}-${iname}`, amount: 1, display_unit: null, position,
      ingredient: { id: `${name}-${iname}`, owner_id: null, name: iname, base_unit: 'each', store_section: 'other', density_g_per_ml: null, contains,
        calories: (opts.cal ?? 0) / ings.length, protein: (opts.protein ?? 0) / ings.length, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
    })),
  } as Recipe
}
const prefs = (over = {}) => ({ have: '', dislikes: '', diets: [], ...over })

describe('passesPrefs', () => {
  it('removes recipes that break a diet', () => {
    const r = recipe('Chili', 'dinner', { ings: [['Ground beef', ['meat']]] })
    expect(passesPrefs(r, prefs({ diets: ['vegetarian'] }))).toBe(false)
    expect(passesPrefs(r, prefs())).toBe(true)
  })
  it('removes recipes with a disliked ingredient or name', () => {
    const r = recipe('Cilantro Lime Chicken', 'dinner', { ings: [['Chicken breast', ['meat']], ['Rice', []]] })
    expect(passesPrefs(r, prefs({ dislikes: 'rice' }))).toBe(false)
    expect(passesPrefs(r, prefs({ dislikes: 'Cilantro' }))).toBe(false)
    expect(passesPrefs(r, prefs({ dislikes: 'mushrooms' }))).toBe(true)
  })
})

describe('suggest', () => {
  const target = { calories: 500, protein: 40 }
  const close = recipe('Close', 'dinner', { cal: 520, protein: 38 })
  const far = recipe('Far', 'dinner', { cal: 900, protein: 10 })
  const wrongMeal = recipe('Perfect breakfast', 'breakfast', { cal: 500, protein: 40 })

  it('ranks by macro fit, own meal type first', () => {
    const out = suggest([far, wrongMeal, close], 'dinner', target, prefs())
    expect(out.map((s) => s.recipe.name)).toEqual(['Close', 'Far', 'Perfect breakfast'])
  })
  it('can offer other meal types so any recipe is available', () => {
    expect(suggest([wrongMeal], 'dinner', target, prefs()).map((s) => s.recipe.name)).toEqual(['Perfect breakfast'])
  })
  it('prefers recipes that use what you have when fit is similar', () => {
    const a = recipe('A', 'dinner', { cal: 500, protein: 40, ings: [['Beef', []]] })
    const b = recipe('B', 'dinner', { cal: 505, protein: 40, ings: [['Turkey', []]] })
    const out = suggest([a, b], 'dinner', target, prefs({ have: 'turkey' }))
    expect(out[0].recipe.name).toBe('B')
    expect(out[0].uses).toEqual(['turkey'])
  })
  it('excludes recipes that break preferences and reports a null miss without targets', () => {
    const meat = recipe('Meaty', 'dinner', { ings: [['Beef', ['meat']]] })
    const veg = recipe('Veggie', 'dinner')
    const out = suggest([meat, veg], 'dinner', {}, prefs({ diets: ['vegan'] }))
    expect(out.map((s) => s.recipe.name)).toEqual(['Veggie'])
    expect(out[0].miss).toBeNull()
  })
})

describe('prefsOf', () => {
  it('fills defaults for plans without preferences', () => {
    expect(prefsOf({})).toEqual({ have: '', dislikes: '', diets: [] })
    expect(prefsOf({ preferences: { diets: ['vegan'] } })).toEqual({ have: '', dislikes: '', diets: ['vegan'] })
  })
})

describe('reconcileItems', () => {
  const item = (category: MealCategory, meals: number, recipe_id = 'x'): PlanItemRow =>
    ({ plan_id: 'p', recipe_id, category, meals, amount_overrides: null, snapshot: null })
  const counts = { breakfast: 0, lunch: 2, dinner: 1, snack: 0 }
  const shape = (xs: PlanItemRow[]) => xs.map((i) => [i.category, i.recipe_id, i.meals])

  it('drops meal types you no longer want', () => {
    expect(shape(reconcileItems([item('breakfast', 4), item('lunch', 4, 'a')], counts))).toEqual([['lunch', 'a', 4]])
  })
  it('keeps only as many recipes as you asked for, first ones first', () => {
    const out = reconcileItems([item('dinner', 4, 'a'), item('dinner', 4, 'b'), item('lunch', 3, 'c'), item('lunch', 3, 'd'), item('lunch', 3, 'e')], counts)
    expect(shape(out)).toEqual([['lunch', 'c', 3], ['lunch', 'd', 3], ['dinner', 'a', 4]])
  })
  it('leaves each recipe\'s portions alone', () => {
    expect(shape(reconcileItems([item('lunch', 7, 'a'), item('lunch', 2, 'b')], counts))).toEqual([['lunch', 'a', 7], ['lunch', 'b', 2]])
  })
})
