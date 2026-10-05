import { describe, expect, it } from 'vitest'
import { formatAmount, formatNumber, formatPortion, fromBase, roundBase, toBase, unitsFor } from './units'
import { chicken, egg, oil, rice } from './testData'

describe('units', () => {
  it('converts cups and ml consistently for liquids', () => {
    expect(toBase(2, 'cup', oil)).toBeCloseTo(473.18, 1)
    expect(fromBase(500, 'cup', oil)).toBeCloseTo(2.11, 2)
  })
  it('converts weight and volume via density', () => {
    expect(toBase(1, 'cup', rice)).toBeCloseTo(236.588 * 0.78, 3)
    expect(fromBase(78, 'ml', rice)).toBeCloseTo(100, 3)
    expect(() => toBase(1, 'cup', chicken)).toThrow()
  })
  it('limits units by base unit and density', () => {
    expect(unitsFor(egg)).toEqual(['each'])
    expect(unitsFor(chicken)).not.toContain('cup')
    expect(unitsFor(rice)).toContain('cup')
  })
  it('turns 48 tbsp into 3 cups', () => {
    expect(formatAmount(toBase(48, 'tbsp', oil), oil).text).toBe('3 cup')
  })
  it('rounds to practical amounts', () => {
    expect(formatAmount(437, chicken).text).toBe('435 g')
    expect(formatAmount(437, chicken, 'up').text).toBe('450 g')
    expect(formatAmount(1250, chicken).text).toBe('1.25 kg')
    expect(formatAmount(2.2, egg, 'up').text).toBe('3')
    expect(formatAmount(6, { base_unit: 'g', density_g_per_ml: 0.4 }).text).toBe('1 tbsp')
    expect(roundBase(437, chicken)).toBe(435)
  })
  it('formats fractions', () => {
    expect(formatNumber(1.5)).toBe('1½')
    expect(formatNumber(0.25)).toBe('¼')
    expect(formatNumber(3)).toBe('3')
  })
  it('adds a cup hint for dry ingredients', () => {
    expect(formatPortion(190, rice)).toBe('190 g (≈ 1 cup)')
    expect(formatPortion(150, chicken)).toBe('150 g')
  })
})
