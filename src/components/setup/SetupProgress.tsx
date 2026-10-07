import { SETUP_STEPS } from '../../lib/setupDraft'
import type { SetupStep } from '../../lib/setupDraft'

/**
 * Where you are inside Set up, deliberately quieter than the five-step progress above it: a small green
 * "SETUP 1 OF 4" label and a thin bar. Stacked on phones; side by side on wider screens.
 */
export function SetupProgress({ step }: { step: SetupStep }) {
  const at = Math.max(0, SETUP_STEPS.findIndex((s) => s.key === step))
  const label = SETUP_STEPS[at].label
  return (
    <div className="setup-progress">
      <p className="setup-progress__label">Setup {at + 1} of {SETUP_STEPS.length}</p>
      <div
        className="setup-progress__bar" role="progressbar" aria-label="Set up progress" aria-valuemin={1} aria-valuemax={SETUP_STEPS.length}
        aria-valuenow={at + 1} aria-valuetext={`Step ${at + 1} of ${SETUP_STEPS.length}: ${label}`}
      >
        <span style={{ width: `${((at + 1) / SETUP_STEPS.length) * 100}%` }} />
      </div>
    </div>
  )
}
