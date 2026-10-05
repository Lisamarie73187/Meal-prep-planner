import { beforeEach, describe, expect, it, vi } from 'vitest'

const inserts: { table: string; rows: unknown }[] = []
vi.mock('./supabase', () => ({
  isConfigured: true,
  supabase: {
    auth: { getSession: async () => ({ data: { session: null } }) },
    from: (table: string) => ({
      insert: (rows: unknown) => {
        inserts.push({ table, rows })
        const res = { data: { id: 'db-plan-1' }, error: null }
        return { select: () => ({ single: async () => res }), then: (f: (r: typeof res) => unknown) => f(res) }
      },
      delete: () => ({ eq: async () => ({ data: null, error: null }) }),
    }),
  },
}))

import { createPlan, fetchInventory, fetchPlan, GUEST_PLAN_ID, hasGuestPlan, replacePlanItems, saveGuestPlan, updatePlan } from './api'

const counts = { breakfast: 0, lunch: 2, dinner: 0, snack: 0 }
const item = { recipe_id: 'r1', category: 'lunch' as const, meals: 2, amount_overrides: { i1: 50 }, snapshot: null }

describe('guest plan', () => {
  beforeEach(async () => {
    inserts.length = 0
    const { deletePlan } = await import('./api')
    await deletePlan(GUEST_PLAN_ID)
  })

  it('is created, edited and read back without a user', async () => {
    const p = await createPlan(null, counts, 'Mine')
    expect(p.id).toBe(GUEST_PLAN_ID)
    await replacePlanItems(GUEST_PLAN_ID, [item])
    await updatePlan(GUEST_PLAN_ID, { name: 'Renamed' })
    const { plan, items } = await fetchPlan(GUEST_PLAN_ID)
    expect(plan.name).toBe('Renamed')
    expect(items).toEqual([{ ...item, plan_id: GUEST_PLAN_ID }])
  })

  it('has no inventory when signed out', async () => {
    expect(await fetchInventory()).toEqual([])
  })

  it('saveGuestPlan writes the plan and items to the account, then clears the guest copy', async () => {
    const preferences = { have: 'turkey', dislikes: 'cilantro', diets: ['gluten_free' as const] }
    await createPlan(null, counts, 'Mine', preferences)
    await replacePlanItems(GUEST_PLAN_ID, [item])
    const id = await saveGuestPlan('user-1')
    expect(id).toBe('db-plan-1')
    expect(inserts[0]).toEqual({ table: 'meal_plans', rows: { user_id: 'user-1', counts, name: 'Mine', preferences } })
    expect(inserts[1]).toEqual({ table: 'meal_plan_items', rows: [{ ...item, plan_id: 'db-plan-1' }] })
    expect(hasGuestPlan()).toBe(false)
  })

  it('creates only one account plan when saved twice at once', async () => {
    await createPlan(null, counts, 'Mine')
    const [a, b] = await Promise.all([saveGuestPlan('user-1'), saveGuestPlan('user-1')])
    expect(a).toBe(b)
    expect(inserts.filter((i) => i.table === 'meal_plans')).toHaveLength(1)
  })

  it('explains when the guest plan is gone', async () => {
    await expect(fetchPlan(GUEST_PLAN_ID)).rejects.toThrow(/no longer on this device/)
  })
})
