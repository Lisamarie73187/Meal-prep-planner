import { supabase } from './supabase'
import type {
  Amounts, Ingredient, InventoryItem, MealCategory, MealPlan, PlanItemRow, PlanLine, PlanPreferences, Profile, Recipe, RecipeSnapshot,
} from './types'
import { perServingAmounts } from './nutrition'

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

const RECIPE_SELECT = '*, recipe_ingredients(*, ingredient:ingredients(*))'

function normalize(r: Recipe): Recipe {
  return { ...r, recipe_ingredients: [...(r.recipe_ingredients ?? [])].sort((a, b) => a.position - b.position) }
}

export async function fetchRecipes(scope: 'recommended' | 'mine' | 'all', userId?: string): Promise<Recipe[]> {
  let q = supabase.from('recipes').select(RECIPE_SELECT).order('name')
  if (scope === 'recommended') q = q.is('owner_id', null)
  if (scope === 'mine') q = q.eq('owner_id', userId ?? '')
  return check(await q).map((r) => normalize(r as unknown as Recipe))
}

export async function fetchRecipe(id: string): Promise<Recipe> {
  const r = check(await supabase.from('recipes').select(RECIPE_SELECT).eq('id', id).single())
  return normalize(r as unknown as Recipe)
}

export async function fetchIngredients(): Promise<Ingredient[]> {
  return check(await supabase.from('ingredients').select('*').order('name')) as unknown as Ingredient[]
}

export type NewIngredient = Omit<Ingredient, 'id'>

export async function createIngredient(ing: NewIngredient): Promise<Ingredient> {
  return check(await supabase.from('ingredients').insert(ing).select().single()) as unknown as Ingredient
}

export interface RecipeInput {
  name: string
  category: MealCategory
  servings: number
  prep_minutes: number
  photo_path: string | null
  instructions: string[]
  copied_from?: string | null
  ingredients: { ingredient_id: string; amount: number; display_unit: string | null }[]
}

/** ownerId null saves to the recommended table (admin only; RLS enforces it). */
export async function saveRecipe(input: RecipeInput, ownerId: string | null, id?: string): Promise<string> {
  const { ingredients, ...fields } = input
  let recipeId = id
  if (id) {
    check(await supabase.from('recipes').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id))
    check(await supabase.from('recipe_ingredients').delete().eq('recipe_id', id))
  } else {
    const row = check(await supabase.from('recipes').insert({ ...fields, owner_id: ownerId }).select('id').single())
    recipeId = (row as unknown as { id: string }).id
  }
  if (ingredients.length) {
    check(
      await supabase.from('recipe_ingredients').insert(
        ingredients.map((i, position) => ({ ...i, recipe_id: recipeId, position })),
      ),
    )
  }
  return recipeId!
}

export async function deleteRecipe(id: string) {
  check(await supabase.from('recipes').delete().eq('id', id))
}

export async function uploadPhoto(file: File, folder: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  check(await supabase.storage.from('recipe-photos').upload(path, file, { contentType: file.type }))
  return path
}

// ---- profile
export async function fetchProfile(userId: string): Promise<Profile> {
  return check(await supabase.from('profiles').select('*').eq('id', userId).single()) as unknown as Profile
}
export async function updateProfile(userId: string, patch: Partial<Profile>) {
  check(await supabase.from('profiles').update(patch).eq('id', userId))
}

// ---- inventory
export async function fetchInventory(): Promise<InventoryItem[]> {
  if (!(await supabase.auth.getSession()).data.session) return []
  const rows = check(await supabase.from('inventory_items').select('*, ingredient:ingredients(*)')) as unknown as InventoryItem[]
  return rows.sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name))
}
export async function upsertInventory(userId: string, ingredientId: string, amount: number) {
  check(
    await supabase
      .from('inventory_items')
      .upsert({ user_id: userId, ingredient_id: ingredientId, amount }, { onConflict: 'user_id,ingredient_id' }),
  )
}
export async function deleteInventory(id: string) {
  check(await supabase.from('inventory_items').delete().eq('id', id))
}
export async function applyInventoryUpdates(updates: { id: string; amount: number | null }[]) {
  for (const u of updates) {
    if (u.amount === null) await deleteInventory(u.id)
    else check(await supabase.from('inventory_items').update({ amount: u.amount }).eq('id', u.id))
  }
}

// ---- guest plan
// A signed-out visitor can build a whole plan. It lives in this browser under GUEST_PLAN_ID
// until they sign up, then saveGuestPlan() moves it into their account.
export const GUEST_PLAN_ID = 'local'
const GUEST_KEY = 'meal-prep:guest-plan'

interface GuestPlan {
  plan: MealPlan
  items: PlanItemRow[]
}

let guestMemory: GuestPlan | null = null // fallback when storage is unavailable

function readGuest(): GuestPlan | null {
  if (guestMemory) return guestMemory
  try {
    const raw = localStorage.getItem(GUEST_KEY)
    return raw ? (JSON.parse(raw) as GuestPlan) : null
  } catch {
    return null
  }
}
function writeGuest(g: GuestPlan | null) {
  guestMemory = g
  try {
    if (g) localStorage.setItem(GUEST_KEY, JSON.stringify(g))
    else localStorage.removeItem(GUEST_KEY)
  } catch { /* storage unavailable: the guest plan lasts until the page is closed */ }
}
export const hasGuestPlan = () => readGuest() !== null

function requireGuest(): GuestPlan {
  const g = readGuest()
  if (!g) throw new Error('This plan is no longer on this device. Start a new plan.')
  return g
}

