import { useState } from 'react'
import { DEFAULT_RATIO, linkTargets, macroRatio } from './goals'
import type { MacroRatio } from './goals'
import type { Nutrient } from './types'

type Inputs = Record<Nutrient, string>

/**
 * The target boxes (as text), with calories and macros kept in step as you type (see `linkTargets`).
 * The calorie split of your macros is remembered so typing calories digit by digit doesn't lose it.
 */
export function useTargetInputs(initial: Inputs) {
  const [inputs, setInputs] = useState(initial)
  const [ratio, setRatio] = useState<MacroRatio>(() => macroRatio(initial) ?? DEFAULT_RATIO)

  /** Replace everything (opening an editor, loading a saved profile). */
  const reset = (next: Inputs) => {
    setInputs(next)
    setRatio(macroRatio(next) ?? DEFAULT_RATIO)
  }
  /** One box edited by hand. */
  const change = (field: Nutrient, value: string) => {
    const next = linkTargets(inputs, ratio, field, value)
    setInputs(next)
    if (field !== 'calories') {
      const r = macroRatio(next)
      if (r) setRatio(r)
    }
  }
  /** Set several boxes at once from a suggestion; fiber and sugar stay as they are. */
  const fill = (values: Partial<Inputs>) => reset({ ...inputs, ...values })
  return { inputs, change, reset, fill }
}
