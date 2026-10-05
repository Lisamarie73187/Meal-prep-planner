import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { DailyTargets } from '../components/goals/DailyTargets'
import { MealSplit } from '../components/goals/MealSplit'
import { PlanSummary } from '../components/goals/PlanSummary'
import { IconArrowLeft, IconArrowRight } from '../components/Icons'
import { Stepper } from '../components/Stepper'
import { fetchPlan } from '../lib/api'
import { dailyTargets } from '../lib/nutrition'
import { setupPath, splitList } from '../lib/setupDraft'
import { prefsOf } from '../lib/suggest'
import { CATEGORIES } from '../lib/types'
import { useAsync } from '../lib/useAsync'
import { useDsBackground } from '../lib/useDsBackground'

export function PlanGoals() {
  const { id } = useParams()
  const { profile, loading: authLoading } = useAuth()
  const { data, error, loading } = useAsync(() => fetchPlan(id!), [id])
  useDsBackground()
  if (loading || authLoading) return <p className="muted">Loading…</p>
  if (error || !data) return <div className="alert alert-error">{error ?? 'Plan not found'}</div>

  const { plan } = data
  const prefs = prefsOf(plan)
  const slots = CATEGORIES.filter((c) => plan.counts[c] > 0)
  const daily = dailyTargets(profile)
  const hasTargets = Object.keys(daily).length > 0

  return (
    <div className="ds goals">
      <Stepper current={1} planId={id} />

      <header className="goals-head">
        <h1>Set your nutrition goals</h1>
        <p className="setup-lede">We'll use these targets to find recipes that fit your meal plan.</p>
      </header>

      <div className="goals-stack">
        <PlanSummary planId={id!} counts={plan.counts} prefs={prefs} pantry={splitList(prefs.have).length} excluded={splitList(prefs.dislikes).length} />
        <DailyTargets daily={daily} planId={id!} />
        {hasTargets && slots.length > 0 && <MealSplit slots={slots} profile={profile} planId={id!} />}
      </div>

      <div className="wizard-actions">
        <p className="wizard-summary">Next, we'll find recipes that match these targets.</p>
        <div className="wizard-actions__end">
          <Link className="btn btn-lg" to={setupPath('diet', id)}><IconArrowLeft size={20} /> Back</Link>
          <Link className="btn btn-primary btn-lg" to={`/plan/${id}/pick`}>Continue to meals <IconArrowRight size={20} /></Link>
        </div>
      </div>
    </div>
  )
}
