import { Link } from 'react-router-dom'
import { IconCheck } from './Icons'

const STEPS = ['Set up', 'Goals', 'Meals', 'Review', 'Results'] as const

/**
 * Progress through the planning flow: a numbered circle per step, joined by a line.
 * The current step is filled, finished steps show a check, and `planId` makes finished steps links back.
 */
export function Stepper({ current, planId }: { current: 0 | 1 | 2 | 3 | 4; planId?: string }) {
  const hrefs = ['/plan/setup/meals' + (planId ? `?plan=${planId}` : ''), `/plan/${planId}/goals`, `/plan/${planId}/pick`, `/plan/${planId}/review`, `/plan/${planId}/results`]
  return (
    <ol className="stepper" aria-label="Progress">
      {STEPS.map((label, i) => {
        const done = i < current
        const inner = (
          <>
            <span className="stepper__dot" aria-hidden="true">{done ? <IconCheck size={16} /> : i + 1}</span>
            <span className="stepper__label"><span className="stepper__n">{i + 1}. </span>{label}{done && <span className="visually-hidden"> (done)</span>}</span>
          </>
        )
        return (
          <li key={label} className={`stepper__item${done ? ' done' : ''}${i === current ? ' current' : ''}`} aria-current={i === current ? 'step' : undefined}>
            {planId && done ? <Link to={hrefs[i]}>{inner}</Link> : <span className="stepper__node">{inner}</span>}
          </li>
        )
      })}
    </ol>
  )
}
