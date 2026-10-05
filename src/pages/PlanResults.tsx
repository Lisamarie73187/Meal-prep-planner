import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { GroceryList } from '../components/GroceryList'
import { PortionGuide, ScaledRecipes } from '../components/PlanSections'
import { Stepper } from '../components/Stepper'
import { applyInventoryUpdates, GUEST_PLAN_ID, replacePlanItems, saveGuestPlan, snapshotOf, updatePlan } from '../lib/api'
import { applyInventory, deductInventory, planNeeds } from '../lib/grocery'
import { usePlan } from '../lib/usePlan'

type Tab = 'grocery' | 'recipes' | 'portions'

export function PlanResults() {
  const { id } = useParams()
  const { data, loading, error, lines, reload } = usePlan(id!)
  const [tab, setTab] = useState<Tab>('grocery')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const { userId } = useAuth()
  const navigate = useNavigate()
  const justSaved = (useLocation().state as { saved?: boolean } | null)?.saved
  const isGuest = id === GUEST_PLAN_ID

  // Signed in with a guest plan (just signed up or in): move it into the account.
  useEffect(() => {
    if (!isGuest || !userId) return
    saveGuestPlan(userId)
      .then((newId) => navigate(`/plan/${newId}/results`, { replace: true, state: { saved: true } }))
      .catch((e: Error) => setSaveError(e.message))
  }, [isGuest, userId, navigate])

  const needs = useMemo(() => planNeeds(lines), [lines])
  if (isGuest && userId) {
    return saveError ? <div className="alert alert-error">{saveError}</div> : <p className="muted">Saving your plan…</p>
  }
  if (loading) return <p className="muted">Loading…</p>
  if (error || !data) return <div className="alert alert-error">{error ?? 'Plan not found'}</div>
  const { plan, items, recipes, inventory } = data
  const confirmed = plan.status === 'confirmed'
  // Confirmed plans use the inventory as it was at confirm time, so deducting later doesn't change the list.
  const result = applyInventory(needs, confirmed && plan.inventory_snapshot ? plan.inventory_snapshot : inventory)

  const run = async (fn: () => Promise<void>, done: string) => {
    setBusy(true)
    setMsg(null)
    try { await fn(); setMsg(done); reload() } catch (e) { setMsg((e as Error).message) }
    setBusy(false)
  }

  const confirm = () => run(async () => {
    await replacePlanItems(id!, items.map((i) => ({
      recipe_id: i.recipe_id, category: i.category, meals: i.meals, amount_overrides: i.amount_overrides,
      snapshot: i.recipe_id && recipes.get(i.recipe_id) ? snapshotOf(recipes.get(i.recipe_id)!) : i.snapshot,
    })))
    await updatePlan(id!, {
      status: 'confirmed', confirmed_at: new Date().toISOString(),
      inventory_snapshot: inventory.map((i) => ({ ingredient: i.ingredient, amount: i.amount })),
    })
  }, 'Plan confirmed and saved to your past plans.')

  const deduct = () => run(async () => {
    await applyInventoryUpdates(deductInventory(needs, inventory))
    await updatePlan(id!, { inventory_deducted: true })
  }, 'Used amounts were deducted from your inventory.')

  const usedFromInventory = result.covered.length > 0 || result.toBuy.some((l) => l.have > 0)

  return (
    <div className="stack">
      <Stepper current={4} planId={id} />
      <div className="row row-between">
        <h1>{plan.name}</h1>
        <button className="btn no-print" onClick={() => window.print()}>🖨 Print</button>
      </div>
      {justSaved && !msg && <div className="alert alert-ok no-print">Saved to your account. Confirm it when you're happy with it.</div>}
      {msg && <div className="alert alert-ok no-print">{msg}</div>}
      {isGuest ? (
        <div className="card stack-sm no-print">
          <strong>Want to keep this plan?</strong>
          <p className="muted small">Create a free account to save it, confirm it and track what's in your pantry. This plan comes with you.</p>
          <div className="row">
            <Link className="btn btn-primary" to="/sign-up" state={{ from: `/plan/${GUEST_PLAN_ID}/results` }}>Sign up to save</Link>
            <Link className="btn" to="/sign-in" state={{ from: `/plan/${GUEST_PLAN_ID}/results` }}>I already have an account</Link>
          </div>
        </div>
      ) : (
      <div className="card row row-between no-print">
        {confirmed ? <span className="badge badge-ok">Confirmed</span> : <span className="muted small">Happy with it? Confirm to freeze this plan.</span>}
        <div className="row">
          {!confirmed && <button className="btn btn-primary" disabled={busy || lines.length === 0} onClick={confirm}>Confirm plan</button>}
          {confirmed && usedFromInventory && !plan.inventory_deducted && (
            <button className="btn btn-primary" disabled={busy} onClick={deduct}>Deduct used amounts from inventory</button>
          )}
          {plan.inventory_deducted && <span className="muted small">Inventory already updated.</span>}
        </div>
      </div>
      )}
      <div className="tabs no-print" role="tablist">
        {([['grocery', 'Grocery list'], ['recipes', 'Recipes'], ['portions', 'Portioning']] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className="tab" onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      <div hidden={tab !== 'grocery'} className="print-show"><h2 className="print-only">Grocery list</h2><GroceryList planId={id!} result={result} /></div>
      <div hidden={tab !== 'recipes'} className="print-show print-break"><h2 className="print-only">Recipes</h2><ScaledRecipes lines={lines} /></div>
      <div hidden={tab !== 'portions'}><PortionGuide lines={lines} /></div>
      <p className="no-print"><Link to={`/plan/${id}/review`}>← Back to review</Link></p>
    </div>
  )
}
