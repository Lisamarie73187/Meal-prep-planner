import type { Nutrition } from './types'

/** USDA FoodData Central. DEMO_KEY is heavily rate-limited; set VITE_USDA_API_KEY (free) for real use. */
const API_KEY = (import.meta.env.VITE_USDA_API_KEY as string | undefined) || 'DEMO_KEY'
const SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search'

export interface FoodHit {
  id: number
  name: string
  /** Brand owner for packaged products, null for generic foods. */
  brand: string | null
  /** Per 100 g. */
  per100g: Nutrition
}

interface RawNutrient { nutrientNumber?: string; unitName?: string; value?: number }
interface RawFood { fdcId: number; description: string; brandOwner?: string; brandName?: string; foodNutrients?: RawNutrient[] }

const KJ_PER_KCAL = 4.184

function pick(ns: RawNutrient[], ...numbers: string[]): RawNutrient | undefined {
  for (const num of numbers) {
    const hit = ns.find((n) => n.nutrientNumber === num || n.nutrientNumber?.startsWith(`${num}.`))
    if (hit && typeof hit.value === 'number') return hit
  }
}
const grams = (ns: RawNutrient[], ...numbers: string[]) => pick(ns, ...numbers)?.value ?? 0

/** Energy may be reported in kJ, or only as an Atwater estimate (957/958). */
function kcal(ns: RawNutrient[]): number {
  const e = pick(ns, '208', '957', '958')
  if (!e) return 0
  return e.unitName?.toUpperCase() === 'KJ' ? e.value! / KJ_PER_KCAL : e.value!
}

const titleCase = (s: string) =>
  s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s,(/-])([a-z])/g, (_, a, b) => a + b.toUpperCase()) : s

export function parseFood(f: RawFood): FoodHit {
  const ns = f.foodNutrients ?? []
  const brand = (f.brandOwner || f.brandName || '').trim()
  return {
    id: f.fdcId,
    name: titleCase(f.description.trim()),
    brand: brand ? titleCase(brand) : null,
    per100g: {
      calories: Math.round(kcal(ns)),
      protein: grams(ns, '203'), carbs: grams(ns, '205'), fat: grams(ns, '204'),
      fiber: grams(ns, '291'), sugar: grams(ns, '269'),
    },
  }
}

async function search(query: string, dataType: string, pageSize: number, signal?: AbortSignal): Promise<FoodHit[]> {
  const url = `${SEARCH_URL}?${new URLSearchParams({ api_key: API_KEY, query, dataType, pageSize: String(pageSize), requireAllWords: 'true' })}`
  const res = await fetch(url, { signal })
  if (res.status === 429) throw new Error('Nutrition lookup is rate-limited. Try again later, or add a free USDA API key.')
  if (!res.ok) throw new Error(`Nutrition lookup failed (${res.status}).`)
  const body = (await res.json()) as { foods?: RawFood[] }
  return (body.foods ?? []).map(parseFood)
}

/**
 * Generic foods (USDA Foundation / SR Legacy) first, then packaged products. Packaged products
 * matter for things like "99% lean turkey" that generic entries do not distinguish.
 */
export async function lookupFoods(query: string, signal?: AbortSignal): Promise<{ generic: FoodHit[]; branded: FoodHit[] }> {
  const q = query.trim()
  const [generic, branded] = await Promise.all([
    search(q, 'Foundation,SR Legacy', 5, signal),
    search(q, 'Branded', 5, signal),
  ])
  return { generic, branded }
}
