import { SECTIONS } from './types'
import type { Ingredient, InventoryItem, MealCategory, Nutrition, PlanLine, StoreSection } from './types'
import { addNutrition, ingredientNutrition, scaleNutrition, zero } from './nutrition'

/** Same-named ingredients (e.g. recommended and a user's own copy) combine on one line. */
export const ingredientKey = (ing: Pick<Ingredient, 'name' | 'base_unit'>) =>
  `${ing.name.trim().toLowerCase()}|${ing.base_unit}`

export interface Need {
  key: string
  ingredient: Ingredient
  needed: number
}

export interface BuyLine extends Need {
  have: number
  buy: number
}

export interface GroceryResult {
  toBuy: BuyLine[]
  covered: BuyLine[]
}

const EPS = 1e-6

/** Combined ingredient totals for every line, scaled from servings to the number of meals. */
export function planNeeds(lines: PlanLine[]): Need[] {
  const map = new Map<string, Need>()
  for (const line of lines) {
    for (const { ingredient, perServing } of line.ingredients) {
      const key = ingredientKey(ingredient)
      const cur = map.get(key)
      const amount = perServing * line.meals
      if (cur) cur.needed += amount
      else map.set(key, { key, ingredient, needed: amount })
    }
  }
  return [...map.values()]
}

/** Subtract what the user already has; fully covered items go in `covered`. */
export function applyInventory(needs: Need[], inventory: Pick<InventoryItem, 'ingredient' | 'amount'>[]): GroceryResult {
  const have = new Map<string, number>()
  for (const it of inventory) {
    const k = ingredientKey(it.ingredient)
    have.set(k, (have.get(k) ?? 0) + it.amount)
  }
  const toBuy: BuyLine[] = []
  const covered: BuyLine[] = []
  for (const n of needs) {
    const h = have.get(n.key) ?? 0
    const buy = Math.max(0, n.needed - h)
    if (buy <= EPS) covered.push({ ...n, have: h, buy: 0 })
    else toBuy.push({ ...n, have: h, buy })
  }
  return { toBuy, covered }
}

export function groupBySection<T extends { ingredient: Ingredient }>(lines: T[]): { section: StoreSection; lines: T[] }[] {
  return SECTIONS.map((section) => ({
    section,
    lines: lines
      .filter((l) => l.ingredient.store_section === section)
      .sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name)),
  })).filter((g) => g.lines.length > 0)
}

/** New inventory amounts after cooking the plan. Amounts that reach zero are removed (null). */
export function deductInventory(
  needs: Need[],
  inventory: Pick<InventoryItem, 'id' | 'ingredient' | 'amount'>[],
): { id: string; amount: number | null }[] {
  const remaining = new Map(needs.map((n) => [n.key, n.needed]))
  const updates: { id: string; amount: number | null }[] = []
  for (const item of inventory) {
    const k = ingredientKey(item.ingredient)
    const owed = remaining.get(k) ?? 0
    if (owed <= EPS) continue
    const used = Math.min(item.amount, owed)
    remaining.set(k, owed - used)
    const left = item.amount - used
    updates.push({ id: item.id, amount: left <= EPS ? null : left })
  }
  return updates
}

export interface PlanTotals {
  total: Nutrition
  perMeal: Nutrition
  meals: number
}

/** Total and average-per-meal nutrition across all selected meals. */
export function planTotals(lines: PlanLine[]): PlanTotals {
  let total = zero()
  let meals = 0
  for (const line of lines) {
    const per = line.ingredients.reduce(
      (acc, { ingredient, perServing }) => addNutrition(acc, ingredientNutrition(ingredient, perServing)),
      zero(),
    )
    total = addNutrition(total, scaleNutrition(per, line.meals))
    meals += line.meals
  }
  return { total, perMeal: meals ? scaleNutrition(total, 1 / meals) : zero(), meals }
}

/**
 * One day of eating from this plan: one portion of each meal type in it. A type with several
 * recipes counts as their average, weighted by how many portions of each you're making.
 */
export function dayTotals(lines: PlanLine[]): { day: Nutrition; slots: MealCategory[] } {
  const bySlot = new Map<MealCategory, { sum: Nutrition; portions: number }>()
  for (const line of lines) {
    const cur = bySlot.get(line.category) ?? { sum: zero(), portions: 0 }
    bySlot.set(line.category, { sum: addNutrition(cur.sum, scaleNutrition(lineNutrition(line), line.meals)), portions: cur.portions + line.meals })
  }
  let day = zero()
  for (const { sum, portions } of bySlot.values()) if (portions > 0) day = addNutrition(day, scaleNutrition(sum, 1 / portions))
  const order: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack']
  return { day, slots: order.filter((c) => (bySlot.get(c)?.portions ?? 0) > 0) }
}

export function lineNutrition(line: PlanLine): Nutrition {
  return line.ingredients.reduce(
    (acc, { ingredient, perServing }) => addNutrition(acc, ingredientNutrition(ingredient, perServing)),
    zero(),
  )
}

export function mealsByCategory(lines: PlanLine[]): Record<MealCategory, number> {
  const out: Record<MealCategory, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }
  for (const l of lines) out[l.category] += l.meals
  return out
}
