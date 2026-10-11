import { supabase } from './supabase'
import { SECTIONS } from './types'
import type { Nutrition, StoreSection } from './types'

/** Nutrition the AI estimated for an ingredient that isn't in the ingredient list yet. */
export interface EstimatedIngredient {
  /** The name as it appeared in the recipe text. */
  name: string
  base_unit: 'g' | 'ml'
  store_section: StoreSection
  /** Grams per millilitre, so spoons and cups work. Always set (a generic value when the AI had none). */
  density_g_per_ml: number
  /** Per 100 g (or per 100 ml for liquids), the way labels show it. */
  per100: Nutrition
}

const GENERIC_DENSITY = { g: 0.5, ml: 1 }
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v))

/**
 * Checks the AI's answer like any outside data. An entry is dropped (and reported in `failed`) if a number is missing,
 * impossible (over 900 kcal or 100 g per 100 g) or doesn't roughly fit its own macros, so a bad guess never
 * becomes a saved ingredient.
 */
export function normalizeEstimates(raw: unknown, asked: string[]): { items: EstimatedIngredient[]; failed: string[] } {
  const list = Array.isArray(raw) ? raw : []
  const items: EstimatedIngredient[] = []
  const failed: string[] = []
  for (const name of asked) {
    const o = list.find((x) => x && typeof x === 'object' && String((x as { name?: unknown }).name ?? '').trim().toLowerCase() === name.trim().toLowerCase()) as Record<string, unknown> | undefined
    const n = o && { calories: num(o.calories), protein: num(o.protein), carbs: num(o.carbs), fat: num(o.fat), fiber: num(o.fiber), sugar: num(o.sugar) }
    const ok =
      n &&
      Object.values(n).every((v) => Number.isFinite(v) && v >= 0 && v <= 900) &&
      n.protein + n.carbs + n.fat <= 105 && n.fiber <= 100 && n.sugar <= 100 &&
      (() => { const est = 4 * n.protein + 4 * n.carbs + 9 * n.fat; return est < 20 || (n.calories >= est * 0.5 && n.calories <= est * 1.5) })()
    if (!o || !n || !ok) { failed.push(name); continue }
    const base_unit = o.base_unit === 'ml' ? 'ml' : 'g'
    const d = num(o.density_g_per_ml)
    items.push({
      name,
      base_unit,
      store_section: SECTIONS.includes(o.store_section as StoreSection) ? (o.store_section as StoreSection) : 'pantry',
      density_g_per_ml: Number.isFinite(d) && d >= 0.05 && d <= 2 ? d : GENERIC_DENSITY[base_unit],
      per100: n,
    })
  }
  return { items, failed }
}

/** What gets saved: nutrition per single gram (or ml), which is how every ingredient stores it. */
export function perUnit(per100: Nutrition): Nutrition {
  return Object.fromEntries(Object.entries(per100).map(([k, v]) => [k, Math.round(v * 100) / 10000])) as unknown as Nutrition
}

/** Asks the parse-recipe function for nutrition estimates for these ingredient names. */
export async function estimateIngredients(names: string[]): Promise<{ items: EstimatedIngredient[]; failed: string[] }> {
  const { data, error } = await supabase.functions.invoke('parse-recipe', { body: { ingredients: names } })
  if (error) {
    const ctx = (error as { context?: Response }).context
    const msg = ctx ? await ctx.json().then((b: { error?: string }) => b.error).catch(() => null) : null
    throw new Error(msg ?? "The nutrition lookup isn't available right now. Try again later.")
  }
  return normalizeEstimates((data as { ingredients?: unknown } | null)?.ingredients, names)
}
