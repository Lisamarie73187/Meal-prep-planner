import { Link } from 'react-router-dom'
import { SETUP_STEPS, setupPath } from '../../lib/setupDraft'
import type { SetupStep } from '../../lib/setupDraft'

/**
 * Where you are inside Set up. Deliberately quieter than the five-step progress above it:
 * a small text trail on wide screens, a thin bar with "Setup · 1 of 4" on phones.
 */
export function SetupProgress({ step, planId }: { step: SetupStep; planId?: string | null }) {
  const at = Math.max(0, SETUP_STEPS.findIndex((s) => s.key === step))
  const label = SETUP_STEPS[at].label
  return (
    <nav className="setup-progress" aria-label="Set up steps">
      <p className="setup-progress__compact">Setup · {at + 1} of {SETUP_STEPS.length}</p>
      <div
        className="setup-progress__bar" role="progressbar" aria-valuemin={1} aria-valuemax={SETUP_STEPS.length} aria-valuenow={at + 1}
        aria-valuetext={`Step ${at + 1} of ${SETUP_STEPS.length}: ${label}`}
      >
        <span style={{ width: `${((at + 1) / SETUP_STEPS.length) * 100}%` }} />
      </div>
      <ol className="setup-progress__list">
        {SETUP_STEPS.map((s, i) => (
          <li key={s.key} aria-current={i === at ? 'step' : undefined} className={i === at ? 'is-current' : i < at ? 'is-done' : ''}>
            {i < at ? (
              <Link to={setupPath(s.key, planId)}>{s.label}</Link>
            ) : (
              <span>{i === at ? `${i + 1} of ${SETUP_STEPS.length} — ${s.label}` : s.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
