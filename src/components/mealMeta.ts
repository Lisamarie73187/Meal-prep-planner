import { IconBowl, IconLeaf, IconMoon, IconSun } from './Icons'
import type { MealCategory } from '../lib/types'

/** How each meal type is named and pictured wherever the redesigned screens show it. */
export const MEAL_META: Record<MealCategory, { label: string; noun: string; Icon: typeof IconSun }> = {
  breakfast: { label: 'Breakfast', noun: 'breakfast', Icon: IconSun },
  lunch: { label: 'Lunch', noun: 'lunch', Icon: IconBowl },
  dinner: { label: 'Dinner', noun: 'dinner', Icon: IconMoon },
  snack: { label: 'Snacks', noun: 'snack', Icon: IconLeaf },
}
