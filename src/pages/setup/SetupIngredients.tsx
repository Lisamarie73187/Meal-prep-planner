import { Link, useOutletContext } from 'react-router-dom'
import { ChipInput } from '../../components/ChipInput'
import { IconArrowLeft, IconArrowRight } from '../../components/Icons'
import { setupPath } from '../../lib/setupDraft'
import type { SetupCtx } from './SetupLayout'

export function SetupIngredients() {
  const { draft, update, planId } = useOutletContext<SetupCtx>()
  return (
    <section className="setup-page" aria-labelledby="setup-title">
      <header className="setup-head">
        <h1 id="setup-title">Use what you already have</h1>
        <p className="setup-lede">Add ingredients from your fridge or pantry and we'll prioritize recipes that use them.</p>
      </header>

      <div className="setup-card">
        <ChipInput id="have" label="Ingredients you have" values={draft.have} onChange={(have) => update({ have })} placeholder="Add an ingredient..." />
        <p className="setup-note">We'll prioritize recipes using these ingredients when possible. Press Enter or type a comma to add each one.</p>
      </div>

      <div className="wizard-actions">
        <div className="wizard-actions__secondary">
          <Link className="btn btn-lg btn-quiet" to={setupPath('meals', planId)}><IconArrowLeft size={20} /> Back</Link>
          {draft.have.length === 0 && <Link className="btn btn-lg btn-quiet" to={setupPath('avoid', planId)}>Skip for now</Link>}
        </div>
        <Link className="btn btn-primary btn-lg" to={setupPath('avoid', planId)}>Continue <IconArrowRight size={20} /></Link>
      </div>
    </section>
  )
}
