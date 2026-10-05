import { useEffect, useState } from 'react'

export const MIN_PORTIONS = 1
export const MAX_PORTIONS = 40

/** Whole portions between the minimum and maximum; anything else becomes the nearest allowed value. */
export const clampPortions = (v: number) => Math.min(MAX_PORTIONS, Math.max(MIN_PORTIONS, Math.round(v)))

/** Parses what was typed; null when it isn't a number. */
export function parsePortions(text: string): number | null {
  const n = Number(text.trim())
  return text.trim() !== '' && Number.isFinite(n) ? clampPortions(n) : null
}

/**
 * Portions for one recipe: type a number (saved when you leave the box or press Enter), or use − and +.
 * Typing doesn't save on every keystroke, so "12" isn't saved as "1" on the way.
 */
export function PortionsInput({ value, onChange, name, disabled }: { value: number; onChange: (v: number) => void; name: string; disabled?: boolean }) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])

  const commit = () => {
    const n = parsePortions(draft)
    if (n === null) return setDraft(String(value)) // not a number: put back what was there
    setDraft(String(n))
    if (n !== value) onChange(n)
  }

  return (
    <span className="stepper-ctl">
      <button type="button" aria-label={`Fewer portions of ${name}`} disabled={disabled || value <= MIN_PORTIONS} onClick={() => onChange(clampPortions(value - 1))}>−</button>
      <input
        className="portions-input" type="number" inputMode="numeric" min={MIN_PORTIONS} max={MAX_PORTIONS} step={1}
        aria-label={`${name} portions`} value={draft} disabled={disabled}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); (e.target as HTMLInputElement).blur() } }}
      />
      <button type="button" aria-label={`More portions of ${name}`} disabled={disabled || value >= MAX_PORTIONS} onClick={() => onChange(clampPortions(value + 1))}>+</button>
    </span>
  )
}
