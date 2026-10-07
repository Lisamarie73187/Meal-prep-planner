import type { DietKey, Ingredient, IngredientTag, Recipe } from './types'

export const DIETS: { key: DietKey; label: string; avoids: IngredientTag[] }[] = [
  // Meat and poultry carry 'meat'; fish and shellfish carry their own 'fish' tag so pescatarian can allow them.
  { key: 'vegetarian', label: 'Vegetarian', avoids: ['meat', 'fish'] },
  { key: 'vegan', label: 'Vegan', avoids: ['meat', 'fish', 'dairy', 'egg', 'animal'] },
  { key: 'pescatarian', label: 'Pescatarian', avoids: ['meat'] },
  { key: 'dairy_free', label: 'Dairy-free', avoids: ['dairy'] },
  { key: 'gluten_free', label: 'Gluten-free', avoids: ['gluten'] },
]

export const TAG_LABEL: Record<IngredientTag, string> = {
  meat: 'Meat or poultry',
  fish: 'Fish or shellfish',
  dairy: 'Dairy',
  egg: 'Egg',
  gluten: 'Gluten',
  animal: 'Other animal product (e.g. honey)',
}
export const TAGS = Object.keys(TAG_LABEL) as IngredientTag[]

export function avoidedTags(diets: DietKey[]): Set<IngredientTag> {
  return new Set(DIETS.filter((d) => diets.includes(d.key)).flatMap((d) => d.avoids))
}

/** True when no ingredient carries a tag the chosen diets avoid. */
export function recipeFitsDiets(recipe: Pick<Recipe, 'recipe_ingredients'>, diets: DietKey[]): boolean {
  if (diets.length === 0) return true
  const avoid = avoidedTags(diets)
  return recipe.recipe_ingredients.every((ri) => !(ri.ingredient.contains ?? []).some((t) => avoid.has(t)))
}

/** Which of the chosen diets a recipe breaks, by ingredient name (for explaining a hidden recipe). */
export function offendingIngredients(recipe: Pick<Recipe, 'recipe_ingredients'>, diets: DietKey[]): Ingredient[] {
  const avoid = avoidedTags(diets)
  return recipe.recipe_ingredients.map((ri) => ri.ingredient).filter((i) => (i.contains ?? []).some((t) => avoid.has(t)))
}

const RULES: [IngredientTag, RegExp][] = [
  // broth and stock are meat-based unless they say otherwise ("vegetable broth")
  ['meat', /\b(chicken|beef|turkey|pork|bacon|ham|sausage|steak|lamb|veal|duck|jerky|pepperoni|salami)\b|(?<!vegetable |veggie |mushroom |vegan |plant )\b(broth|stock)\b/i],
  ['fish', /\b(salmon|tuna|shrimp|prawns?|fish|cod|tilapia|trout|halibut|sardines?|anchov(y|ies)|crab|lobster|scallops?|mussels?|clams?|oysters?|seafood|squid|calamari)\b/i],
  ['dairy', /\b(cheese|yogh?urt|cream|whey|ghee|milk|buttermilk|kefir|paneer|ricotta|mozzarella|parmesan|feta|cheddar)\b/i],
  ['dairy', /(?<!peanut |almond |nut |cashew |sunflower |seed |apple )\bbutter\b/i],
  ['egg', /\beggs?\b|\bmayo(nnaise)?\b/i],
  ['gluten', /\b(wheat|flour|bread|pasta|tortilla|noodles?|couscous|barley|rye|oats?|granola|crackers?|soy sauce|seitan|bulgur|bagel|cereal|pita|panko|breadcrumbs?)\b/i],
  ['animal', /\b(honey|gelatin|lard)\b/i],
]
/** Plant milks and creams are not dairy. */
const PLANT_DAIRY = /\b(almond|oat|soy|coconut|rice|cashew|hemp|pea) (milk|cream|yogh?urt)\b|\bcoconut (milk|cream)\b|\bcream of tartar\b/i

/** A starting guess for the "contains" checkboxes when someone creates an ingredient. They can correct it. */
export function guessContains(name: string): IngredientTag[] {
  const n = name.trim()
  if (!n) return []
  const plantFree = n.replace(PLANT_DAIRY, ' ')
  return RULES.filter(([tag, re]) => re.test(tag === 'dairy' ? plantFree : n)).map(([tag]) => tag).filter((t, i, a) => a.indexOf(t) === i)
}
