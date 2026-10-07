import { DIETS } from './diet'
import type { DietKey, MealCategory, PlanPreferences } from './types'

/** Everything the four setup screens collect. Kept as lists here; saved on the plan as the same comma-separated text as before. */
export interface SetupDraft {
  counts: Record<MealCategory, number>
  have: string[]
  dislikes: string[]
  diets: DietKey[]
}

export const emptyCounts = (): Record<MealCategory, number> => ({ breakfast: 0, lunch: 0, dinner: 0, snack: 0 })
export const emptyDraft = (): SetupDraft => ({ counts: emptyCounts(), have: [], dislikes: [], diets: [] })

export const SETUP_STEPS = [
  { key: 'meals', label: 'Meals' },
  { key: 'ingredients', label: 'Ingredients' },
  { key: 'avoid', label: 'Avoid' },
  { key: 'diet', label: 'Diet' },
] as const
export type SetupStep = (typeof SETUP_STEPS)[number]['key']

/** Where a setup screen lives. `?plan=` keeps editing an existing plan across all four screens. */
export const setupPath = (step: SetupStep, planId?: string | null) => `/plan/setup/${step}${planId ? `?plan=${encodeURIComponent(planId)}` : ''}`

/** Single-letter entries are ignored: ingredient matching works on words of 2+ letters. */
const MIN_LEN = 2

function dedupe(list: string[]): string[] {
  const seen = new Set<string>()
  return list.filter((t) => {
    const k = t.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** "turkey, Chicken ; spinach" -> ["turkey", "Chicken", "spinach"]. Keeps the typed case, drops blanks and repeats. */
export function splitList(text: string): string[] {
  return dedupe(text.split(/[,;\n]/).map((t) => t.trim().replace(/\s+/g, ' ')).filter((t) => t.length >= MIN_LEN))
}

/** Adds whatever was typed or pasted (one item, or several separated by commas) to a list. */
export const addTerms = (list: string[], text: string): string[] => dedupe([...list, ...splitList(text)])

export const draftToPrefs = (d: SetupDraft): PlanPreferences => ({ have: d.have.join(', '), dislikes: d.dislikes.join(', '), diets: d.diets })

const KNOWN_DIETS = new Set<string>(DIETS.map((x) => x.key))
export const prefsToDraft = (counts: Record<MealCategory, number>, prefs: PlanPreferences): SetupDraft => ({
  counts: { ...emptyCounts(), ...counts },
  have: splitList(prefs.have),
  dislikes: splitList(prefs.dislikes),
  // Plans saved with a diet that no longer exists simply lose it.
  diets: prefs.diets.filter((d) => KNOWN_DIETS.has(d)),
})

export const totalRecipes = (d: SetupDraft) => Object.values(d.counts).reduce((a, b) => a + b, 0)

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** First few names, then "+N more": ["turkey", "spinach", "rice", "beans"] -> "turkey, spinach +2 more". */
export function previewNames(names: string[], max = 2): string {
  return names.length <= max ? names.join(', ') : `${names.slice(0, max).join(', ')} +${names.length - max} more`
}

const MEAL_NOUN: Record<MealCategory, [string, string]> = {
  breakfast: ['breakfast', 'breakfasts'], lunch: ['lunch', 'lunches'], dinner: ['dinner', 'dinners'], snack: ['snack', 'snacks'],
}
/** "1 lunch · 1 dinner": every meal type that has recipes, in the order of the day. */
export function mealBreakdown(counts: Record<MealCategory, number>): string | null {
  const parts = (['breakfast', 'lunch', 'dinner', 'snack'] as MealCategory[]).filter((c) => counts[c] > 0).map((c) => `${counts[c]} ${MEAL_NOUN[c][counts[c] === 1 ? 0 : 1]}`)
  return parts.length ? parts.join(' · ') : null
}

export interface SummaryCard {
  primary: string
  /** A smaller second line, or null when there is nothing worth adding. */
  secondary: string | null
}

/** The text for the four "Your setup" cards at the end of setup. Everything comes from the current draft. */
export function summaryCards(d: SetupDraft): { recipes: SummaryCard; pantry: SummaryCard; excluded: SummaryCard; diets: SummaryCard } {
  const n = totalRecipes(d)
  const dietLabels = DIETS.filter((x) => d.diets.includes(x.key)).map((x) => x.label)
  return {
    recipes: { primary: plural(n, 'recipe', 'recipes'), secondary: mealBreakdown(d.counts) },
    pantry: d.have.length
      ? { primary: plural(d.have.length, 'pantry ingredient', 'pantry ingredients'), secondary: previewNames(d.have) }
      : { primary: 'No pantry ingredients', secondary: null },
    excluded: d.dislikes.length
      ? { primary: plural(d.dislikes.length, 'food excluded', 'foods excluded'), secondary: previewNames(d.dislikes) }
      : { primary: 'No foods excluded', secondary: null },
    // One or two diets read as "Pescatarian · Dairy-free". Three would not fit on one line, so they become a count plus names.
    diets: dietLabels.length === 0
      ? { primary: 'No dietary preferences', secondary: null }
      : dietLabels.length <= 2
        ? { primary: dietLabels.join(' · '), secondary: null }
        : { primary: `${dietLabels.length} dietary preferences`, secondary: previewNames(dietLabels) },
  }
}

// ---- keep the draft across reloads (this tab only)
const draftKey = (planKey: string) => `meal-prep:setup-draft:${planKey}`

export function loadDraft(planKey: string): SetupDraft | null {
  try {
    const raw = sessionStorage.getItem(draftKey(planKey))
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<SetupDraft>
    if (!v || typeof v !== 'object' || !v.counts) return null
    const strings = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is string => typeof i === 'string') : [])
    return {
      counts: { ...emptyCounts(), ...v.counts },
      have: strings(v.have),
      dislikes: strings(v.dislikes),
      diets: strings(v.diets).filter((d): d is DietKey => KNOWN_DIETS.has(d)),
    }
  } catch {
    return null
  }
}
export function saveDraft(planKey: string, d: SetupDraft) {
  try { sessionStorage.setItem(draftKey(planKey), JSON.stringify(d)) } catch { /* the draft just won't survive a reload */ }
}
export function clearDraft(planKey: string) {
  try { sessionStorage.removeItem(draftKey(planKey)) } catch { /* nothing to clear */ }
}

// ---- diets and dislikes rarely change between plans, so they pre-fill the next one (what you have does not)
const REMEMBER_KEY = 'meal-prep:setup'
export function rememberedPrefs(): Pick<SetupDraft, 'dislikes' | 'diets'> {
  try {
    const raw = JSON.parse(localStorage.getItem(REMEMBER_KEY) ?? 'null') as { dislikes?: string; diets?: string[] } | null
    return { dislikes: splitList(raw?.dislikes ?? ''), diets: (raw?.diets ?? []).filter((d): d is DietKey => KNOWN_DIETS.has(d)) }
  } catch {
    return { dislikes: [], diets: [] }
  }
}
export function rememberPrefs(p: PlanPreferences) {
  try { localStorage.setItem(REMEMBER_KEY, JSON.stringify({ dislikes: p.dislikes, diets: p.diets })) } catch { /* not remembered */ }
}