let saving: Promise<string> | null = null
/** Copies the guest plan into the signed-in user's account and returns the new plan id. */
export function saveGuestPlan(userId: string): Promise<string> {
  saving ??= (async () => {
    const g = requireGuest()
    const plan = await createPlan(userId, g.plan.counts, g.plan.name, g.plan.preferences ?? undefined)
    await replacePlanItems(plan.id, g.items.map(({ id: _id, plan_id: _plan, ...rest }) => rest))
    writeGuest(null)
    return plan.id
  })().finally(() => { saving = null })
  return saving
}

// ---- plans (guest id -> browser storage, anything else -> database)
export async function listPlans(): Promise<MealPlan[]> {
  return check(await supabase.from('meal_plans').select('*').order('created_at', { ascending: false })) as unknown as MealPlan[]
}
export async function createPlan(
  userId: string | null, counts: Record<MealCategory, number>, name: string, preferences?: Partial<PlanPreferences>,
): Promise<MealPlan> {
  if (!userId) {
    const plan: MealPlan = {
      id: GUEST_PLAN_ID, user_id: '', name, status: 'draft', counts, preferences: preferences ?? {}, inventory_deducted: false,
      inventory_snapshot: null, created_at: new Date().toISOString(), confirmed_at: null,
    }
    writeGuest({ plan, items: [] })
    return plan
  }
  return check(await supabase.from('meal_plans').insert({ user_id: userId, counts, name, preferences: preferences ?? {} }).select().single()) as unknown as MealPlan
}
export async function updatePlan(id: string, patch: Partial<MealPlan>) {
  if (id === GUEST_PLAN_ID) {
    const g = requireGuest()
    return writeGuest({ ...g, plan: { ...g.plan, ...patch } })
  }
  check(await supabase.from('meal_plans').update(patch).eq('id', id))
}
export async function deletePlan(id: string) {
  if (id === GUEST_PLAN_ID) return writeGuest(null)
  check(await supabase.from('meal_plans').delete().eq('id', id))
}
export async function fetchPlan(id: string): Promise<{ plan: MealPlan; items: PlanItemRow[] }> {
  if (id === GUEST_PLAN_ID) return requireGuest()
  const plan = check(await supabase.from('meal_plans').select('*').eq('id', id).single()) as unknown as MealPlan
  const items = check(await supabase.from('meal_plan_items').select('*').eq('plan_id', id)) as unknown as PlanItemRow[]
  return { plan, items }
}
export async function replacePlanItems(planId: string, items: Omit<PlanItemRow, 'id' | 'plan_id'>[]) {
  if (planId === GUEST_PLAN_ID) {
    const g = requireGuest()
    return writeGuest({ ...g, items: items.map((i) => ({ ...i, plan_id: GUEST_PLAN_ID })) })
  }
  check(await supabase.from('meal_plan_items').delete().eq('plan_id', planId))
  if (items.length) check(await supabase.from('meal_plan_items').insert(items.map((i) => ({ ...i, plan_id: planId }))))
}

// ---- hidden recipes ("not for me")
export async function fetchHiddenRecipeIds(): Promise<string[]> {
  const rows = check(await supabase.from('hidden_recipes').select('recipe_id')) as unknown as { recipe_id: string }[]
  return rows.map((r) => r.recipe_id)
}
export async function hideRecipeRemote(userId: string, recipeId: string) {
  check(await supabase.from('hidden_recipes').upsert({ user_id: userId, recipe_id: recipeId }, { onConflict: 'user_id,recipe_id' }))
}
export async function unhideRecipeRemote(recipeId: string) {
  check(await supabase.from('hidden_recipes').delete().eq('recipe_id', recipeId))
}

// ---- plan math helpers
export function snapshotOf(recipe: Recipe): RecipeSnapshot {
  return {
    name: recipe.name,
    servings: recipe.servings,
    instructions: recipe.instructions,
    ingredients: recipe.recipe_ingredients.map((ri) => ({ ingredient: ri.ingredient, amount: ri.amount })),
  }
}

/** Build calculation lines: snapshot if frozen, else live recipe; overrides replace per-serving amounts. */
export function buildLines(items: PlanItemRow[], recipes: Map<string, Recipe>): PlanLine[] {
  const lines: PlanLine[] = []
  for (const it of items) {
    let name: string, servings: number, instructions: string[]
    let base: { ingredient: Ingredient; perServing: number }[]
    if (it.snapshot) {
      ;({ name, servings, instructions } = it.snapshot)
      base = it.snapshot.ingredients.map((i) => ({ ingredient: i.ingredient, perServing: i.amount / servings }))
    } else {
      const r = it.recipe_id ? recipes.get(it.recipe_id) : undefined
      if (!r) continue
      ;({ name, servings, instructions } = r)
      const ps = perServingAmounts(r)
      const seen = new Set<string>()
      base = []
      for (const ri of r.recipe_ingredients) {
        if (seen.has(ri.ingredient_id)) continue
        seen.add(ri.ingredient_id)
        base.push({ ingredient: ri.ingredient, perServing: ps[ri.ingredient_id] })
      }
    }
    const ov: Amounts = it.amount_overrides ?? {}
    lines.push({
      recipeId: it.recipe_id, name, category: it.category, servings, meals: it.meals, instructions,
      // An override of 0 means the ingredient was left out of this plan.
      ingredients: base.map((b) => ({ ingredient: b.ingredient, perServing: ov[b.ingredient.id] ?? b.perServing })).filter((i) => i.perServing > 0),
    })
  }
  return lines
}
