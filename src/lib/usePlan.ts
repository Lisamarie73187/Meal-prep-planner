import { useMemo } from 'react'
import { buildLines, fetchInventory, fetchPlan, fetchRecipes } from './api'
import type { AsyncState } from './useAsync'
import { useAsync } from './useAsync'
import type { InventoryItem, MealPlan, PlanItemRow, PlanLine, Recipe } from './types'

interface PlanData {
  plan: MealPlan
  items: PlanItemRow[]
  recipes: Map<string, Recipe>
  inventory: InventoryItem[]
}

/** Loads a plan with everything needed to compute lines, totals and the grocery list. */
export function usePlan(id: string): AsyncState<PlanData> & { lines: PlanLine[] } {
  const state = useAsync<PlanData>(async () => {
    const [{ plan, items }, recipes, inventory] = await Promise.all([fetchPlan(id), fetchRecipes('all'), fetchInventory()])
    return { plan, items, recipes: new Map(recipes.map((r) => [r.id, r])), inventory }
  }, [id])
  const lines = useMemo(() => (state.data ? buildLines(state.data.items, state.data.recipes) : []), [state.data])
  return { ...state, lines }
}
