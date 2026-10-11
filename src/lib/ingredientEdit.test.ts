import { describe, expect, it } from 'vitest'
import { formValues, isAllZero, rebase, savedValues } from './ingredientEdit'
import type { Ingredient } from './types'

const n = (o: Partial<Record<'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar', number>>) => ({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, ...o })

describe('ingredient edit helpers', () => {
  it('shows per-gram numbers per 100 g', () => {
    const f = formValues({ base_unit: 'g', ...n({ calories: 6.8, protein: 0.01, fat: 0.75 }) } as Ingredient)
    expect(f).toMatchObject({ calories: '680', protein: '1', fat: '75', carbs: '0' })
  })
  it('counted ingredients show per each', () => {
    expect(formValues({ base_unit: 'each', ...n({ calories: 72 }) } as Ingredient).calories).toBe('72')
  })
  it('saving turns the text back into per-gram, and blank into zero', () => {
    const inputs = { calories: '680', protein: '1', carbs: '', fat: '75', fiber: '0', sugar: 'abc' }
    expect(savedValues(inputs, 'g')).toEqual({ calories: 6.8, protein: 0.01, carbs: 0, fat: 0.75, fiber: 0, sugar: 0 })
    expect(savedValues(inputs, 'each').calories).toBe(680)
  })
  it('edit then save is lossless', () => {
    const ing = { base_unit: 'ml', ...n({ calories: 6.8, protein: 0.002, carbs: 0.006, fat: 0.75, fiber: 0, sugar: 0.002 }) } as Ingredient
    expect(savedValues(formValues(ing), 'ml')).toEqual({ calories: 6.8, protein: 0.002, carbs: 0.006, fat: 0.75, fiber: 0, sugar: 0.002 })
  })
  it('spots an ingredient with nothing in it', () => {
    expect(isAllZero(n({}))).toBe(true)
    expect(isAllZero(n({ fiber: 3 }))).toBe(true) // fiber alone does not count
    expect(isAllZero(n({ fat: 0.1 }))).toBe(false)
    expect(isAllZero({})).toBe(true)
  })
  it('moves a per-100-ml estimate onto a per-100-g ingredient with the density', () => {
    const per100ml = n({ calories: 680, fat: 75 })
    const g = rebase(per100ml, 'ml', 'g', 0.91)
    expect(g.calories).toBeCloseTo(747.2527, 3) // 680 kcal in 100 ml, and 100 ml weighs 91 g
    expect(rebase(g, 'g', 'ml', 0.91).calories).toBeCloseTo(680, 2)
    expect(rebase(per100ml, 'g', 'g', 1)).toBe(per100ml)
  })
})
