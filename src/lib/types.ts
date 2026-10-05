export type BaseUnit = 'g' | 'ml' | 'each'
export type StoreSection = 'produce' | 'meat' | 'dairy' | 'pantry' | 'frozen' | 'other'
export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const CATEGORIES: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack']
export const SECTIONS: StoreSection[] = ['produce', 'meat', 'dairy', 'pantry', 'frozen', 'other']
export const NUTRIENTS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar'] as const
export type Nutrient = (typeof NUTRIENTS)[number]
export type Nutrition = Record<Nutrient, number>

export const NUTRIENT_LABEL: Record<Nutrient, string> = {
  calories: 'Calories',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
  fiber: 'Fiber',
  sugar: 'Sugar',
}
export const NUTRIENT_UNIT: Record<Nutrient, string> = {
  calories: 'kcal',
  protein: 'g',
  carbs: 'g',
  fat: 'g',
  fiber: 'g',
  sugar: 'g',
}

/** What an ingredient contains, for diet filters. Missing/empty means nothing to flag. */
export type IngredientTag = 'meat' | 'dairy' | 'egg' | 'gluten' | 'animal'

/** Nutrition values are per 1 base unit (1 g, 1 ml or 1 each). */
export interface Ingredient extends Nutrition {
  id: string
  owner_id: string | null
  name: string
  base_unit: BaseUnit
  store_section: StoreSection
  density_g_per_ml: number | null
  /** Optional: plan snapshots saved before diet flags existed don't have it. */
  contains?: IngredientTag[]
}

export interface RecipeIngredient {
  id?: string
  recipe_id?: string
  ingredient_id: string
  /** Whole-recipe amount in the ingredient's base unit. */
  amount: number
  display_unit: string | null
  position: number
  ingredient: Ingredient
}

export interface Recipe {
  id: string
  owner_id: string | null
  copied_from: string | null
  name: string
  category: MealCategory
  servings: number
  prep_minutes: number
  photo_path: string | null
  instructions: string[]
  recipe_ingredients: RecipeIngredient[]
}

export interface Profile {
  id: string
  display_name: string | null
  is_admin: boolean
  target_calories: number | null
  target_protein: number | null
  target_carbs: number | null
  target_fat: number | null
  target_fiber: number | null
  target_sugar: number | null
  split_breakfast: number
  split_lunch: number
  split_dinner: number
  split_snack: number
}

export interface InventoryItem {
  id: string
  user_id: string
  ingredient_id: string
  amount: number
  ingredient: Ingredient
}

/** Per-serving ingredient amounts keyed by ingredient id (base units). */
export type Amounts = Record<string, number>

/** One recipe in a plan, with the ingredient data needed for math. */
export interface PlanLine {
  recipeId: string | null
  name: string
  category: MealCategory
  servings: number
  meals: number
  instructions: string[]
  ingredients: { ingredient: Ingredient; perServing: number }[]
}

export interface PlanItemRow {
  id?: string
  plan_id: string
  recipe_id: string | null
  category: MealCategory
  meals: number
  amount_overrides: Amounts | null
  snapshot: RecipeSnapshot | null
}

export interface RecipeSnapshot {
  name: string
  servings: number
  instructions: string[]
  ingredients: { ingredient: Ingredient; amount: number }[]
}

export type DietKey = 'vegetarian' | 'vegan' | 'dairy_free' | 'gluten_free'

/** What the user told us on the first screen. */
export interface PlanPreferences {
  /** Free text, comma separated: "turkey, chicken, spinach". */
  have: string
  /** Free text, comma separated: "cilantro, mushrooms". */
  dislikes: string
  diets: DietKey[]
}

export interface MealPlan {
  id: string
  user_id: string
  name: string
  status: 'draft' | 'confirmed'
  /** How many different recipes you want for each meal type. Portions are set per recipe on the review page. */
  counts: Record<MealCategory, number>
  /** May be empty or missing on plans created before preferences existed. */
  preferences?: Partial<PlanPreferences> | null
  inventory_deducted: boolean
  inventory_snapshot: { ingredient: Ingredient; amount: number }[] | null
  created_at: string
  confirmed_at: string | null
}
