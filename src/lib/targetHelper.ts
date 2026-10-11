export type Sex = 'female' | 'male'
export type Goal = 'lose' | 'maintain' | 'gain'
export type Pace = 'gentle' | 'moderate' | 'aggressive'
export type Activity = 'sedentary' | 'light' | 'moderate' | 'very'

export interface HelperAnswers {
  weightKg: number
  /** Where you want to get to. Only used for losing or gaining; maintaining has no goal weight. */
  goalWeightKg?: number
  heightCm: number
  age: number
  sex: Sex
  goal: Goal
  pace: Pace
  activity: Activity
}

export interface Suggestion {
  /** Calories to eat at rest-of-day activity with no goal (maintenance). */
  maintenance: number
  /** Daily calories after the goal; always equals 4P + 4C + 9F of the grams below. */
  calories: number
  protein: number
  carbs: number
  fat: number
  /** Calories per day added (+) or removed (-) for the goal, after any safety floor. */
  adjustment: number
  /** Expected change in body weight, in kg per week (negative = loss). */
  weeklyKg: number
  /** True when the calories were raised to the minimum a day should have. */
  raisedToFloor: boolean
}

export const ACTIVITY: Record<Activity, { label: string; hint: string; factor: number }> = {
  sedentary: { label: 'Mostly sitting', hint: 'Desk job, little exercise', factor: 1.2 },
  light: { label: 'Lightly active', hint: 'Exercise 1–3 days a week', factor: 1.375 },
  moderate: { label: 'Moderately active', hint: 'Exercise 3–5 days a week', factor: 1.55 },
  very: { label: 'Very active', hint: 'Hard exercise most days or a physical job', factor: 1.725 },
}

/** Calories per day added or removed. About 7,700 kcal is one kg of body weight. */
export const PACE_KCAL: Record<Pace, number> = { gentle: 250, moderate: 500, aggressive: 750 }
const KCAL_PER_KG = 7700

/** Lowest daily calories to suggest. Going below this isn't something an app should recommend. */
export const CALORIE_FLOOR: Record<Sex, number> = { female: 1200, male: 1500 }

/** Grams of protein per kg of body weight, by goal, and the most protein we'll suggest as a share of calories. */
const PROTEIN_PER_KG: Record<Goal, number> = { lose: 2.0, maintain: 1.6, gain: 1.8 }
const MAX_PROTEIN_SHARE = 0.35
const FAT_SHARE = 0.25

export const lbToKg = (lb: number) => lb * 0.45359237
export const ftInToCm = (ft: number, inch: number) => (ft * 12 + inch) * 2.54

/** Mifflin-St Jeor resting energy. */
export function restingCalories(a: Pick<HelperAnswers, 'weightKg' | 'heightCm' | 'age' | 'sex'>): number {
  const base = 10 * a.weightKg + 6.25 * a.heightCm - 5 * a.age
  return base + (a.sex === 'male' ? 5 : -161)
}

export function suggestTargets(a: HelperAnswers): Suggestion {
  const maintenance = restingCalories(a) * ACTIVITY[a.activity].factor
  const wanted = a.goal === 'lose' ? -PACE_KCAL[a.pace] : a.goal === 'gain' ? PACE_KCAL[a.pace] : 0
  const floor = CALORIE_FLOOR[a.sex]
  const target = Math.max(floor, maintenance + wanted)
  const raisedToFloor = a.goal === 'lose' && maintenance + wanted < floor

  const kcal = Math.round(target / 10) * 10
  const protein = Math.round(Math.min(PROTEIN_PER_KG[a.goal] * a.weightKg, (kcal * MAX_PROTEIN_SHARE) / 4))
  const fat = Math.round((kcal * FAT_SHARE) / 9)
  const carbs = Math.max(0, Math.round((kcal - 4 * protein - 9 * fat) / 4))
  // Report calories that match the grams exactly, so the fields agree with each other.
  const calories = 4 * protein + 4 * carbs + 9 * fat
  const adjustment = calories - Math.round(maintenance)
  return { maintenance: Math.round(maintenance), calories, protein, carbs, fat, adjustment, weeklyKg: (adjustment * 7) / KCAL_PER_KG, raisedToFloor }
}

export interface Problem { field: 'weight' | 'height' | 'age'; message: string }

/** Sensible limits, so a typo (or a child) doesn't get a made-up plan. */
export function checkAnswers(a: { weightKg: number; heightCm: number; age: number }): Problem | null {
  if (!(a.weightKg >= 30 && a.weightKg <= 300)) return { field: 'weight', message: 'Enter a weight between 66 and 660 lb (30–300 kg).' }
  if (!(a.heightCm >= 120 && a.heightCm <= 230)) return { field: 'height', message: 'Enter a height between 4 ft and 7 ft 6 in (120–230 cm).' }
  if (!(a.age >= 18 && a.age <= 100)) return { field: 'age', message: 'This helper is for adults (18–100). Younger people need advice from a doctor or dietitian.' }
  return null
}

/** Why the goal weight doesn't fit the goal (losing needs a lower weight than now, gaining a higher one), or null. */
export function checkGoalWeight(weightKg: number, goal: Goal, goalWeightKg: number): string | null {
  if (goal === 'maintain') return null
  if (!(goalWeightKg >= 30 && goalWeightKg <= 300)) return 'Enter a goal weight between 66 and 660 lb (30–300 kg).'
  if (goal === 'lose' && goalWeightKg >= weightKg) return 'To lose weight, your goal weight needs to be lower than your weight now.'
  if (goal === 'gain' && goalWeightKg <= weightKg) return 'To gain weight, your goal weight needs to be higher than your weight now.'
  return null
}

/** Weeks to get from `weightKg` to `goalWeightKg` at `weeklyKg` a week (either sign), or null if it isn't moving that way. */
export function weeksToGoal(weightKg: number, goalWeightKg: number, weeklyKg: number): number | null {
  const need = goalWeightKg - weightKg
  if (!(Math.abs(weeklyKg) > 0.01) || Math.sign(need) !== Math.sign(weeklyKg)) return null
  return Math.ceil(need / weeklyKg - 1e-9) // the tolerance stops 2.0000000000000004 becoming 3
}

/** Weeks at one of the standard paces, without any safety floor applied (used to compare the pace options). */
export function weeksAtPace(weightKg: number, goalWeightKg: number, goal: Goal, pace: Pace): number | null {
  const perDay = goal === 'lose' ? -PACE_KCAL[pace] : PACE_KCAL[pace]
  return weeksToGoal(weightKg, goalWeightKg, (perDay * 7) / KCAL_PER_KG)
}
