import { describe, expect, it } from 'vitest'
import { parseFood } from './foodLookup'

const n = (nutrientNumber: string, value: number, unitName = 'G') => ({ nutrientNumber, value, unitName })

describe('parseFood', () => {
  it('reads a branded product, title-casing shouted names', () => {
    const hit = parseFood({
      fdcId: 1, description: '99% FAT FREE GROUND TURKEY BREAST', brandOwner: 'Cargill Incorporated/Honeysuckle White',
      foodNutrients: [n('208', 107, 'KCAL'), n('203', 25), n('205', 0), n('204', 0.89), n('291', 0), n('269', 0)],
    })
    expect(hit.name).toBe('99% Fat Free Ground Turkey Breast')
    expect(hit.brand).toBe('Cargill Incorporated/Honeysuckle White')
    expect(hit.per100g).toEqual({ calories: 107, protein: 25, carbs: 0, fat: 0.89, fiber: 0, sugar: 0 })
  })

  it('converts kJ energy to kcal', () => {
    const hit = parseFood({ fdcId: 2, description: 'Frankfurter, turkey', foodNutrients: [n('208', 933, 'kJ'), n('203', 12.2)] })
    expect(hit.per100g.calories).toBe(223)
  })

  it('falls back to the Atwater energy value when 208 is missing', () => {
    const hit = parseFood({ fdcId: 3, description: 'Chicken, raw', foodNutrients: [n('957', 120, 'KCAL')] })
    expect(hit.per100g.calories).toBe(120)
  })

  it('accepts sub-numbered nutrients (269.3 sugars) and treats missing ones as 0', () => {
    const hit = parseFood({ fdcId: 4, description: 'Apple', foodNutrients: [n('208', 52, 'KCAL'), n('269.3', 10.4)] })
    expect(hit.per100g.sugar).toBe(10.4)
    expect(hit.per100g.fiber).toBe(0)
    expect(hit.brand).toBeNull()
  })
})
