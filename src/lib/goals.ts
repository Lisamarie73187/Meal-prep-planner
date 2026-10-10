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

export interface MacroShares {
  protein: number
  carbs: number
  fat: number
  /** Part of the calorie target the macros don't account for (0 when they cover it or there is no calorie target). */
  remaining: number
}

/**
 * Where a meal's calories come from, as whole percentages that add up to exactly 100 (largest-remainder rounding):
 * protein and carbs at 4 kcal/g, fat at 9. They are measured against the calorie target, so whatever the macros
 * leave uncovered shows as `remaining`. Missing macros count as zero; null when there is nothing to draw.
 */
export function macroShares(t: Partial<Nutrition>): MacroShares | null {
  const kcal = { protein: 4 * (t.protein ?? 0), carbs: 4 * (t.carbs ?? 0), fat: 9 * (t.fat ?? 0) }
  const macros = kcal.protein + kcal.carbs + kcal.fat
  if (!(macros > 0)) return null
  const whole = Math.max(t.calories ?? 0, macros)
  const keys = ['protein', 'carbs', 'fat', 'remaining'] as const
  const raw = { ...kcal, remaining: whole - macros }
  const parts = keys.map((k) => ({ k, raw: (raw[k] / whole) * 100, whole: Math.floor((raw[k] / whole) * 100 + 1e-9) }))
  let left = 100 - parts.reduce((a, p) => a + p.whole, 0)
  for (const p of [...parts].sort((a, b) => b.raw - b.whole - (a.raw - a.whole))) if (left > 0 && p.raw > 0) { p.whole++; left-- }
  const out = { protein: 0, carbs: 0, fat: 0, remaining: 0 }
  for (const p of parts) out[p.k] = p.whole
  return out
}

/**
 * Stroke settings to draw a ring of coloured arcs: one per non-empty share, each as `dash` of the circle's
 * circumference starting at `offset`. A small `gap` separates neighbours (none when there is only one arc).
 */
export function donutSegments(shares: MacroShares, radius: number, gap: number) {
  const circumference = 2 * Math.PI * radius
  const keys = (['protein', 'carbs', 'fat', 'remaining'] as const).filter((k) => shares[k] > 0)
  let start = 0
  return keys.map((key) => {
    const length = (shares[key] / 100) * circumference
    const seg = { key, dash: Math.max(0, length - (keys.length > 1 ? gap : 0)), circumference, offset: -start }
    start += length
    return seg
  })
}
