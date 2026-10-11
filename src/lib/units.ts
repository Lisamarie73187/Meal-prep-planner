import type { Ingredient } from './types'

export type UnitKind = 'mass' | 'volume' | 'count'
export interface UnitDef {
  kind: UnitKind
  /** Multiplier to grams, millilitres or each. */
  factor: number
}

export const UNITS: Record<string, UnitDef> = {
  g: { kind: 'mass', factor: 1 },
  kg: { kind: 'mass', factor: 1000 },
  oz: { kind: 'mass', factor: 28.3495 },
  lb: { kind: 'mass', factor: 453.592 },
  ml: { kind: 'volume', factor: 1 },
  l: { kind: 'volume', factor: 1000 },
  tsp: { kind: 'volume', factor: 4.92892 },
  tbsp: { kind: 'volume', factor: 14.7868 },
  'fl oz': { kind: 'volume', factor: 29.5735 },
  cup: { kind: 'volume', factor: 236.588 },
  each: { kind: 'count', factor: 1 },
  can: { kind: 'count', factor: 1 }, // how much a can holds depends on the food: see CAN_SIZE
}

type UnitInfo = Pick<Ingredient, 'base_unit' | 'density_g_per_ml'> & { name?: string; store_section?: string }

/** What one standard can holds, for the canned foods in the ingredient list (beans are the drained amount of a 15 oz can). */
const CAN_SIZE: Record<string, { unit: 'g' | 'ml'; size: number }> = {
  'black beans (canned, drained)': { unit: 'g', size: 255 },
  'kidney beans (canned, drained)': { unit: 'g', size: 255 },
  'chickpeas (canned, drained)': { unit: 'g', size: 245 },
  'canned diced tomatoes': { unit: 'g', size: 411 }, // 14.5 oz
  'canned coconut milk': { unit: 'ml', size: 400 }, // 13.5 fl oz
  'canned tuna (in water)': { unit: 'g', size: 112 }, // 5 oz can, drained
}

/** Grams or ml in one can of this ingredient, or null when it isn't a canned food we know the size of. */
export function canSizeOf(ing: { name?: string; base_unit: string }): number | null {
  if (!ing.name) return null
  const can = CAN_SIZE[ing.name.trim().toLowerCase()]
  return can && can.unit === ing.base_unit ? can.size : null
}

/** Typical size of one item (a bell pepper is about 150 g), when the ingredient is one you count but is stored by weight or volume. */
function itemSizeOf(ing: UnitInfo): number | null {
  if (!ing.name || ing.base_unit === 'each') return null
  const item = ITEM_SIZE[ing.name.trim().toLowerCase()]
  return item && item.unit === ing.base_unit ? item.size : null
}

/** Units an ingredient can be entered in. Cross-kind (weight <-> volume) needs a density. */
export function unitsFor(ing: UnitInfo): string[] {
  if (ing.base_unit === 'each') return ['each']
  const mass = ['g', 'kg', 'oz', 'lb']
  const vol = ['ml', 'l', 'tsp', 'tbsp', 'fl oz', 'cup']
  const list = ing.base_unit === 'g' ? (ing.density_g_per_ml ? [...mass, ...vol] : mass) : ing.density_g_per_ml ? [...vol, ...mass] : vol
  const counted = itemSizeOf(ing) ? [...list, 'each'] : list
  return canSizeOf(ing) ? [...counted, 'can'] : counted
}

export function toBase(amount: number, unit: string, ing: UnitInfo): number {
  const u = UNITS[unit]
  if (!u) throw new Error(`Unknown unit ${unit}`)
  if (unit === 'can') {
    const can = canSizeOf(ing)
    if (!can) throw new Error('No can size known for this ingredient')
    return amount * can
  }
  if (u.kind === 'count') return amount * (itemSizeOf(ing) ?? 1)
  const raw = amount * u.factor
  if (u.kind === 'mass' && ing.base_unit === 'g') return raw
  if (u.kind === 'volume' && ing.base_unit === 'ml') return raw
  const d = ing.density_g_per_ml
  if (!d) throw new Error('Cannot convert between weight and volume without a density')
  return u.kind === 'mass' ? raw / d : raw * d
}

export function fromBase(baseAmount: number, unit: string, ing: UnitInfo): number {
  const u = UNITS[unit]
  if (!u) throw new Error(`Unknown unit ${unit}`)
  if (unit === 'can') return baseAmount / (canSizeOf(ing) ?? 1)
  if (u.kind === 'count') return baseAmount / (itemSizeOf(ing) ?? 1)
  let raw = baseAmount
  if (u.kind === 'mass' && ing.base_unit === 'ml') raw = baseAmount * (ing.density_g_per_ml ?? NaN)
  if (u.kind === 'volume' && ing.base_unit === 'g') raw = baseAmount / (ing.density_g_per_ml ?? NaN)
  return raw / u.factor
}

