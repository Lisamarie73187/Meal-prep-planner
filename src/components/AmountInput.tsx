import { useEffect, useState } from 'react'
import type { Ingredient } from '../lib/types'
import { fromBase, pickDisplayUnit, toBase, unitsFor } from '../lib/units'

type Info = Pick<Ingredient, 'base_unit' | 'density_g_per_ml'> & { name?: string; store_section?: string }

const defaultUnit = (ing: Info) => (ing.base_unit === 'each' ? 'each' : ing.base_unit === 'g' && ing.store_section === 'meat' ? 'oz' : ing.base_unit)
const fmt = (v: number, unit: string, ing: Info) => String(Math.round(fromBase(v, unit, ing) * 100) / 100)

interface Props {
  ingredient: Info
  /** Amount in the ingredient's base unit. */
  value: number
  /** Called with the amount in the base unit, and the unit currently showing (so it can be remembered). */
  onChange: (baseAmount: number, unit: string) => void
  label: string
  /** Show this unit to start with (e.g. the "cup" the recipe was written in), if it suits the ingredient. */
  initialUnit?: string | null
}

/** Number + unit picker that always reports the amount in the ingredient's base unit. */
export function AmountInput({ ingredient, value, onChange, label, initialUnit }: Props) {
  const [unit, setUnit] = useState(() =>
    initialUnit && unitsFor(ingredient).includes(initialUnit) ? initialUnit : value > 0 ? pickDisplayUnit(value, ingredient) : defaultUnit(ingredient),
  )
  const [text, setText] = useState(() => (value > 0 ? fmt(value, unit, ingredient) : ''))

  const parse = (t: string, u: string) => {
    const n = parseFloat(t)
    return Number.isFinite(n) && n >= 0 ? toBase(n, u, ingredient) : 0
  }

  // Resync when the value is changed from outside (e.g. auto-fit).
  useEffect(() => {
    if (Math.abs(parse(text, unit) - value) > 1e-6 * Math.max(1, value)) setText(value > 0 ? fmt(value, unit, ingredient) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="amount">
      <input
        className="input"
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        aria-label={`${label} amount`}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          onChange(parse(e.target.value, unit), unit)
        }}
      />
      <select
        className="select"
        aria-label={`${label} unit`}
        value={unit}
        onChange={(e) => {
          setUnit(e.target.value)
          setText(value > 0 ? fmt(value, e.target.value, ingredient) : '')
          onChange(value, e.target.value)
        }}
      >
        {unitsFor(ingredient).map((u) => <option key={u}>{u}</option>)}
      </select>
    </div>
  )
}
