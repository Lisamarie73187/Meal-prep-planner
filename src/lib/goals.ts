import { NUTRIENTS } from './types'
import type { Nutrient, Nutrition } from './types'

export const PRIMARY_TARGETS = ['calories', 'protein', 'carbs', 'fat'] as const
export const SECONDARY_TARGETS = ['fiber', 'sugar'] as const

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
/** 1500 -> "1,500", 31.5 -> "31.5", 36 -> "36". */
export const fmtAmount = (v: number) => nf.format(v)

/** The editor works on text so a half-typed number isn't rewritten under the cursor. */
export function targetsToInputs(t: Partial<Nutrition>): Record<Nutrient, string> {
  return Object.fromEntries(NUTRIENTS.map((n) => [n, t[n] != null ? String(t[n]) : ''])) as Record<Nutrient, string>
}

export type ParsedTargets = { ok: true; patch: Record<string, number | null> } | { ok: false; error: string; field: Nutrient }

/** Blank clears a target; anything else must be a non-negative number. Keys are the profile columns. */
export function inputsToPatch(inputs: Record<Nutrient, string>): ParsedTargets {
  const patch: Record<string, number | null> = {}
  for (const n of NUTRIENTS) {
    const raw = inputs[n].trim()
    if (raw === '') { patch[`target_${n}`] = null; continue }
    const v = Number(raw)
    if (!Number.isFinite(v) || v < 0) return { ok: false, field: n, error: `${n[0].toUpperCase() + n.slice(1)} must be a number that is 0 or more.` }
    patch[`target_${n}`] = v
  }
  return { ok: true, patch }
}

/** Calories implied by the macros (4 per g of protein and carbs, 9 per g of fat), or null if one is missing. */
export function impliedCalories(t: Partial<Nutrition>): number | null {
  if (t.protein == null || t.carbs == null || t.fat == null) return null
  return 4 * t.protein + 4 * t.carbs + 9 * t.fat
}

/** Set when the calorie target and the macros disagree by more than `tolerance` (no recipe can match both). */
export function calorieMismatch(t: Partial<Nutrition>, tolerance = 0.1): { implied: number; target: number } | null {
  const implied = impliedCalories(t)
  if (implied == null || !t.calories) return null
  return Math.abs(implied - t.calories) / t.calories > tolerance ? { implied, target: t.calories } : null
}
