import { useEffect, useRef, useState } from 'react'
import { ACTIVITY, PACE_KCAL, checkAnswers, checkGoalWeight, ftInToCm, lbToKg, suggestTargets, weeksAtPace, weeksToGoal } from '../lib/targetHelper'
import type { Activity, Goal, HelperAnswers, Pace, Sex, Suggestion } from '../lib/targetHelper'

type Units = 'us' | 'metric'
type Step = 'about' | 'activity' | 'goal' | 'pace' | 'result'

const GOALS: { key: Goal; label: string; hint: string }[] = [
  { key: 'lose', label: 'Lose weight', hint: 'Eat a little less than you burn' },
  { key: 'maintain', label: 'Maintain my weight', hint: 'Eat about what you burn' },
  { key: 'gain', label: 'Gain weight', hint: 'Eat a little more than you burn' },
]
const SEXES: { key: Sex; label: string }[] = [
  { key: 'female', label: 'Female' },
  { key: 'male', label: 'Male' },
]
const PACES: { key: Pace; label: string }[] = [
  { key: 'gentle', label: 'Gentle' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'aggressive', label: 'Aggressive' },
]

const num = (s: string) => (s.trim() === '' ? NaN : Number(s))
const lbPerWeek = (kcal: number) => (kcal * 7) / 3500

/** "about 22 weeks", or "about 1 year" once it's long. */
const duration = (weeks: number) => (weeks > 78 ? `about ${Math.round(weeks / 52 * 10) / 10} years` : weeks > 26 ? `about ${Math.round(weeks / 4.345)} months` : `about ${weeks} week${weeks === 1 ? '' : 's'}`)

