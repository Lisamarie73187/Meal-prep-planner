import type { Recipe } from './types'

/** "turkey, Chicken ; spinach" -> ["turkey", "chicken", "spinach"] */
export function parseHave(text: string): string[] {
  return [...new Set(text.split(/[,;\n]/).map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 2))]
}

/** eggs -> egg, tomatoes -> tomato, berries -> berry. Matching also allows a plural on the ingredient side. */
function singular(term: string): string {
  if (term.endsWith('ies') && term.length > 4) return `${term.slice(0, -3)}y`
  if (/(o|ch|sh|x|z|ss)es$/.test(term)) return term.slice(0, -2)
  if (term.endsWith('s') && !term.endsWith('ss') && term.length > 3) return term.slice(0, -1)
  return term
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Whole-word match so "pea" finds peas but not pear; the term may be plural or singular. */
export function nameMatches(ingredientName: string, term: string): boolean {
  const base = singular(term)
  const stem = base.endsWith('y') ? `(?:${escape(base)}|${escape(base.slice(0, -1))}ies)` : `${escape(base)}(?:s|es)?`
  return new RegExp(`\\b${stem}\\b`, 'i').test(ingredientName)
}

export interface RecipeMatch {
  /** Ingredients in the recipe that match something you listed. */
  count: number
  /** Which of your terms the recipe uses. */
  terms: string[]
}

export function recipeMatch(recipe: Recipe, terms: string[]): RecipeMatch {
  const used = new Set<string>()
  let count = 0
  for (const ri of recipe.recipe_ingredients) {
    const hit = terms.filter((t) => nameMatches(ri.ingredient.name, t))
    if (hit.length) count++
    hit.forEach((t) => used.add(t))
  }
  return { count, terms: terms.filter((t) => used.has(t)) }
}
