import { NUTRIENTS } from './types'
import type { Ingredient, Nutrient, Nutrition } from './types'

type Inputs = Record<Nutrient, string>
const PRIMARY = ['calories', 'protein', 'carbs', 'fat'] as const

/** Ingredients store nutrition per gram (or per ml, or per one for counted things); people read it per 100 g / 100 ml. */
export const perAmount = (base: Ingredient['base_unit']) => (base === 'each' ? 1 : 100)

const round = (v: number, places: number) => Math.round(v * 10 ** places) / 10 ** places

/** The numbers an ingredient shows in the edit form: per 100 g or 100 ml (per each for counted ones), as text. */
export function formValues(ing: Pick<Ingredient, 'base_unit'> & Nutrition): Inputs {
  const per = perAmount(ing.base_unit)
  return Object.fromEntries(NUTRIENTS.map((k) => [k, String(round(Number(ing[k]) * per, 4))])) as Inputs
}

/** What gets saved from the form's text: per gram (or per ml, or per each). Blank counts as 0. */
export function savedValues(inputs: Inputs, base: Ingredient['base_unit']): Nutrition {
  const per = perAmount(base)
  return Object.fromEntries(NUTRIENTS.map((k) => [k, round((parseFloat(inputs[k]) || 0) / per, 6)])) as unknown as Nutrition
}

/** True when calories, protein, carbs and fat are all zero (so the ingredient would add nothing to a recipe). */
export function isAllZero(n: Partial<Nutrition>): boolean {
  return PRIMARY.every((k) => !(Number(n[k]) > 0))
}

/** Same food, written per 100 g instead of per 100 ml (or the other way round) using grams per ml. */
export function rebase(per100: Nutrition, from: 'g' | 'ml', to: 'g' | 'ml', densityGPerMl: number): Nutrition {
  if (from === to) return per100
  const factor = from === 'ml' ? 1 / densityGPerMl : densityGPerMl // per 100 ml -> per 100 g divides by density
  return Object.fromEntries(Object.entries(per100).map(([k, v]) => [k, round(v * factor, 4)])) as unknown as Nutrition
}
