import { describe, expect, it } from 'vitest'
import { checkAnswers, checkGoalWeight, ftInToCm, lbToKg, restingCalories, suggestTargets, weeksAtPace, weeksToGoal } from './targetHelper'
import type { HelperAnswers } from './targetHelper'

const base: HelperAnswers = { weightKg: 70, heightCm: 165, age: 30, sex: 'female', goal: 'maintain', pace: 'moderate', activity: 'sedentary' }

describe('target helper', () => {
  it('Mifflin-St Jeor resting calories', () => {
    expect(restingCalories(base)).toBeCloseTo(1420.25, 2) // 700 + 1031.25 - 150 - 161
    expect(restingCalories({ ...base, sex: 'male' })).toBeCloseTo(1586.25, 2)
  })
  it('maintenance is resting x activity, and grams match the calories exactly', () => {
    const s = suggestTargets(base)
    expect(s.maintenance).toBe(1704) // 1420.25 x 1.2
    expect(s.adjustment).toBeGreaterThanOrEqual(-10)
    expect(s.adjustment).toBeLessThanOrEqual(10)
    expect(4 * s.protein + 4 * s.carbs + 9 * s.fat).toBe(s.calories)
  })
  it('losing takes calories away, gaining adds them, faster paces move further', () => {
    const lose = (pace: HelperAnswers['pace']) => suggestTargets({ ...base, activity: 'moderate', goal: 'lose', pace })
    const gain = (pace: HelperAnswers['pace']) => suggestTargets({ ...base, activity: 'moderate', goal: 'gain', pace })
    expect(lose('gentle').adjustment).toBeCloseTo(-250, -1)
    expect(lose('moderate').adjustment).toBeCloseTo(-500, -1)
    expect(lose('aggressive').adjustment).toBeCloseTo(-750, -1)
    expect(lose('moderate').weeklyKg).toBeCloseTo(-0.45, 1)
    expect(gain('gentle').adjustment).toBeCloseTo(250, -1)
    expect(gain('aggressive').calories).toBeGreaterThan(gain('moderate').calories)
    expect(lose('aggressive').calories).toBeLessThan(lose('gentle').calories)
  })
  it('never suggests less than the daily minimum, and says so', () => {
    const s = suggestTargets({ ...base, weightKg: 45, heightCm: 150, age: 60, goal: 'lose', pace: 'aggressive' })
    expect(s.calories).toBeGreaterThanOrEqual(1190)
    expect(s.calories).toBeLessThanOrEqual(1210)
    expect(s.raisedToFloor).toBe(true)
    expect(suggestTargets({ ...base, goal: 'gain' }).raisedToFloor).toBe(false)
  })
  it('protein follows body weight but never takes over the plate', () => {
    expect(suggestTargets({ ...base, goal: 'lose', pace: 'gentle', activity: 'moderate' }).protein).toBe(140) // 2.0 g x 70 kg
    const heavyAndLow = suggestTargets({ ...base, weightKg: 140, goal: 'lose', pace: 'aggressive', age: 70, heightCm: 150, sex: 'female' })
    expect(heavyAndLow.protein * 4).toBeLessThanOrEqual(heavyAndLow.calories * 0.36)
    expect(heavyAndLow.carbs).toBeGreaterThan(0)
  })
  it('converts pounds and feet', () => {
    expect(lbToKg(154)).toBeCloseTo(69.85, 1)
    expect(ftInToCm(5, 5)).toBeCloseTo(165.1, 1)
  })
  it('rejects typos and children', () => {
    expect(checkAnswers({ weightKg: 70, heightCm: 165, age: 30 })).toBeNull()
    expect(checkAnswers({ weightKg: 5, heightCm: 165, age: 30 })?.field).toBe('weight')
    expect(checkAnswers({ weightKg: 70, heightCm: 16, age: 30 })?.field).toBe('height')
    expect(checkAnswers({ weightKg: 70, heightCm: 165, age: 15 })?.field).toBe('age')
    expect(checkAnswers({ weightKg: NaN, heightCm: 165, age: 30 })?.field).toBe('weight')
  })
  it('goal weight must be on the right side of your weight for the goal', () => {
    expect(checkGoalWeight(80, 'lose', 70)).toBeNull()
    expect(checkGoalWeight(80, 'lose', 85)).toMatch(/lower/)
    expect(checkGoalWeight(80, 'lose', 80)).toMatch(/lower/)
    expect(checkGoalWeight(60, 'gain', 65)).toBeNull()
    expect(checkGoalWeight(60, 'gain', 55)).toMatch(/higher/)
    expect(checkGoalWeight(60, 'lose', 5)).toMatch(/between/)
    expect(checkGoalWeight(60, 'maintain', NaN)).toBeNull()
  })
  it('estimates weeks to the goal', () => {
    expect(weeksToGoal(80, 70, -0.5)).toBe(20)
    expect(weeksToGoal(60, 66, 0.5)).toBe(12)
    expect(weeksToGoal(80, 70, 0.5)).toBeNull() // moving the wrong way
    expect(weeksToGoal(80, 70, 0)).toBeNull()
    expect(weeksToGoal(80, 79.1, -0.45)).toBe(2) // rounds up
    // 500 kcal a day is about 0.4545 kg a week, so 10 kg takes about 22 weeks
    expect(weeksAtPace(80, 70, 'lose', 'moderate')).toBe(22)
    expect(weeksAtPace(80, 70, 'lose', 'aggressive')!).toBeLessThan(weeksAtPace(80, 70, 'lose', 'gentle')!)
  })
})
