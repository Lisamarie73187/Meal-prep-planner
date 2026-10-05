import { fitRecipe } from './autofit'
import type { RecipeFit } from './autofit'
import { recipeFitsDiets } from './diet'
import { nameMatches, parseHave, recipeMatch } from './have'
import { perServingNutrition } from './nutrition'
import type { MealCategory, Nutrition, PlanItemRow, PlanPreferences, Recipe } from './types'

export const emptyPrefs = (): PlanPreferences => ({ have: '', dislikes: '', diets: [] })

/** Fills in defaults so older plans (no preferences stored) work. */
export const prefsOf = (plan: { preferences?: Partial<PlanPreferences> | null }): PlanPreferences => ({ ...emptyPrefs(), ...(plan.preferences ?? {}) })

/** Diet and dislikes are hard filters. */
export function passesPrefs(recipe: Recipe, prefs: PlanPreferences): boolean {
  if (!recipeFitsDiets(recipe, prefs.diets)) return false
  const dislikes = parseHave(prefs.dislikes)
  if (dislikes.length === 0) return true
  return recipeMatch(recipe, dislikes).count === 0 && !dislikes.some((t) => nameMatches(recipe.name, t))
}

export interface Suggestion {
  recipe: Recipe
  /** Per serving, as written. */
  nutrition: Nutrition
  /** Portions adjusted to the target, when fitting was asked for and it helps. */
  fitted: RecipeFit | null
  /** Mean relative miss over the macros that have a target (0 = exact), or null with no targets. Measured after fitting when fitted. */
  miss: number | null
  /** Which of the things you have this recipe uses. */
  uses: string[]
}

const MACROS = ['calories', 'protein', 'carbs', 'fat'] as const

function missOf(n: Nutrition, target: Partial<Nutrition>): number | null {
  const parts = MACROS.filter((k) => (target[k] ?? 0) > 0).map((k) => Math.abs(n[k] - target[k]!) / target[k]!)
  return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null
}

/**
 * Best candidates first. Diet and dislikes remove recipes; then recipes made for this meal come first,
 * and within that the best match for your macro target, nudged up for using what you have.
 * With `fit`, each recipe is ranked by how close its portions can be adjusted to the target.
 */
export function suggest(
  recipes: Recipe[], slot: MealCategory, target: Partial<Nutrition>, prefs: PlanPreferences, opts: { fit?: boolean } = {},
): Suggestion[] {
  const have = parseHave(prefs.have)
  return recipes
    .filter((r) => passesPrefs(r, prefs))
    .map((recipe) => {
      const nutrition = perServingNutrition(recipe)
      const fit = opts.fit ? fitRecipe(recipe, target) : null
      const fitted = fit?.changed ? fit : null
      const miss = missOf(fitted ? fitted.nutrition : nutrition, target)
      const uses = recipeMatch(recipe, have).terms
      const score = (miss ?? 0) - 0.25 * Math.min(uses.length, 3) + (recipe.category === slot ? 0 : 1)
      return { s: { recipe, nutrition, fitted, miss, uses }, score }
    })
    .sort((a, b) => a.score - b.score || a.s.recipe.name.localeCompare(b.s.recipe.name))
    .map((x) => x.s)
}

/**
 * Keeps saved picks in step with an edited setup: drops meal types you no longer want and keeps at most the number
 * of recipes you asked for in each. Portions belong to each recipe, so they are left alone.
 */
export function reconcileItems(items: PlanItemRow[], counts: Record<MealCategory, number>): PlanItemRow[] {
  const out: PlanItemRow[] = []
  for (const slot of ['breakfast', 'lunch', 'dinner', 'snack'] as MealCategory[]) {
    if (counts[slot] <= 0) continue
    out.push(...items.filter((i) => i.category === slot).slice(0, counts[slot]))
  }
  return out
}
