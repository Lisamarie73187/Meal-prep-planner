import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { SetupProgress } from '../../components/setup/SetupProgress'
import { Stepper } from '../../components/Stepper'
import { createPlan, fetchPlan, replacePlanItems, updatePlan } from '../../lib/api'
import { prefsOf, reconcileItems } from '../../lib/suggest'
import {
  clearDraft, draftToPrefs, emptyDraft, loadDraft, prefsToDraft, rememberedPrefs, rememberPrefs, saveDraft, SETUP_STEPS, setupPath, totalRecipes,
} from '../../lib/setupDraft'
import type { SetupDraft, SetupStep } from '../../lib/setupDraft'
import { useAsync } from '../../lib/useAsync'
import { useDsBackground } from '../../lib/useDsBackground'

/** What each setup screen gets from the wizard. */
export interface SetupCtx {
  draft: SetupDraft
  update: (patch: Partial<SetupDraft>) => void
  planId: string | null
  total: number
  /** Creates (or updates) the plan from the draft and moves on to Goals. Called only from the last screen. */
  submit: () => Promise<void>
  busy: boolean
  error: string | null
  authLoading: boolean
}

/** `/plan/setup` -> the first screen; `/plan/new` (the old address) lands here too, keeping `?plan=`. */
export function SetupIndex() {
  const { search } = useLocation()
  return <Navigate to={`/plan/setup/meals${search}`} replace />
}

export function SetupLayout() {
  const planId = useSearchParams()[0].get('plan')
  // Keyed so switching to a different plan starts from that plan's own draft.
  return <SetupWizard key={planId ?? 'new'} planId={planId} />
}

function SetupWizard({ planId }: { planId: string | null }) {
  const planKey = planId ?? 'new'
  const { userId, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const last = useLocation().pathname.split('/').pop() ?? ''
  const step: SetupStep = SETUP_STEPS.some((s) => s.key === last) ? (last as SetupStep) : 'meals'

  // The draft lives here, above the four screens, so going back and forward never loses anything.
  // It is also kept for this tab so a reload doesn't either. Editing a saved plan starts from that plan.
  const existing = useAsync(async () => (planId ? fetchPlan(planId) : null), [planId])
  const [draft, setDraft] = useState<SetupDraft | null>(() => loadDraft(planKey) ?? (planId ? null : { ...emptyDraft(), ...rememberedPrefs() }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (draft === null && existing.data) setDraft(prefsToDraft(existing.data.plan.counts, prefsOf(existing.data.plan)))
  }, [draft, existing.data])
  useEffect(() => { if (draft) saveDraft(planKey, draft) }, [draft, planKey])

  useDsBackground()

  if (existing.error) {
    return (
      <div className="setup ds">
        <div className="alert alert-error">{existing.error}</div>
        <p><Link to={setupPath('meals')}>Start a new plan</Link></p>
      </div>
    )
  }
  if (!draft) return <p className="muted">Loading…</p>

  const update = (patch: Partial<SetupDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d))

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const prefs = draftToPrefs(draft)
      rememberPrefs(prefs)
      let id: string
      if (planId && existing.data) {
        id = planId
        await updatePlan(id, { counts: draft.counts, preferences: prefs })
        // Keep earlier picks in step with the new counts instead of leaving stale ones behind.
        const { items } = await fetchPlan(id)
        const kept = reconcileItems(items, draft.counts)
        if (JSON.stringify(kept) !== JSON.stringify(items)) {
          await replacePlanItems(id, kept.map(({ id: _i, plan_id: _p, ...rest }) => rest))
        }
      } else {
        id = (await createPlan(userId, draft.counts, `Plan · ${new Date().toLocaleDateString()}`, prefs)).id
      }
      clearDraft(planKey)
      navigate(`/plan/${id}/goals`)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  const ctx: SetupCtx = { draft, update, planId, total: totalRecipes(draft), submit, busy, error, authLoading }
  return (
    <div className="setup ds">
      <Stepper current={0} planId={planId ?? undefined} />
      <SetupProgress step={step} planId={planId} />
      <Outlet context={ctx} />
    </div>
  )
}
