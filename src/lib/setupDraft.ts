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

/** The "Your setup" lines at the end of setup. */
export function setupSummary(d: SetupDraft): string[] {
  const lines = [plural(totalRecipes(d), 'recipe', 'recipes')]
  lines.push(d.have.length ? plural(d.have.length, 'pantry ingredient', 'pantry ingredients') : 'No pantry ingredients')
  lines.push(d.dislikes.length ? plural(d.dislikes.length, 'food excluded', 'foods excluded') : 'No foods excluded')
  const diets = DIETS.filter((x) => d.diets.includes(x.key)).map((x) => x.label)
  if (diets.length) lines.push(diets.join(', '))
  return lines
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
