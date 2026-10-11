import { describe, expect, it } from 'vitest'
import { normalizeEstimates, perUnit } from './ingredientEstimate'

const good = (name: string, over: Record<string, unknown> = {}) => ({
  name, base_unit: 'g', store_section: 'pantry', calories: 247, protein: 4, carbs: 80.6, fat: 1.2, fiber: 53, sugar: 2.2, density_g_per_ml: 0.5, ...over,
})

describe('normalizeEstimates', () => {
  it('keeps good answers, matched by name regardless of case or order', () => {
    const r = normalizeEstimates([good('Turmeric', { calories: 312, protein: 9.7, carbs: 67, fat: 3.3 }), good('cinnamon')], ['cinnamon', 'turmeric'])
    expect(r.failed).toEqual([])
    expect(r.items.map((i) => i.name)).toEqual(['cinnamon', 'turmeric'])
    expect(r.items[0]).toMatchObject({ base_unit: 'g', store_section: 'pantry', density_g_per_ml: 0.5 })
  })
  it('drops impossible numbers instead of saving them', () => {
    const r = normalizeEstimates(
      [good('a', { calories: 5000 }), good('b', { protein: 60, carbs: 60 }), good('c', { fat: -3 }), good('d', { calories: 30 }), good('e', { protein: 'lots' }), good('ok')],
      ['a', 'b', 'c', 'd', 'e', 'ok', 'missing'],
    )
    expect(r.items.map((i) => i.name)).toEqual(['ok'])
    expect(r.failed).toEqual(['a', 'b', 'c', 'd', 'e', 'missing']) // d: 30 kcal can't be 80 g of carbs
  })
  it('lets near-zero foods through the calorie check', () => {
    const r = normalizeEstimates([good('salt', { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 })], ['salt'])
    expect(r.items).toHaveLength(1)
  })
  it('fills in a sensible density and section when the AI leaves them out or gets them wrong', () => {
    const r = normalizeEstimates([good('raisin', { density_g_per_ml: undefined, store_section: 'snacks' }), good('vinegar', { base_unit: 'ml', density_g_per_ml: 99, calories: 21, protein: 0, carbs: 0.9, fat: 0, fiber: 0, sugar: 0.4 })], ['raisin', 'vinegar'])
    expect(r.items[0]).toMatchObject({ density_g_per_ml: 0.5, store_section: 'pantry' })
    expect(r.items[1]).toMatchObject({ base_unit: 'ml', density_g_per_ml: 1 })
  })
  it('survives nonsense', () => {
    expect(normalizeEstimates(null, ['x'])).toEqual({ items: [], failed: ['x'] })
    expect(normalizeEstimates([null, 'x', 4], ['x'])).toEqual({ items: [], failed: ['x'] })
  })
})

describe('perUnit', () => {
  it('turns per-100 values into per-gram values', () => {
    expect(perUnit({ calories: 247, protein: 4, carbs: 80.6, fat: 1.2, fiber: 53.1, sugar: 2.2 })).toEqual({ calories: 2.47, protein: 0.04, carbs: 0.806, fat: 0.012, fiber: 0.531, sugar: 0.022 })
  })
})
