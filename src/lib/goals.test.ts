import { describe, expect, it } from 'vitest'
import { calorieMismatch, DEFAULT_RATIO, donutSegments, fmtAmount, impliedCalories, inputsToPatch, linkTargets, macroRatio, macroShares, targetsToInputs } from './goals'

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

describe('macroShares', () => {
  it('measures macros against the calorie target and shows the rest as remaining', () => {
    // 36 g protein, 27 g carbs, 21 g fat = 144 + 108 + 189 = 441 kcal of a 500 kcal meal
    expect(macroShares({ calories: 500, protein: 36, carbs: 27, fat: 21 })).toEqual({ protein: 29, carbs: 21, fat: 38, remaining: 12 })
    for (const t of [{ calories: 375, protein: 30, carbs: 22.5, fat: 17.5 }, { calories: 333, protein: 7, carbs: 13, fat: 3 }, { protein: 1, carbs: 1, fat: 1 }]) {
      const s = macroShares(t)!
      expect(s.protein + s.carbs + s.fat + s.remaining).toBe(100)
    }
  })
  it('has no remaining slice when the macros cover (or exceed) the calories, or there is no calorie target', () => {
    expect(macroShares({ calories: 300, protein: 36, carbs: 27, fat: 21 })?.remaining).toBe(0)
    expect(macroShares({ protein: 36, carbs: 27 })).toEqual({ protein: 57, carbs: 43, fat: 0, remaining: 0 })
  })
  it('is null when there is nothing to split', () => {
    expect(macroShares({ calories: 450 })).toBeNull()
    expect(macroShares({})).toBeNull()
    expect(macroShares({ protein: 0, carbs: 0, fat: 0 })).toBeNull()
  })
})

describe('donutSegments', () => {
  it('lays arcs end to end around the circle with a small gap between them', () => {
    const segs = donutSegments({ protein: 30, carbs: 20, fat: 40, remaining: 10 }, 40, 2)
    const C = 2 * Math.PI * 40
    expect(segs.map((s) => s.key)).toEqual(['protein', 'carbs', 'fat', 'remaining'])
    expect(segs[0].offset).toBeCloseTo(0)
    expect(segs[1].offset).toBeCloseTo(-0.3 * C)
    expect(segs[3].offset).toBeCloseTo(-0.9 * C)
    expect(segs[0].dash).toBeCloseTo(0.3 * C - 2)
    expect(segs.reduce((a, s) => a + s.dash, 0) + 4 * 2).toBeCloseTo(C)
  })
  it('skips empty shares and draws a single arc with no gap', () => {
    expect(donutSegments({ protein: 0, carbs: 40, fat: 60, remaining: 0 }, 40, 2).map((s) => s.key)).toEqual(['carbs', 'fat'])
    const one = donutSegments({ protein: 100, carbs: 0, fat: 0, remaining: 0 }, 40, 2)
    expect(one).toHaveLength(1)
    expect(one[0].dash).toBeCloseTo(2 * Math.PI * 40)
  })
})

describe('linking calories and macros', () => {
  const blank = targetsToInputs({})
  it('works out calories once protein, carbs and fat are all in', () => {
    // 120 g protein + 90 g carbs + 70 g fat = 480 + 360 + 630
    let t = linkTargets(blank, DEFAULT_RATIO, 'protein', '120')
    expect(t.calories).toBe('') // not enough yet
    t = linkTargets(t, DEFAULT_RATIO, 'carbs', '90')
    expect(t.calories).toBe('')
    t = linkTargets(t, DEFAULT_RATIO, 'fat', '70')
    expect(t.calories).toBe('1470')
  })
  it('updates calories again when a macro changes, and leaves them alone while a box is blank', () => {
    const full = targetsToInputs({ calories: 1470, protein: 120, carbs: 90, fat: 70 })
    expect(linkTargets(full, DEFAULT_RATIO, 'carbs', '100').calories).toBe('1510')
    expect(linkTargets(full, DEFAULT_RATIO, 'carbs', '').calories).toBe('1470')
    expect(linkTargets(full, DEFAULT_RATIO, 'carbs', 'abc').calories).toBe('1470')
  })
  it('spreads typed calories over the macros using the given ratio', () => {
    const t = linkTargets(blank, DEFAULT_RATIO, 'calories', '1500')
    expect(t).toMatchObject({ calories: '1500', protein: '113', carbs: '150', fat: '50' })
  })
  it('keeps your own ratio when calories change', () => {
    const ratio = macroRatio(targetsToInputs({ protein: 120, carbs: 90, fat: 70 }))!
    expect(ratio.protein + ratio.carbs + ratio.fat).toBeCloseTo(1)
    const t = linkTargets(targetsToInputs({ calories: 1470, protein: 120, carbs: 90, fat: 70 }), ratio, 'calories', '2205')
    expect(t).toMatchObject({ protein: '180', carbs: '135', fat: '105' }) // 1.5x everything
  })
  it('does not rescale from a half-typed calorie number, and never touches fiber or sugar', () => {
    const start = { ...targetsToInputs({ protein: 120, carbs: 90, fat: 70, fiber: 25, sugar: 40 }), calories: '' }
    expect(linkTargets(start, DEFAULT_RATIO, 'calories', '')).toMatchObject({ protein: '120', carbs: '90', fat: '70' })
    expect(linkTargets(start, DEFAULT_RATIO, 'calories', '0')).toMatchObject({ protein: '120' })
    expect(linkTargets(start, DEFAULT_RATIO, 'calories', '2000')).toMatchObject({ fiber: '25', sugar: '40' })
  })
  it('macroRatio needs all three macros', () => {
    expect(macroRatio(targetsToInputs({ protein: 120, carbs: 90 }))).toBeNull()
    expect(macroRatio(targetsToInputs({ protein: 0, carbs: 0, fat: 0 }))).toBeNull()
  })
})
