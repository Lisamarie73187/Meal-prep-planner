import { describe, expect, it } from 'vitest'
import { buildDraft, matchIngredient, normalizeParsed, rowFor } from './parseRecipe'
import { mk } from './testData'

const cat = [
  mk({ id: 'beans', name: 'Black beans (canned, drained)' }),
  mk({ id: 'tom', name: 'Canned diced tomatoes' }),
  mk({ id: 'chk', name: 'Chicken breast' }),
  mk({ id: 'turk', name: 'Ground turkey (93% lean)' }),
  mk({ id: 'oil', name: 'Olive oil', base_unit: 'ml' }),
  mk({ id: 'milk', name: 'Milk (2%)', base_unit: 'ml' }),
  mk({ id: 'almond', name: 'Unsweetened almond milk', base_unit: 'ml' }),
  mk({ id: 'bell', name: 'Bell pepper' }),
  mk({ id: 'rice', name: 'Brown rice (dry)', density_g_per_ml: 0.78 }),
  mk({ id: 'egg', name: 'Egg', base_unit: 'each' }),
]

describe('normalizeParsed', () => {
  it('keeps good data and fixes or drops bad data', () => {
    const p = normalizeParsed({
      name: '  Chili ', category: 'brunch', servings: 0, prep_minutes: 'abc',
      ingredients: [{ name: 'Rice', amount: 2, unit: 'cup' }, { name: 'Salt', amount: -1, unit: 'g' }, { name: 'Gold', amount: 1, unit: 'bar' }, 'junk', { name: '', amount: 1, unit: 'g' }],
      steps: ['Cook.', '', 5],
    })
    expect(p).toEqual({ name: 'Chili', category: 'dinner', servings: 1, prep_minutes: 20, ingredients: [{ name: 'Rice', amount: 2, unit: 'cup' }], steps: ['Cook.'] })
  })
  it('survives nonsense', () => {
    expect(normalizeParsed(null).ingredients).toEqual([])
    expect(normalizeParsed('x').steps).toEqual([])
  })
})

describe('matchIngredient', () => {
  it('matches singular/plural and ignores bracketed notes', () => {
    expect(matchIngredient('chicken breasts', cat)).toMatchObject({ kind: 'exact', ingredient: { id: 'chk' } })
    expect(matchIngredient('ground turkey', cat)).toMatchObject({ kind: 'exact', ingredient: { id: 'turk' } })
  })
  it('prefers the exact match over a longer name that contains it', () => {
    expect(matchIngredient('milk', cat)).toMatchObject({ kind: 'exact', ingredient: { id: 'milk' } })
  })
  it('prefers the more specific catalogue entry over a vaguer one that is a different food', () => {
    expect(matchIngredient('almond milk', cat)).toMatchObject({ kind: 'close', ingredient: { id: 'almond' } })
    // with no almond milk in the catalogue it still offers dairy milk, flagged as close for a human to check
    expect(matchIngredient('almond milk', cat.filter((i) => i.id !== 'almond'))).toMatchObject({ kind: 'close', ingredient: { id: 'milk' } })
  })
  it('is a close match when one name contains the other, and null when nothing fits', () => {
    expect(matchIngredient('oil', cat)).toMatchObject({ kind: 'close', ingredient: { id: 'oil' } })
    expect(matchIngredient('dragon fruit', cat)).toBeNull()
    expect(matchIngredient('', cat)).toBeNull()
  })
})

