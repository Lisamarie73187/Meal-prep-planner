import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { IconArrowLeft, IconArrowRight, IconCheck, IconInfo } from '../../components/Icons'
import dairyFreeImg from '../../assets/diets/dairy-free.webp'
import glutenFreeImg from '../../assets/diets/gluten-free.webp'
import pescatarianImg from '../../assets/diets/pescatarian.webp'
import veganImg from '../../assets/diets/vegan.webp'
import vegetarianImg from '../../assets/diets/vegetarian.webp'
import { DIETS } from '../../lib/diet'
import { SetupSummary } from '../../components/setup/SetupSummary'
import { setupPath } from '../../lib/setupDraft'
import type { DietKey } from '../../lib/types'
import type { SetupCtx } from './SetupLayout'

/** A photo for each option (320px WebP cut-outs; the originals are larger). Decorative: the label says what each one is. */
const IMAGES: Record<DietKey, string> = {
  vegetarian: vegetarianImg,
  vegan: veganImg,
  pescatarian: pescatarianImg,
  dairy_free: dairyFreeImg,
  gluten_free: glutenFreeImg,
}

const DESCRIPTIONS: Record<DietKey, string> = {
  vegetarian: 'No meat or fish',
  vegan: 'No meat, fish, dairy, eggs or honey',
  pescatarian: 'Includes fish and seafood, no other meat',
  dairy_free: 'No milk, cheese, butter or yogurt',
  gluten_free: 'No wheat, oats or soy sauce',
}

export function SetupDiet() {
  const { draft, update, planId, total, submit, busy, error, authLoading } = useOutletContext<SetupCtx>()
  const [infoOpen, setInfoOpen] = useState(false)

  // Vegan, Vegetarian and Pescatarian are levels of the same choice (each includes the one before it), so picking
  // one replaces the others. Dairy-free and gluten-free combine with any of them.
  const LEVELS: DietKey[] = ['vegan', 'vegetarian', 'pescatarian']
  const toggle = (key: DietKey) => {
    if (draft.diets.includes(key)) return update({ diets: draft.diets.filter((d) => d !== key) })
    const rivals = LEVELS.includes(key) ? LEVELS.filter((d) => d !== key) : []
    update({ diets: [...draft.diets.filter((d) => !rivals.includes(d)), key] })
  }

  return (
    <section className="setup-page" aria-labelledby="setup-title">
      <header className="setup-head">
        <h1 id="setup-title" className="setup-title-row">
          Dietary preferences
          <button
            type="button" className="icon-btn" aria-label="About dietary filters" aria-expanded={infoOpen} aria-controls="diet-info"
            onClick={() => setInfoOpen(!infoOpen)}
          >
            <IconInfo size={22} />
          </button>
        </h1>
        <p className="setup-lede">Choose any dietary preferences you'd like us to use when selecting recipes.</p>
        <p id="diet-info" className="setup-info" hidden={!infoOpen}>
          Dietary filters are based on the ingredients listed in each recipe. Always check product labels if you have a food allergy.
        </p>
      </header>

      <fieldset className="choice-grid">
        <legend className="visually-hidden">Dietary preferences</legend>
        {DIETS.map((d) => {
          const on = draft.diets.includes(d.key)
          return (
            <label key={d.key} className={`choice${on ? ' is-on' : ''}`}>
              <input type="checkbox" className="choice__input" checked={on} onChange={() => toggle(d.key)} />
              <img className="choice__img" src={IMAGES[d.key]} alt="" width={144} height={96} decoding="async" />
              <span className="choice__mark" aria-hidden="true">{on && <IconCheck size={18} />}</span>
              <span className="choice__text">
                <strong>{d.label}</strong>
                <small>{DESCRIPTIONS[d.key]}</small>
              </span>
            </label>
          )
        })}
      </fieldset>
      <p className="setup-note">Vegan, Vegetarian and Pescatarian are different levels of the same choice, so picking one switches off the others.</p>

      <SetupSummary draft={draft} />

      {total === 0 && (
        <div className="alert alert-warn">Choose at least one recipe first. <Link to={setupPath('meals', planId)}>Go back to your meals</Link></div>
      )}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="wizard-actions wizard-actions--nav">
        <div className="wizard-nav">
          <Link className="btn btn-lg" to={setupPath('avoid', planId)}><IconArrowLeft size={20} /> Back</Link>
          <button type="button" className="btn btn-primary btn-lg" disabled={total === 0 || busy || authLoading} onClick={submit}>
            {busy ? 'Saving…' : <>Continue to goals <IconArrowRight size={20} /></>}
          </button>
        </div>
      </div>
    </section>
  )
}