export type RoundMode = 'nearest' | 'up'
const ML_PER_CUP = UNITS.cup.factor

/** Volume (ml) used to decide on spoon/cup display, or null when it has no sensible volume. */
function volumeMl(baseAmount: number, ing: UnitInfo): number | null {
  if (ing.base_unit === 'ml') return baseAmount
  if (ing.base_unit === 'g' && ing.density_g_per_ml) return baseAmount / ing.density_g_per_ml
  return null
}

/** The friendliest unit for an amount: 48 tbsp -> cup, 1200 g -> kg, 6 g of spice -> tsp. */
export function pickDisplayUnit(baseAmount: number, ing: UnitInfo): string {
  if (ing.base_unit === 'each') return 'each'
  if (ing.base_unit === 'g' && ing.store_section === 'meat') return 'oz' // meat is bought and cooked by the ounce
  const ml = volumeMl(baseAmount, ing)
  if (ing.base_unit === 'ml') {
    if (baseAmount < 14) return 'tsp'
    if (baseAmount < ML_PER_CUP / 4) return 'tbsp'
    return baseAmount < 1000 ? 'cup' : 'l'
  }
  if (ml !== null && baseAmount < 30 && ml < ML_PER_CUP / 4) return ml < 14 ? 'tsp' : 'tbsp'
  return baseAmount >= 1000 ? 'kg' : 'g'
}

const step = (v: number, s: number, mode: RoundMode) =>
  (mode === 'up' ? Math.ceil(v / s - 1e-9) : Math.round(v / s)) * s

function roundValue(v: number, unit: string, mode: RoundMode): number {
  switch (unit) {
    case 'each': return mode === 'up' ? Math.ceil(v - 1e-9) : Math.max(0.5, step(v, 0.5, 'nearest'))
    case 'tsp': return Math.max(0.25, step(v, 0.25, mode))
    case 'tbsp': return Math.max(0.5, step(v, 0.5, mode))
    case 'cup': return Math.max(0.25, step(v, 0.25, mode))
    case 'oz': return mode === 'up' ? Math.ceil(v - 1e-9) : Math.max(0.25, step(v, 0.25, 'nearest'))
    case 'l': return step(v, 0.1, mode)
    case 'kg': return step(v, mode === 'up' ? 0.1 : 0.05, mode)
    default: // g
      if (v >= 100) return step(v, mode === 'up' ? 25 : 5, mode)
      if (v >= 10) return step(v, mode === 'up' ? 5 : 1, mode)
      return Math.max(0.5, step(v, mode === 'up' ? 1 : 0.5, mode))
  }
}

const FRACTIONS: Record<number, string> = { 0.125: '⅛', 0.25: '¼', 0.5: '½', 0.75: '¾' }

export function formatNumber(v: number): string {
  const whole = Math.floor(v + 1e-9)
  const frac = Math.round((v - whole) * 1000) / 1000
  if (frac < 0.001) return String(whole)
  const f = FRACTIONS[frac]
  if (f) return whole ? `${whole}${f}` : f
  return String(Math.round(v * 10) / 10)
}

export interface FormattedAmount {
  value: number
  unit: string
  text: string
}

export function formatAmount(baseAmount: number, ing: UnitInfo, mode: RoundMode = 'nearest'): FormattedAmount {
  const unit = pickDisplayUnit(baseAmount, ing)
  const value = roundValue(fromBase(baseAmount, unit, ing), unit, mode)
  const metric = ['g', 'kg', 'ml', 'l'].includes(unit)
  const num = metric ? String(Math.round(value * 100) / 100) : formatNumber(value)
  return { value, unit, text: unit === 'each' ? num : `${num} ${unit}` }
}

/** Base-unit amount after rounding to what you would actually measure. */
export function roundBase(baseAmount: number, ing: UnitInfo, mode: RoundMode = 'nearest'): number {
  const f = formatAmount(baseAmount, ing, mode)
  return toBase(f.value, f.unit, ing)
}

/** "150 g" plus a volume hint like "(≈ ¼ cup)" for dense dry ingredients. */
export function formatPortion(baseAmount: number, ing: UnitInfo): string {
  const main = formatAmount(baseAmount, ing)
  if (main.unit !== 'g' && main.unit !== 'kg') return main.text
  const ml = volumeMl(baseAmount, ing)
  if (ml === null || ml < ML_PER_CUP / 4 || ml > ML_PER_CUP * 6) return main.text
  const cups = Math.max(0.25, step(ml / ML_PER_CUP, 0.25, 'nearest'))
  return `${main.text} (≈ ${formatNumber(cups)} cup${cups > 1 ? 's' : ''})`
}