describe('buildDraft', () => {
  const parsed = normalizeParsed({
    name: 'Bowl', category: 'lunch', servings: 4, prep_minutes: 30, steps: ['Mix.'],
    ingredients: [
      { name: 'olive oil', amount: 2, unit: 'tbsp' },
      { name: 'bell pepper', amount: 2, unit: 'each' },
      { name: 'chicken breast', amount: 1, unit: 'lb' },
      { name: 'eggs', amount: 3, unit: 'each' },
      { name: 'brown rice', amount: 1, unit: 'cup' },
      { name: 'dragon fruit', amount: 1, unit: 'each' },
      { name: 'olive oil', amount: 1, unit: 'tbsp' },
      { name: 'almond milk', amount: 1, unit: 'cup' },
    ],
  })
  const d = buildDraft(parsed, cat)
  const amount = (id: string) => d.rows.find((r) => r.ingredient.id === id)?.amount
  it('converts to each ingredient\'s base unit', () => {
    expect(amount('chk')).toBeCloseTo(453.592, 1)
    expect(amount('egg')).toBe(3)
    expect(amount('bell')).toBe(300) // 2 peppers x 150 g
    expect(amount('rice')).toBeCloseTo(236.588 * 0.78, 1)
  })
  it('remembers the unit the recipe was written in, when it suits the ingredient', () => {
    const unit = (id: string) => d.rows.find((r) => r.ingredient.id === id)?.display_unit
    expect(unit('oil')).toBe('tbsp')
    expect(unit('bell')).toBe('each') // 2 bell peppers, not 300 g
    expect(unit('egg')).toBe('each')
    expect(unit('rice')).toBe('cup')
    expect(unit('chk')).toBe('lb')
    expect(unit('almond')).toBe('cup')
  })
  it('adds up the same ingredient listed twice', () => {
    expect(d.rows.filter((r) => r.ingredient.id === 'oil')).toHaveLength(1)
    expect(amount('oil')).toBeCloseTo(3 * 14.7868, 2)
  })
  it('reports what needs a human look', () => {
    expect(d.unmatched).toEqual(['dragon fruit'])
    expect(d.closeMatches).toEqual(['almond milk → Unsweetened almond milk'])
  })
  it('leaves the amount at 0 and says so when a unit cannot be converted', () => {
    const w = buildDraft(normalizeParsed({ name: 'x', ingredients: [{ name: 'chicken breast', amount: 1, unit: 'cup' }], steps: [] }), cat)
    expect(w.rows[0].amount).toBe(0)
    expect(w.needsAmount).toEqual(['Chicken breast'])
  })
})

describe('missing ingredients', () => {
  const parsed = normalizeParsed({
    name: 'Stew', steps: ['Cook.'],
    ingredients: [
      { name: 'cilantro', amount: 0.5, unit: 'cup' }, { name: 'turmeric', amount: 1, unit: 'tsp' },
      { name: 'water', amount: 2, unit: 'cup' }, { name: 'Cold Water', amount: 1, unit: 'cup' }, { name: 'bell pepper', amount: 1, unit: 'each' },
    ],
  })
  const d = buildDraft(parsed, cat)
  it('keeps the amounts of ingredients that need adding', () => {
    expect(d.unmatched).toEqual(['cilantro', 'turmeric'])
    expect(d.unmatchedItems).toEqual([{ name: 'cilantro', amount: 0.5, unit: 'cup' }, { name: 'turmeric', amount: 1, unit: 'tsp' }])
  })
  it('never treats plain water as an ingredient', () => {
    expect(d.unmatched.join()).not.toMatch(/water/i)
    expect(d.rows).toHaveLength(1)
  })
  it('builds a recipe row for a newly added ingredient in the unit it was written in', () => {
    const turmeric = mk({ id: 'tur', name: 'Turmeric', density_g_per_ml: 0.6 })
    const { row, known } = rowFor({ name: 'turmeric', amount: 1, unit: 'tsp' }, turmeric)
    expect(known).toBe(true)
    expect(row.display_unit).toBe('tsp')
    expect(row.amount).toBeCloseTo(4.92892 * 0.6, 3)
    const noDensity = rowFor({ name: 'x', amount: 1, unit: 'cup' }, mk({ id: 'x', name: 'Mystery' }))
    expect(noDensity.known).toBe(false)
    expect(noDensity.row.amount).toBe(0)
  })
})

describe('cans in recipes', () => {
  const parsed = normalizeParsed({
    name: 'Chili', steps: ['Simmer.'],
    ingredients: [{ name: 'black beans', amount: 2, unit: 'can' }, { name: 'canned diced tomatoes', amount: 1, unit: 'each' }, { name: 'bell pepper', amount: 1, unit: 'each' }],
  })
  const d = buildDraft(parsed, cat)
  const row = (id: string) => d.rows.find((r) => r.ingredient.id === id)!
  it('reads "2 can" as two cans of drained beans', () => {
    expect(row('beans')).toMatchObject({ amount: 510, display_unit: 'can' })
  })
  it('treats "1 each" of a canned food as a can, but still counts bell peppers as pieces', () => {
    expect(row('tom')).toMatchObject({ amount: 411, display_unit: 'can' })
    expect(row('bell')).toMatchObject({ amount: 150, display_unit: 'each' })
    expect(d.needsAmount).toEqual([])
  })
  it('accepts can as a unit from the AI', () => {
    expect(parsed.ingredients[0].unit).toBe('can')
  })
})
