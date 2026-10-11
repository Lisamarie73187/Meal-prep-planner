import { supabase } from './supabase'
import { CATEGORIES } from './types'
import type { Ingredient, MealCategory } from './types'
import { canSizeOf, itemToBase, toBase, UNITS, unitsFor } from './units'

export interface ParsedRecipe {
  name: string
  category: MealCategory
  servings: number
  prep_minutes: number
  ingredients: { name: string; amount: number; unit: string }[]
  steps: string[]
}

export interface DraftRow {
  ingredient: Ingredient
  /** Whole-recipe amount in the ingredient's base unit; 0 when it couldn't be worked out. */
  amount: number
  display_unit: string | null
}

/** A parsed recipe turned into what the recipe form needs, plus what the person should double-check. */
export interface RecipeDraft {
  name: string
  category: MealCategory
  servings: number
  prep_minutes: number
  steps: string[]
  rows: DraftRow[]
  /** Ingredients with no match in the catalogue: add them with the ingredient search. */
  unmatched: string[]
  /** The same ingredients with their amounts, so they can be added to the recipe once they exist. */
  unmatchedItems: ParsedRecipe['ingredients']
  /** "<parsed> → <catalogue name>" for matches that were only close, and names whose amount needs filling in. */
  closeMatches: string[]
  needsAmount: string[]
  /** A picture chosen alongside the text, already shrunk. Carried to the form in memory only. */
  photo?: File
}

const clamp = (n: unknown, min: number, max: number, fallback: number) => {
  const v = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback
}

/** The model's answer is checked like any outside input: wrong types are dropped, numbers clamped, units limited. */
export function normalizeParsed(raw: unknown): ParsedRecipe {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const ingredients = (Array.isArray(r.ingredients) ? r.ingredients : []).slice(0, 60).flatMap((i) => {
    const o = (i && typeof i === 'object' ? i : {}) as Record<string, unknown>
    const name = text(o.name, 120)
    const amount = typeof o.amount === 'number' ? o.amount : Number(o.amount)
    const unit = typeof o.unit === 'string' ? o.unit.trim().toLowerCase() : ''
    return name && Number.isFinite(amount) && amount > 0 && unit in UNITS ? [{ name, amount, unit }] : []
  })
  return {
    name: text(r.name, 120),
    category: CATEGORIES.includes(r.category as MealCategory) ? (r.category as MealCategory) : 'dinner',
    servings: clamp(r.servings, 1, 50, 4),
    prep_minutes: clamp(r.prep_minutes, 0, 600, 20),
    ingredients,
    steps: (Array.isArray(r.steps) ? r.steps : []).slice(0, 60).map((s) => text(s, 500)).filter(Boolean),
  }
}

/** Lower-case, drop "(93% lean)"-style notes and a plural "s", so "Chicken breasts" meets "Chicken breast". */
const norm = (s: string) =>
  s.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)).join(' ')

const hasPhrase = (haystack: string, phrase: string) => ` ${haystack} `.includes(` ${phrase} `)

/** Best catalogue match for a parsed name: 'exact' when the names agree, 'close' when one contains the other. */
export function matchIngredient(name: string, catalogue: Ingredient[]): { ingredient: Ingredient; kind: 'exact' | 'close' } | null {
  const want = norm(name)
  if (!want) return null
  let best: { ingredient: Ingredient; kind: 'exact' | 'close'; score: number } | null = null
  for (const ing of catalogue) {
    const have = norm(ing.name)
    let kind: 'exact' | 'close' | null = null
    let looser = false // the catalogue name is only part of what was asked for ("milk" for "almond milk")
    if (have === want) kind = 'exact'
    else if (hasPhrase(have, want)) kind = 'close'
    else if (hasPhrase(want, have)) { kind = 'close'; looser = true }
    if (!kind) continue
    // Prefer exact, then a more specific catalogue entry over a vaguer one (it may be a different food, e.g. dairy
    // milk for almond milk), then the closest in length, then the user's own over a shared one.
    const score = (kind === 'exact' ? 1000 : 0) - (looser ? 100 : 0) - Math.abs(have.length - want.length) + (ing.owner_id ? 0.5 : 0)
    if (!best || score > best.score) best = { ingredient: ing, kind, score }
  }
  return best && { ingredient: best.ingredient, kind: best.kind }
}

/** Whole-recipe amount in the ingredient's base unit, or null when the unit can't be converted (e.g. cups of a solid). */
function toBaseAmount(amount: number, unit: string, ing: Ingredient): number | null {
  if (unit === 'each') return ing.base_unit === 'each' ? amount : itemToBase(ing.name, amount, ing.base_unit)
  try { return toBase(amount, unit, ing) } catch { return null }
}

/** Plain water has no nutrition, so it never needs to be an ingredient. */
const isWater = (name: string) => /^(ice |cold |hot |warm |boiling |lukewarm )?water$/.test(name.trim().toLowerCase())

/** One recipe row for a parsed ingredient and the ingredient it is, with the amount converted. `known` is false when it couldn't be. */
export function rowFor(p: ParsedRecipe['ingredients'][number], ingredient: Ingredient): { row: DraftRow; known: boolean } {
  // "1 each" of a canned food can only mean a can
  const unit = p.unit === 'each' && ingredient.base_unit !== 'each' && !itemToBase(ingredient.name, 1, ingredient.base_unit) && canSizeOf(ingredient) ? 'can' : p.unit
  const base = toBaseAmount(p.amount, unit, ingredient)
  return { row: { ingredient, amount: base ?? 0, display_unit: unitsFor(ingredient).includes(unit) ? unit : null }, known: base !== null }
}

export function buildDraft(parsed: ParsedRecipe, catalogue: Ingredient[]): RecipeDraft {
  const rows: DraftRow[] = []
  const unmatched: string[] = []
  const unmatchedItems: ParsedRecipe['ingredients'] = []
  const closeMatches: string[] = []
  const needsAmount: string[] = []
  for (const p of parsed.ingredients) {
    if (isWater(p.name)) continue
    const m = matchIngredient(p.name, catalogue)
    if (!m) { unmatched.push(p.name); unmatchedItems.push(p); continue }
    const { row: made, known } = rowFor(p, m.ingredient)
    const base = known ? made.amount : null
    const existing = rows.find((r) => r.ingredient.id === m.ingredient.id)
    if (m.kind === 'close' && !existing) closeMatches.push(`${p.name} → ${m.ingredient.name}`)
    if (existing) { existing.amount += base ?? 0 } else rows.push(made)
    if (base === null) needsAmount.push(m.ingredient.name)
  }
  return {
    name: parsed.name, category: parsed.category, servings: parsed.servings, prep_minutes: parsed.prep_minutes,
    steps: parsed.steps, rows, unmatched, unmatchedItems, closeMatches, needsAmount,
  }
}

/** Sends the pasted text to the parse-recipe function and returns the checked result. */
export async function parseRecipeText(text: string): Promise<ParsedRecipe> {
  const { data, error } = await supabase.functions.invoke('parse-recipe', { body: { text } })
  if (error) {
    // A non-2xx reply carries our own message in its body.
    const ctx = (error as { context?: Response }).context
    const msg = ctx ? await ctx.json().then((b: { error?: string }) => b.error).catch(() => null) : null
    throw new Error(msg ?? "The recipe reader isn't available right now. Try again later.")
  }
  const parsed = normalizeParsed((data as { recipe?: unknown } | null)?.recipe)
  if (parsed.ingredients.length === 0 && parsed.steps.length === 0) throw new Error("That doesn't look like a recipe. Include the ingredients and steps.")
  return parsed
}
