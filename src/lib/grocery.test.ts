import { describe, expect, it } from 'vitest'
import { applyInventory, deductInventory, groceryText, groupBySection, planNeeds, planTotals } from './grocery'
import type { PlanLine } from './types'
import { chicken, mk, rice } from './testData'

const line = (name: string, meals: number, ings: PlanLine['ingredients']): PlanLine => ({
  recipeId: name, name, category: 'lunch', servings: 4, meals, instructions: [], ingredients: ings,
})

describe('grocery', () => {
  const lines = [
    line('A', 5, [{ ingredient: chicken, perServing: 100 }, { ingredient: rice, perServing: 50 }]),
    line('B', 4, [{ ingredient: { ...chicken, id: 'other-id' }, perServing: 100 }]),
  ]
  it('combines duplicates and scales to meals', () => {
    const needs = planNeeds(lines)
    expect(needs).toHaveLength(2)
    expect(needs.find((n) => n.ingredient.name === 'Chicken')!.needed).toBe(900)
    expect(needs.find((n) => n.ingredient.name === 'Rice')!.needed).toBe(250)
  })
  it('subtracts inventory and separates covered items', () => {
    const r = applyInventory(planNeeds(lines), [
      { ingredient: chicken, amount: 500 },
      { ingredient: rice, amount: 1000 },
    ])
    expect(r.toBuy.map((l) => [l.ingredient.name, l.buy])).toEqual([['Chicken', 400]])
    expect(r.covered.map((l) => l.ingredient.name)).toEqual(['Rice'])
  })
  it('groups by store section', () => {
    const g = groupBySection(planNeeds(lines))
    expect(g.map((x) => x.section)).toEqual(['meat', 'other'])
  })
  it('deducts used amounts and removes empties', () => {
    const u = deductInventory(planNeeds(lines), [
      { id: 'i1', ingredient: chicken, amount: 500 },
      { id: 'i2', ingredient: rice, amount: 1000 },
      { id: 'i3', ingredient: mk({ name: 'Salt' }), amount: 10 },
    ])
    expect(u).toEqual([{ id: 'i1', amount: null }, { id: 'i2', amount: 750 }])
  })
  it('computes totals and per-meal averages', () => {
    const t = planTotals([line('A', 2, [{ ingredient: chicken, perServing: 100 }])])
    expect(t.total.calories).toBeCloseTo(330)
    expect(t.perMeal.calories).toBeCloseTo(165)
    expect(t.meals).toBe(2)
  })
  it('writes the buy list as plain text, by store section, leaving out what you already have', () => {
    const r = applyInventory(planNeeds(lines), [{ ingredient: rice, amount: 1000 }])
    const text = groceryText(r, 'My plan')
    const sections = groupBySection(r.toBuy)
    expect(text.split('\n')[0]).toBe('My plan')
    expect(text).toContain(`${sections[0].section[0].toUpperCase()}${sections[0].section.slice(1)}\n• Chicken — `)
    expect(text).not.toContain('Rice')
    expect(groceryText(applyInventory([], []), 'Empty')).toBe('Empty')
  })
})
