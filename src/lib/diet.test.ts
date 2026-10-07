import { describe, expect, it } from 'vitest'
import { guessContains, recipeFitsDiets } from './diet'
import type { IngredientTag, Recipe } from './types'

const recipe = (...tags: IngredientTag[][]) =>
  ({ recipe_ingredients: tags.map((contains) => ({ ingredient: { contains } })) }) as unknown as Recipe

describe('recipeFitsDiets', () => {
  it('allows everything with no diet', () => expect(recipeFitsDiets(recipe(['meat']), [])).toBe(true))
  it('vegetarian rejects meat and fish but allows dairy and egg', () => {
    expect(recipeFitsDiets(recipe(['meat']), ['vegetarian'])).toBe(false)
    expect(recipeFitsDiets(recipe(['fish']), ['vegetarian'])).toBe(false)
    expect(recipeFitsDiets(recipe(['dairy'], ['egg']), ['vegetarian'])).toBe(true)
  })
  it('vegan rejects meat, fish, dairy, egg and other animal products', () => {
    for (const t of ['meat', 'fish', 'dairy', 'egg', 'animal'] as const) expect(recipeFitsDiets(recipe([t]), ['vegan'])).toBe(false)
    expect(recipeFitsDiets(recipe([], []), ['vegan'])).toBe(true)
  })
  it('pescatarian allows fish, dairy and egg but rejects meat and poultry', () => {
    expect(recipeFitsDiets(recipe(['fish'], ['dairy'], ['egg']), ['pescatarian'])).toBe(true)
    expect(recipeFitsDiets(recipe(['meat']), ['pescatarian'])).toBe(false)
    expect(recipeFitsDiets(recipe(['fish'], ['meat']), ['pescatarian'])).toBe(false) // one meat ingredient is enough
    expect(recipeFitsDiets(recipe([], []), ['pescatarian'])).toBe(true)
  })
  it('pescatarian combines with dairy-free and gluten-free', () => {
    expect(recipeFitsDiets(recipe(['fish'], ['dairy']), ['pescatarian', 'dairy_free'])).toBe(false)
    expect(recipeFitsDiets(recipe(['fish']), ['pescatarian', 'dairy_free', 'gluten_free'])).toBe(true)
  })
  it('dairy-free and gluten-free each reject only their own tag', () => {
    expect(recipeFitsDiets(recipe(['dairy']), ['dairy_free'])).toBe(false)
    expect(recipeFitsDiets(recipe(['gluten']), ['dairy_free'])).toBe(true)
    expect(recipeFitsDiets(recipe(['gluten']), ['gluten_free'])).toBe(false)
  })
  it('combines diets', () => {
    expect(recipeFitsDiets(recipe(['dairy'], ['gluten']), ['vegetarian', 'gluten_free'])).toBe(false)
  })
  it('treats ingredients without flags (older snapshots) as unflagged', () => {
    const r = { recipe_ingredients: [{ ingredient: {} }] } as unknown as Recipe
    expect(recipeFitsDiets(r, ['vegan'])).toBe(true)
  })
})

describe('guessContains', () => {
  it.each([
    ['Chicken breast', ['meat']],
    ['Canned tuna', ['fish']],
    ['Salmon fillet', ['fish']],
    ['Shrimp', ['fish']],
    ['Ground beef', ['meat']],
    ['Chicken broth', ['meat']],
    ['Fish stock', ['meat', 'fish']],
    ['Cheddar cheese', ['dairy']],
    ['Greek yogurt', ['dairy']],
    ['Butter', ['dairy']],
    ['Eggs', ['egg']],
    ['Whole-wheat tortilla', ['gluten']],
    ['Soy sauce', ['gluten']],
    ['Honey', ['animal']],
    ['Mac and cheese pasta', ['dairy', 'gluten']],
  ])('%s -> %j', (name, tags) => expect(guessContains(name)).toEqual(tags))

  it.each(['Vegetable broth', 'Mushroom stock', 'Almond milk', 'Coconut cream', 'Peanut butter', 'Almond butter', 'Butternut squash', 'Rice', 'Spinach', 'Cream of tartar'])(
    '%s has nothing to flag', (name) => expect(guessContains(name)).toEqual([]),
  )
  // Oats are flagged as gluten (usually cross-contaminated), so oat milk is too, but it is still not dairy.
  it('flags oat milk as gluten but not dairy', () => expect(guessContains('Oat milk')).toEqual(['gluten']))
  it('is empty for a blank name', () => expect(guessContains('  ')).toEqual([]))
})
