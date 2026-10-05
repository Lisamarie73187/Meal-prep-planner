import { describe, expect, it } from 'vitest'
import { nameMatches, parseHave, recipeMatch } from './have'
import type { Recipe } from './types'

const recipe = (...names: string[]) =>
  ({ recipe_ingredients: names.map((name) => ({ ingredient: { name } })) }) as unknown as Recipe

describe('parseHave', () => {
  it('splits on commas, semicolons and newlines, lowercases, trims and de-duplicates', () => {
    expect(parseHave(' Turkey, chicken ;spinach\nTURKEY, , a')).toEqual(['turkey', 'chicken', 'spinach'])
  })
  it('is empty for blank input', () => expect(parseHave('  ,, ')).toEqual([]))
})

describe('nameMatches', () => {
  it.each([
    ['Ground turkey (93% lean)', 'turkey'],
    ['Chicken breast', 'chicken'],
    ['Baby spinach', 'spinach'],
    ['Eggs', 'egg'],
    ['Egg', 'eggs'],
    ['Sweet potato', 'potatoes'],
    ['Potatoes', 'potato'],
    ['Strawberries', 'strawberry'],
    ['Strawberry', 'strawberries'],
    ['Ground turkey (93% lean)', 'ground turkey'],
    ['Peas', 'pea'],
  ])('%s matches %s', (name, term) => expect(nameMatches(name, term)).toBe(true))

  it.each([
    ['Pear', 'pea'],
    ['Graham crackers', 'ham'],
    ['Olive oil', 'oil seed'],
    ['Chicken broth', 'beef'],
  ])('%s does not match %s', (name, term) => expect(nameMatches(name, term)).toBe(false))
})

describe('recipeMatch', () => {
  it('counts matching ingredients and reports which terms were used', () => {
    const m = recipeMatch(recipe('Ground turkey', 'Spinach', 'Olive oil', 'Turkey stock'), ['turkey', 'spinach', 'chicken'])
    expect(m).toEqual({ count: 3, terms: ['turkey', 'spinach'] })
  })
  it('is zero when nothing matches', () => {
    expect(recipeMatch(recipe('Rice', 'Beans'), ['turkey'])).toEqual({ count: 0, terms: [] })
  })
})
