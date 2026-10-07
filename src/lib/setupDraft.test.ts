import { beforeEach, describe, expect, it } from 'vitest'
import { addTerms, clearDraft, draftToPrefs, emptyDraft, loadDraft, mealBreakdown, prefsToDraft, previewNames, saveDraft, setupPath, splitList, summaryCards } from './setupDraft'

// Node has no sessionStorage; a tiny stand-in lets the persistence helpers run.
const store = new Map<string, string>()
;(globalThis as unknown as { sessionStorage: Storage }).sessionStorage = {
  getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(), key: () => null, length: 0,
} as Storage

describe('splitList / addTerms', () => {
  it('splits on commas, semicolons and newlines, keeps case, trims and drops blanks, repeats and single letters', () => {
    expect(splitList(' Chicken, spinach ;Rice\n chicken , a, ,')).toEqual(['Chicken', 'spinach', 'Rice'])
  })
  it('adds typed or pasted items without duplicating', () => {
    expect(addTerms(['Chicken'], 'rice, chicken, Beans')).toEqual(['Chicken', 'rice', 'Beans'])
    expect(addTerms(['Chicken'], '   ')).toEqual(['Chicken'])
  })
})

describe('draft <-> saved preferences', () => {
  it('round-trips through the comma-separated text a plan stores', () => {
    const d = { ...emptyDraft(), have: ['Chicken', 'Spinach'], dislikes: ['Cilantro'], diets: ['vegan' as const] }
    const prefs = draftToPrefs(d)
    expect(prefs).toEqual({ have: 'Chicken, Spinach', dislikes: 'Cilantro', diets: ['vegan'] })
    expect(prefsToDraft(d.counts, prefs)).toEqual(d)
  })
  it('drops a diet that no longer exists on an old plan', () => {
    const d = prefsToDraft(emptyDraft().counts, { have: '', dislikes: '', diets: ['vegan', 'meat_only'] as never })
    expect(d.diets).toEqual(['vegan'])
  })
})

describe('draft persistence', () => {
  beforeEach(() => store.clear())
  it('saves, reloads and clears a draft', () => {
    const d = { ...emptyDraft(), have: ['Rice'], counts: { breakfast: 0, lunch: 2, dinner: 1, snack: 0 } }
    saveDraft('new', d)
    expect(loadDraft('new')).toEqual(d)
    expect(loadDraft('other-plan')).toBeNull()
    clearDraft('new')
    expect(loadDraft('new')).toBeNull()
  })
  it('ignores a corrupted draft', () => {
    store.set('meal-prep:setup-draft:new', '{not json')
    expect(loadDraft('new')).toBeNull()
    store.set('meal-prep:setup-draft:new', JSON.stringify({ have: 5 }))
    expect(loadDraft('new')).toBeNull()
  })
})

describe('previewNames', () => {
  it('shows the first two, then how many more', () => {
    expect(previewNames(['turkey'])).toBe('turkey')
    expect(previewNames(['turkey', 'spinach'])).toBe('turkey, spinach')
    expect(previewNames(['turkey', 'spinach', 'rice', 'beans'])).toBe('turkey, spinach +2 more')
    expect(previewNames(['a1', 'b2', 'c3'])).toBe('a1, b2 +1 more')
  })
})

describe('mealBreakdown', () => {
  it('lists each meal type that has recipes, in the order of the day, with correct plurals', () => {
    expect(mealBreakdown({ breakfast: 0, lunch: 1, dinner: 1, snack: 0 })).toBe('1 lunch · 1 dinner')
    expect(mealBreakdown({ breakfast: 2, lunch: 2, dinner: 1, snack: 3 })).toBe('2 breakfasts · 2 lunches · 1 dinner · 3 snacks')
  })
  it('is null when nothing is chosen', () => expect(mealBreakdown({ breakfast: 0, lunch: 0, dinner: 0, snack: 0 })).toBeNull())
})

describe('summaryCards', () => {
  const base = { ...emptyDraft(), counts: { breakfast: 0, lunch: 1, dinner: 1, snack: 0 } }
  it('matches the example: 4 recipes becomes 2, with the meal breakdown and the pantry names', () => {
    const c = summaryCards({ ...base, have: ['turkey', 'spinach'] })
    expect(c.recipes).toEqual({ primary: '2 recipes', secondary: '1 lunch · 1 dinner' })
    expect(c.pantry).toEqual({ primary: '2 pantry ingredients', secondary: 'turkey, spinach' })
  })
  it('has no second line when there is nothing to list', () => {
    const c = summaryCards(base)
    expect(c.pantry).toEqual({ primary: 'No pantry ingredients', secondary: null })
    expect(c.excluded).toEqual({ primary: 'No foods excluded', secondary: null })
    expect(c.diets).toEqual({ primary: 'No dietary preferences', secondary: null })
  })
  it('truncates long lists gracefully and uses the singular for one', () => {
    const c = summaryCards({ ...base, have: ['turkey', 'spinach', 'rice', 'beans'], dislikes: ['cilantro'] })
    expect(c.pantry.secondary).toBe('turkey, spinach +2 more')
    expect(c.excluded).toEqual({ primary: '1 food excluded', secondary: 'cilantro' })
    expect(summaryCards({ ...base, dislikes: ['cilantro', 'mushrooms'] }).excluded).toEqual({ primary: '2 foods excluded', secondary: 'cilantro, mushrooms' })
  })
  it('joins one or two diets, and falls back to a count for three', () => {
    expect(summaryCards({ ...base, diets: ['pescatarian'] }).diets).toEqual({ primary: 'Pescatarian', secondary: null })
    expect(summaryCards({ ...base, diets: ['pescatarian', 'dairy_free'] }).diets).toEqual({ primary: 'Pescatarian · Dairy-free', secondary: null })
    expect(summaryCards({ ...base, diets: ['pescatarian', 'dairy_free', 'gluten_free'] }).diets)
      .toEqual({ primary: '3 dietary preferences', secondary: 'Pescatarian, Dairy-free +1 more' })
  })
  it('says 0 recipes with no breakdown when nothing is chosen', () => {
    expect(summaryCards(emptyDraft()).recipes).toEqual({ primary: '0 recipes', secondary: null })
  })
})

describe('setupPath', () => {
  it('keeps the plan being edited in the link', () => {
    expect(setupPath('diet')).toBe('/plan/setup/diet')
    expect(setupPath('avoid', 'abc-123')).toBe('/plan/setup/avoid?plan=abc-123')
  })
})