/**
 * Typical size of one item, for ingredients you buy by the piece but that are stored by weight or volume.
 * `noun` is only for when the item's name wouldn't read right after a number ("2 lemons" for lemon juice).
 */
const ITEM_SIZE: Record<string, { unit: 'g' | 'ml'; size: number; noun?: string }> = {
  'bell pepper': { unit: 'g', size: 150 },
  onion: { unit: 'g', size: 150 },
  carrot: { unit: 'g', size: 70 },
  tomato: { unit: 'g', size: 125 },
  zucchini: { unit: 'g', size: 200 },
  cucumber: { unit: 'g', size: 300 },
  avocado: { unit: 'g', size: 150 },
  'sweet potato': { unit: 'g', size: 200 },
  broccoli: { unit: 'g', size: 300, noun: 'head' },
  eggplant: { unit: 'g', size: 400 },
  'chicken breast': { unit: 'g', size: 180 },
  'salmon fillet': { unit: 'g', size: 150 },
  'lemon juice': { unit: 'ml', size: 45, noun: 'lemon' },
}

/** Grams (or ml) in `count` of a counted item such as a bell pepper, or null when there is no typical size. */
export function itemToBase(name: string, count: number, base_unit: 'g' | 'ml' | 'each'): number | null {
  const item = ITEM_SIZE[name.trim().toLowerCase()]
  return item && item.unit === base_unit ? count * item.size : null
}

export interface BuyAmount {
  /** What to write on the list: "2" (the name is already on the line), "2 lemons", or "300 g" when it can't be counted. */
  text: string
  /** The weight or volume behind a count, e.g. "≈ 300 g"; absent when text is already a measure. */
  hint?: string
}

/**
 * How much to buy, as a person would say it: a whole-item count where there's a typical size (2 bell peppers),
 * otherwise the usual measured amount rounded up. Counts round up so you never come home short.
 */
export function formatBuy(baseAmount: number, ing: Pick<Ingredient, 'name' | 'base_unit' | 'density_g_per_ml'>): BuyAmount {
  const can = canSizeOf(ing)
  if (can) {
    const count = Math.max(1, Math.ceil(baseAmount / can - 0.05))
    return { text: `${count} ${count === 1 ? 'can' : 'cans'}`, hint: `≈ ${formatAmount(baseAmount, ing).text}` }
  }
  const item = ITEM_SIZE[ing.name.trim().toLowerCase()]
  if (item && item.unit === ing.base_unit) {
    const count = Math.max(1, Math.ceil(baseAmount / item.size - 0.05))
    const text = item.noun ? `${count} ${item.noun}${count === 1 ? '' : 's'}` : String(count)
    return { text, hint: `≈ ${formatAmount(baseAmount, ing, 'up').text}` }
  }
  return { text: formatAmount(baseAmount, ing, 'up').text }
}

export interface UnitBasis {
  /** How the ingredient is stored: grams, millilitres or a count. */
  base: 'g' | 'ml' | 'each'
  /** The amount the nutrition numbers are written for: per 100 g / 100 ml like a label, otherwise per 1 of the unit. */
  per: number
  /** That amount in the stored unit (1 cup = 236.588 ml), to turn the numbers into per-gram or per-ml values. */
  perBase: number
  /** "100 g", "1 cup". */
  label: string
}

/** What a chosen measuring unit means for a new ingredient: how it is stored and what its nutrition numbers are "per". */
export function unitBasis(unit: string): UnitBasis {
  const def = UNITS[unit]
  const base = def.kind === 'mass' ? 'g' : def.kind === 'volume' ? 'ml' : 'each'
  const per = unit === 'g' || unit === 'ml' ? 100 : 1
  return { base, per, perBase: per * def.factor, label: `${per} ${unit}` }
}

/**
 * Rewrites nutrition numbers written "per 100 g" so they read "per 1 cup" (or any other unit), keeping them the same food.
 * Weight to weight and volume to volume are exact. Weight to volume needs the density (grams per ml).
 * Returns null when it can't be done: no density for weight <-> volume, or either side is a count ("each").
 */
export function convertPerAmount(values: number[], fromUnit: string, toUnit: string, densityGPerMl: number | null): number[] | null {
  const from = unitBasis(fromUnit)
  const to = unitBasis(toUnit)
  if (from.base === 'each' || to.base === 'each') return fromUnit === toUnit ? values : null
  // numbers per one gram (or ml), then across g <-> ml with the density, then per the new amount
  let ratio = to.perBase / from.perBase
  if (from.base !== to.base) {
    if (!(densityGPerMl && densityGPerMl > 0)) return null
    ratio *= from.base === 'g' ? densityGPerMl : 1 / densityGPerMl
  }
  return values.map((v) => v * ratio)
}
