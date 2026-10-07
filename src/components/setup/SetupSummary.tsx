import type { ReactNode } from 'react'
import { IconLeaf, IconMinusCircle, IconUtensils } from '../Icons'
import { summaryCards } from '../../lib/setupDraft'
import type { SetupDraft, SummaryCard } from '../../lib/setupDraft'

/**
 * Lets a line break only AFTER a " · " separator: the spaces inside each part become non-breaking, and the dot is
 * glued to the part before it, so a line never ends mid-phrase or starts with a stray dot.
 */
const softBreaks = (t: string) => (t.includes(' · ') ? t.split(' · ').map((p) => p.replace(/ /g, '\u00a0')).join('\u00a0· ') : t)

function Card({ icon, tone, card }: { icon: ReactNode; tone: 'warm' | 'sage'; card: SummaryCard }) {
  return (
    <li className="summary-card">
      <span className={`summary-card__icon summary-card__icon--${tone}`}>{icon}</span>
      <span className="summary-card__text">
        <strong>{softBreaks(card.primary)}</strong>
        {card.secondary && <small title={card.secondary}>{softBreaks(card.secondary)}</small>}
      </span>
    </li>
  )
}

/** A quick, read-only recap of everything entered during Set up. No buttons: it is a summary, not another form. */
export function SetupSummary({ draft }: { draft: SetupDraft }) {
  const c = summaryCards(draft)
  return (
    <section className="setup-card setup-summary" aria-labelledby="summary-title">
      <h2 id="summary-title">Your setup</h2>
      <p className="setup-summary__lede">Here's what you've set so far.</p>
      <ul className="summary-cards">
        <Card tone="warm" icon={<IconUtensils size={22} />} card={c.recipes} />
        <Card tone="sage" icon={<IconLeaf size={22} />} card={c.pantry} />
        <Card tone="warm" icon={<IconMinusCircle size={22} />} card={c.excluded} />
        <Card tone="sage" icon={<IconLeaf size={22} />} card={c.diets} />
      </ul>
    </section>
  )
}
