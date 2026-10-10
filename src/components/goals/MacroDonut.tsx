import { donutSegments } from '../../lib/goals'
import type { MacroShares } from '../../lib/goals'

const R = 44
const STROKE = 17
const SEGMENTS = [
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
  { key: 'remaining', label: 'Remaining' },
] as const

/**
 * A ring of protein / carbs / fat / remaining with "{share} of your day" in the middle and a legend beside or
 * below it. The ring is decoration; the legend lists the same numbers as text.
 */
export function MacroDonut({ shares, dayShare, meal }: { shares: MacroShares; dayShare: string; meal: string }) {
  const segs = donutSegments(shares, R, 1.5)
  return (
    <div className="donut">
      <div className="donut__ring">
        <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
          <g transform="rotate(-90 60 60)" fill="none" strokeWidth={STROKE}>
            {segs.map((s) => (
              <circle
                key={s.key} className={`donut__arc donut__arc--${s.key}`} cx="60" cy="60" r={R}
                strokeDasharray={`${s.dash} ${s.circumference}`} strokeDashoffset={s.offset}
              />
            ))}
          </g>
        </svg>
        <div className="donut__center">
          <strong>{dayShare}</strong>
          <span>of your day</span>
          <span>({meal})</span>
        </div>
      </div>
      <ul className="donut__legend">
        {SEGMENTS.filter((s) => shares[s.key] > 0 || s.key !== 'remaining').map((s) => (
          <li key={s.key}><span className={`donut__dot donut__arc--${s.key}`} aria-hidden="true" />{s.label}<span className="donut__pct">{shares[s.key]}%</span></li>
        ))}
      </ul>
    </div>
  )
}
