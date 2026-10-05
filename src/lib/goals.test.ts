import { describe, expect, it } from 'vitest'
import { calorieMismatch, fmtAmount, impliedCalories, inputsToPatch, targetsToInputs } from './goals'

describe('fmtAmount', () => {
  it('uses thousands separators and at most one decimal', () => {
    expect(fmtAmount(1500)).toBe('1,500')
    expect(fmtAmount(31.5)).toBe('31.5')
    expect(fmtAmount(36)).toBe('36')
    expect(fmtAmount(24.49)).toBe('24.5')
  })
})

describe('target editor conversion', () => {
  it('round-trips and leaves unset targets blank', () => {
    const inputs = targetsToInputs({ calories: 1500, protein: 120 })
    expect(inputs.calories).toBe('1500')
    expect(inputs.carbs).toBe('')
    const r = inputsToPatch(inputs)
    expect(r.ok && r.patch).toEqual({ target_calories: 1500, target_protein: 120, target_carbs: null, target_fat: null, target_fiber: null, target_sugar: null })
  })
  it('a blank field clears that target', () => {
    const r = inputsToPatch({ calories: '', protein: ' 90 ', carbs: '', fat: '', fiber: '', sugar: '' })
    expect(r.ok && r.patch.target_calories).toBeNull()
    expect(r.ok && r.patch.target_protein).toBe(90)
  })
  it('rejects negatives and text, naming the field', () => {
    expect(inputsToPatch({ ...targetsToInputs({}), fat: '-5' })).toMatchObject({ ok: false, field: 'fat' })
    expect(inputsToPatch({ ...targetsToInputs({}), protein: 'lots' })).toMatchObject({ ok: false, field: 'protein' })
  })
})

describe('calorie mismatch', () => {
  it('computes calories from macros', () => {
    expect(impliedCalories({ protein: 120, carbs: 90, fat: 70 })).toBe(4 * 120 + 4 * 90 + 9 * 70)
    expect(impliedCalories({ protein: 120, carbs: 90 })).toBeNull()
  })
  it('flags targets that disagree by more than 10%', () => {
    // 120/90/70 -> 1470 kcal vs 1500: fine. 1500 vs macros that make 1800: flagged.
    expect(calorieMismatch({ calories: 1500, protein: 120, carbs: 90, fat: 70 })).toBeNull()
    expect(calorieMismatch({ calories: 1500, protein: 150, carbs: 150, fat: 70 })).toEqual({ implied: 1830, target: 1500 })
    expect(calorieMismatch({ calories: 1500 })).toBeNull()
  })
})
