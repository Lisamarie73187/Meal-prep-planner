import type { Ingredient } from './types'

export const mk = (over: Partial<Ingredient> & { name: string }): Ingredient => ({
  id: over.name, owner_id: null, base_unit: 'g', store_section: 'other', density_g_per_ml: null,
  calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, ...over,
})

export const chicken = mk({ name: 'Chicken', store_section: 'meat', calories: 1.65, protein: 0.31, fat: 0.036 })
export const rice = mk({ name: 'Rice', density_g_per_ml: 0.78, calories: 3.7, protein: 0.079, carbs: 0.77, fat: 0.029, fiber: 0.035 })
export const oil = mk({ name: 'Oil', base_unit: 'ml', calories: 8.1, fat: 0.92 })
export const egg = mk({ name: 'Egg', base_unit: 'each', calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8 })