/** A few questions about you and your goal, then a suggested calorie and macro target to drop into the form. */
export function TargetHelper({ onApply }: { onApply: (s: Suggestion) => void }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('about')
  const [units, setUnits] = useState<Units>('us')
  const [weight, setWeight] = useState('')
  const [feet, setFeet] = useState('')
  const [inches, setInches] = useState('')
  const [cm, setCm] = useState('')
  const [age, setAge] = useState('')
  const [goalWeight, setGoalWeight] = useState('')
  const [sex, setSex] = useState<Sex | null>(null)
  const [activity, setActivity] = useState<Activity | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [pace, setPace] = useState<Pace>('moderate')
  const [problem, setProblem] = useState<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  // Move focus to the new question so keyboard and screen-reader users land in the right place.
  useEffect(() => { if (open) heading.current?.focus() }, [step, open])

  const body = () => ({
    weightKg: units === 'us' ? lbToKg(num(weight)) : num(weight),
    heightCm: units === 'us' ? ftInToCm(num(feet), num(inches) || 0) : num(cm),
    age: num(age),
  })
  const goalKg = () => (units === 'us' ? lbToKg(num(goalWeight)) : num(goalWeight))
  const steps: Step[] = goal === 'maintain' ? ['about', 'activity', 'goal', 'result'] : ['about', 'activity', 'goal', 'pace', 'result']
  const at = steps.indexOf(step)
  const go = (to: Step) => { setProblem(null); setStep(to) }

  const next = () => {
    if (step === 'about') {
      const b = body()
      const bad = checkAnswers(b) ?? (sex ? null : { message: 'Choose one of the options for sex.' })
      if (bad) return setProblem(bad.message)
    }
    if (step === 'activity' && !activity) return setProblem('Choose how active you are.')
    if (step === 'goal') {
      if (!goal) return setProblem('Choose a goal.')
      if (goal !== 'maintain' && goalWeight.trim() === '') return setProblem('Enter the weight you want to reach.')
      const bad = checkGoalWeight(body().weightKg, goal, goalKg())
      if (bad) return setProblem(bad)
    }
    go(steps[at + 1])
  }

  const answers: HelperAnswers | null = sex && activity && goal ? { ...body(), goalWeightKg: goal === 'maintain' ? undefined : goalKg(), sex, activity, goal, pace } : null
  const result = step === 'result' && answers && !checkAnswers(answers) ? suggestTargets(answers) : null

  const close = () => { setOpen(false); setStep('about'); setProblem(null) }

  if (!open) {
    return (
      <div className="card row row-between">
        <div>
          <strong>Not sure what your targets should be?</strong>
          <p className="muted small">Answer a few questions and we'll suggest calories and macros for your goal.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>Help me set my targets</button>
      </div>
    )
  }

  return (
    <section className="card stack helper" aria-labelledby="helper-title">
      <div className="row row-between">
        <h2 id="helper-title">Target helper</h2>
        <span className="muted small">Step {at + 1} of {steps.length}</span>
      </div>
      <div className="helper__bar" aria-hidden="true"><span style={{ width: `${((at + 1) / steps.length) * 100}%` }} /></div>

      {step === 'about' && (
        <fieldset className="helper__fields">
          <legend><h3 ref={heading} tabIndex={-1}>About you</h3></legend>
          <div className="tabs" role="group" aria-label="Units">
            <button type="button" className="tab" aria-pressed={units === 'us'} aria-selected={units === 'us'} onClick={() => setUnits('us')}>lb · ft/in</button>
            <button type="button" className="tab" aria-pressed={units === 'metric'} aria-selected={units === 'metric'} onClick={() => setUnits('metric')}>kg · cm</button>
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="h-weight">Weight ({units === 'us' ? 'lb' : 'kg'})</label>
              <input id="h-weight" className="input" type="number" inputMode="decimal" min="0" step="any" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            {units === 'us' ? (
              <div className="field">
                <label htmlFor="h-feet">Height</label>
                <div className="helper__height">
                  <input id="h-feet" className="input" type="number" inputMode="numeric" min="0" aria-label="Feet" placeholder="ft" value={feet} onChange={(e) => setFeet(e.target.value)} />
                  <input id="h-in" className="input" type="number" inputMode="decimal" min="0" aria-label="Inches" placeholder="in" value={inches} onChange={(e) => setInches(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="field">
                <label htmlFor="h-cm">Height (cm)</label>
                <input id="h-cm" className="input" type="number" inputMode="decimal" min="0" value={cm} onChange={(e) => setCm(e.target.value)} />
              </div>
            )}
            <div className="field">
              <label htmlFor="h-age">Age</label>
              <input id="h-age" className="input" type="number" inputMode="numeric" min="0" value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
          </div>
          <div className="hchoices" role="radiogroup" aria-label="Sex">
            {SEXES.map((o) => (
              <label key={o.key} className={`hchoice${sex === o.key ? ' is-on' : ''}`}>
                <input type="radio" name="h-sex" checked={sex === o.key} onChange={() => setSex(o.key)} /> {o.label}
              </label>
            ))}
          </div>
          <p className="muted small">Used only to estimate how many calories you burn. Nothing here is saved.</p>
        </fieldset>
      )}

      {step === 'activity' && (
        <fieldset className="helper__fields">
          <legend><h3 ref={heading} tabIndex={-1}>How active are you?</h3></legend>
          <div className="hchoices hchoices--stack" role="radiogroup" aria-label="Activity level">
            {(Object.keys(ACTIVITY) as Activity[]).map((k) => (
              <label key={k} className={`hchoice${activity === k ? ' is-on' : ''}`}>
                <input type="radio" name="h-activity" checked={activity === k} onChange={() => setActivity(k)} />
                <span><strong>{ACTIVITY[k].label}</strong><span className="muted small"> {ACTIVITY[k].hint}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {step === 'goal' && (
        <fieldset className="helper__fields">
          <legend><h3 ref={heading} tabIndex={-1}>What's your goal?</h3></legend>
          <div className="hchoices hchoices--stack" role="radiogroup" aria-label="Goal">
            {GOALS.map((o) => (
              <label key={o.key} className={`hchoice${goal === o.key ? ' is-on' : ''}`}>
                <input type="radio" name="h-goal" checked={goal === o.key} onChange={() => setGoal(o.key)} />
                <span><strong>{o.label}</strong><span className="muted small"> {o.hint}</span></span>
              </label>
            ))}
          </div>
          {goal && goal !== 'maintain' && (
            <div className="field helper__goalweight">
              <label htmlFor="h-goalweight">Goal weight ({units === 'us' ? 'lb' : 'kg'})</label>
              <input id="h-goalweight" className="input" type="number" inputMode="decimal" min="0" step="any" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} />
            </div>
          )}
        </fieldset>
      )}

      {step === 'pace' && goal && goal !== 'maintain' && (
        <fieldset className="helper__fields">
          <legend><h3 ref={heading} tabIndex={-1}>How fast do you want to {goal === 'lose' ? 'lose' : 'gain'}?</h3></legend>
          <div className="hchoices hchoices--stack" role="radiogroup" aria-label="Pace">
            {PACES.map((o) => {
              const lb = lbPerWeek(PACE_KCAL[o.key])
              const weeks = weeksAtPace(body().weightKg, goalKg(), goal, o.key)
              return (
                <label key={o.key} className={`hchoice${pace === o.key ? ' is-on' : ''}`}>
                  <input type="radio" name="h-pace" checked={pace === o.key} onChange={() => setPace(o.key)} />
                  <span>
                    <strong>{o.label}</strong>
                    <span className="muted small"> about {units === 'us' ? `${lb} lb` : `${Math.round(lb * 0.4536 * 100) / 100} kg`} a week ({goal === 'lose' ? '−' : '+'}{PACE_KCAL[o.key]} calories a day)</span>
                    {weeks != null && <span className="muted small"> Reaches {goalWeight} {units === 'us' ? 'lb' : 'kg'} in {duration(weeks)}.</span>}
                    {o.key === 'aggressive' && <span className="muted small"> Harder to stick to.</span>}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      )}

      {step === 'result' && (
        <div className="stack-sm" role="region" aria-live="polite">
          <h3 ref={heading} tabIndex={-1}>Your suggested targets</h3>
          {result ? <ResultView s={result} goal={goal!} pace={pace} units={units} weightKg={answers!.weightKg} goalWeightKg={answers!.goalWeightKg} goalLabel={goalWeight} /> : <div className="alert alert-warn">Something doesn't look right. Go back and check your answers.</div>}
        </div>
      )}

      {problem && <div className="alert alert-error" role="alert">{problem}</div>}
      <div className="row">
        {at > 0 && <button type="button" className="btn" onClick={() => go(steps[at - 1])}>← Back</button>}
        {step !== 'result' && <button type="button" className="btn btn-primary" onClick={next}>{steps[at + 1] === 'result' ? 'See my targets' : 'Next →'}</button>}
        {step === 'result' && result && <button type="button" className="btn btn-primary" onClick={() => { onApply(result); close() }}>Use these targets</button>}
        <button type="button" className="btn btn-ghost" onClick={close}>Cancel</button>
      </div>
    </section>
  )
}

function ResultView({ s, goal, pace, units, weightKg, goalWeightKg, goalLabel }: { s: Suggestion; goal: Goal; pace: Pace; units: Units; weightKg: number; goalWeightKg?: number; goalLabel: string }) {
  const weeks = goal !== 'maintain' && goalWeightKg != null ? weeksToGoal(weightKg, goalWeightKg, s.weeklyKg) : null
  const kg = Math.abs(s.weeklyKg)
  const change = units === 'us' ? `${Math.round(lbPerWeek(Math.abs(s.adjustment)) * 10) / 10} lb` : `${Math.round(kg * 100) / 100} kg`
  const pct = (g: number, per: number) => Math.round((g * per * 100) / s.calories)
  return (
    <>
      <p className="helper__big"><strong>{s.calories.toLocaleString('en-US')}</strong> calories a day</p>
      <ul className="helper__macros">
        <li><span className="donut__dot donut__arc--protein" aria-hidden="true" /> Protein <strong>{s.protein} g</strong> <span className="muted small">{pct(s.protein, 4)}%</span></li>
        <li><span className="donut__dot donut__arc--carbs" aria-hidden="true" /> Carbs <strong>{s.carbs} g</strong> <span className="muted small">{pct(s.carbs, 4)}%</span></li>
        <li><span className="donut__dot donut__arc--fat" aria-hidden="true" /> Fat <strong>{s.fat} g</strong> <span className="muted small">{pct(s.fat, 9)}%</span></li>
      </ul>
      <p className="muted small">
        You burn about {s.maintenance.toLocaleString('en-US')} calories a day.{' '}
        {goal === 'maintain'
          ? 'These targets keep you about where you are.'
          : `Eating about ${Math.round(Math.abs(s.adjustment) / 10) * 10} ${s.adjustment < 0 ? 'less' : 'more'} (${pace}) should ${goal === 'lose' ? 'lose' : 'gain'} roughly ${change} a week.`}
      </p>
      {weeks != null && <p>At this pace you'd reach <strong>{goalLabel} {units === 'us' ? 'lb' : 'kg'}</strong> in {duration(weeks)}.</p>}
      {s.raisedToFloor && <div className="alert alert-warn">That pace would go below a safe minimum, so we stopped at {s.calories.toLocaleString('en-US')} calories. Choose a gentler pace or talk to a doctor or dietitian.</div>}
      <p className="muted small">This is a rough estimate, not medical advice. If you're pregnant, breastfeeding, or have a health condition, check with a doctor or dietitian first.</p>
    </>
  )
}
