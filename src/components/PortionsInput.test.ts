import { describe, expect, it } from 'vitest'
import { clampPortions, MAX_PORTIONS, parsePortions } from './PortionsInput'

describe('portions input parsing', () => {
  it('clamps to whole portions between 1 and the maximum', () => {
    expect(clampPortions(0)).toBe(1)
    expect(clampPortions(-5)).toBe(1)
    expect(clampPortions(7.6)).toBe(8)
    expect(clampPortions(1000)).toBe(MAX_PORTIONS)
  })
  it('parses typed text, tolerating spaces', () => {
    expect(parsePortions('12')).toBe(12)
    expect(parsePortions(' 6 ')).toBe(6)
    expect(parsePortions('0')).toBe(1)
    expect(parsePortions('99')).toBe(MAX_PORTIONS)
  })
  it('rejects text that is not a number', () => {
    expect(parsePortions('')).toBeNull()
    expect(parsePortions('   ')).toBeNull()
    expect(parsePortions('abc')).toBeNull()
  })
})
