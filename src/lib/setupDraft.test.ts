import { beforeEach, describe, expect, it } from 'vitest'
import { addTerms, clearDraft, draftToPrefs, emptyDraft, loadDraft, prefsToDraft, saveDraft, setupPath, setupSummary, splitList } from './setupDraft'

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

describe('setupSummary / setupPath', () => {
  it('summarises with correct plurals', () => {
    const d = { counts: { breakfast: 0, lunch: 1, dinner: 1, snack: 0 }, have: ['A1', 'B2', 'C3'], dislikes: ['X1'], diets: ['vegan' as const, 'gluten_free' as const] }
    expect(setupSummary(d)).toEqual(['2 recipes', '3 pantry ingredients', '1 food excluded', 'Vegan, Gluten-free'])
    expect(setupSummary(emptyDraft())).toEqual(['0 recipes', 'No pantry ingredients', 'No foods excluded'])
  })
  it('keeps the plan being edited in the link', () => {
    expect(setupPath('diet')).toBe('/plan/setup/diet')
    expect(setupPath('avoid', 'abc-123')).toBe('/plan/setup/avoid?plan=abc-123')
  })
})
