import { Link, useOutletContext } from 'react-router-dom'
import { ChipInput } from '../../components/ChipInput'
import { IconArrowLeft, IconArrowRight } from '../../components/Icons'
import { setupPath } from '../../lib/setupDraft'
import type { SetupCtx } from './SetupLayout'

export function SetupAvoid() {
  const { draft, update, planId } = useOutletContext<SetupCtx>()
  return (
    <section className="setup-page" aria-labelledby="setup-title">
      <header className="setup-head">
        <h1 id="setup-title">Anything you don't want?</h1>
        <p className="setup-lede">Add ingredients you dislike or don't want included in your meal plan.</p>
      </header>

      <div className="setup-card">
        <ChipInput id="avoid" label="Foods to avoid" values={draft.dislikes} onChange={(dislikes) => update({ dislikes })} placeholder="Add a food to avoid..." />
        <p className="setup-note">For serious food allergies, always verify individual recipe ingredients and product labels.</p>
      </div>

      <div className="wizard-actions">
        <div className="wizard-actions__secondary">
          <Link className="btn btn-lg btn-quiet" to={setupPath('ingredients', planId)}><IconArrowLeft size={20} /> Back</Link>
          {draft.dislikes.length === 0 && <Link className="btn btn-lg btn-quiet" to={setupPath('diet', planId)}>Skip for now</Link>}
        </div>
        <Link className="btn btn-primary btn-lg" to={setupPath('diet', planId)}>Continue <IconArrowRight size={20} /></Link>
      </div>
    </section>
  )
}
