import { describe, expect, it } from 'vitest'
import { fitWithin, MAX_EDGE } from './image'

describe('fitWithin', () => {
  it('shrinks the longest side to the limit and keeps the shape', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: MAX_EDGE, height: 900 })
    expect(fitWithin(3024, 4032)).toEqual({ width: 900, height: MAX_EDGE })
  })
  it('never enlarges a small picture', () => {
    expect(fitWithin(640, 480)).toEqual({ width: 640, height: 480 })
  })
  it('never collapses a very thin picture to nothing', () => {
    expect(fitWithin(6000, 2).height).toBe(1)
  })
})
