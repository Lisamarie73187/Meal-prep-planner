import { describe, expect, it } from 'vitest'
import { canSizeOf, convertPerAmount, formatAmount, formatBuy, unitBasis, formatNumber, formatPortion, fromBase, roundBase, toBase, unitsFor } from './units'
import { chicken, egg, mk, oil, rice } from './testData'

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
    expect(formatAmount(437, mk({ name: 'Tofu' })).text).toBe('435 g')
    expect(formatAmount(437, mk({ name: 'Tofu' }), 'up').text).toBe('450 g')
    expect(formatAmount(1250, mk({ name: 'Tofu' })).text).toBe('1.25 kg')
    expect(formatAmount(2.2, egg, 'up').text).toBe('3')
    expect(formatAmount(6, { base_unit: 'g', density_g_per_ml: 0.4 }).text).toBe('1 tbsp')
    expect(roundBase(437, mk({ name: 'Tofu' }))).toBe(435)
  })
  it('formats fractions', () => {
    expect(formatNumber(1.5)).toBe('1½')
    expect(formatNumber(0.25)).toBe('¼')
    expect(formatNumber(3)).toBe('3')
  })
  it('adds a cup hint for dry ingredients', () => {
    expect(formatPortion(190, rice)).toBe('190 g (≈ 1 cup)')
    expect(formatPortion(150, mk({ name: 'Tofu' }))).toBe('150 g')
  })
})

describe('formatBuy', () => {
  const named = (name: string, base_unit: 'g' | 'ml' = 'g') => mk({ name, base_unit })
  it('gives a whole-item count for things you buy by the piece, with the weight as a hint', () => {
    expect(formatBuy(300, named('Bell pepper'))).toEqual({ text: '2', hint: '≈ 300 g' })
    expect(formatBuy(540, named('Chicken breast')).text).toBe('3')
    expect(formatBuy(500, named('Sweet potato')).text).toBe('3')
  })
  it('rounds up so you never buy short, but not for a gram or two over', () => {
    expect(formatBuy(40, named('Bell pepper')).text).toBe('1')
    expect(formatBuy(190, named('Onion')).text).toBe('2')
    expect(formatBuy(152, named('Onion')).text).toBe('1')
  })
  it('adds a noun where the name would not read right after a number', () => {
    expect(formatBuy(90, named('Lemon juice', 'ml')).text).toBe('2 lemons')
    expect(formatBuy(40, named('Lemon juice', 'ml')).text).toBe('1 lemon')
    expect(formatBuy(600, named('Broccoli')).text).toBe('2 heads')
  })
  it('keeps a measured amount for anything without a typical size, or in a different unit', () => {
    expect(formatBuy(200, named('Spinach'))).toEqual({ text: '200 g' })
    expect(formatBuy(6, egg).text).toBe('6')
    expect(formatBuy(300, named('Bell pepper', 'ml')).hint).toBeUndefined()
  })
})

describe('counting items stored by weight', () => {
  const pepper = mk({ name: 'Bell pepper' })
  const spinach = mk({ name: 'Spinach' })
  it('offers "each" only for things with a typical size', () => {
    expect(unitsFor(pepper)).toContain('each')
    expect(unitsFor(spinach)).not.toContain('each')
    expect(unitsFor(egg)).toEqual(['each'])
  })
  it('converts between items and grams both ways', () => {
    expect(toBase(2, 'each', pepper)).toBe(300)
    expect(fromBase(300, 'each', pepper)).toBe(2)
    expect(fromBase(75, 'each', pepper)).toBe(0.5)
  })
  it('leaves eggs, which are already counted, alone', () => {
    expect(toBase(6, 'each', egg)).toBe(6)
    expect(fromBase(6, 'each', egg)).toBe(6)
  })
  it('lemon juice counts in lemons', () => {
    const juice = mk({ name: 'Lemon juice', base_unit: 'ml' })
    expect(toBase(2, 'each', juice)).toBe(90)
  })
})

describe('unitBasis', () => {
  it('uses label-style amounts for grams and millilitres', () => {
    expect(unitBasis('g')).toEqual({ base: 'g', per: 100, perBase: 100, label: '100 g' })
    expect(unitBasis('ml')).toEqual({ base: 'ml', per: 100, perBase: 100, label: '100 ml' })
  })
  it('stores weights as grams and volumes as millilitres, with the amount converted', () => {
    expect(unitBasis('oz')).toMatchObject({ base: 'g', per: 1, label: '1 oz' })
    expect(unitBasis('oz').perBase).toBeCloseTo(28.3495, 3)
    expect(unitBasis('lb').perBase).toBeCloseTo(453.592, 2)
    expect(unitBasis('kg').perBase).toBe(1000)
    expect(unitBasis('cup')).toMatchObject({ base: 'ml', label: '1 cup' })
    expect(unitBasis('cup').perBase).toBeCloseTo(236.588, 2)
    expect(unitBasis('tbsp').perBase).toBeCloseTo(14.7868, 3)
    expect(unitBasis('tsp').perBase).toBeCloseTo(4.92892, 4)
  })
  it('counts stay counts', () => {
    expect(unitBasis('each')).toEqual({ base: 'each', per: 1, perBase: 1, label: '1 each' })
  })
})

describe('convertPerAmount', () => {
  it('weight to weight: 364 kcal per 100 g is about 103 kcal per ounce', () => {
    const [kcal] = convertPerAmount([364], 'g', 'oz', null)!
    expect(kcal).toBeCloseTo(103.2, 1)
    expect(convertPerAmount([364], 'g', 'kg', null)![0]).toBeCloseTo(3640, 5)
    expect(convertPerAmount([364], 'g', 'lb', null)![0]).toBeCloseTo(1651, 0)
  })
  it('volume to volume: 100 ml to a cup', () => {
    expect(convertPerAmount([100], 'ml', 'cup', null)![0]).toBeCloseTo(236.588, 2)
    expect(convertPerAmount([100], 'ml', 'tsp', null)![0]).toBeCloseTo(4.929, 2)
  })
  it('weight to volume uses the density (grams per ml)', () => {
    // 100 g of something at 0.5 g/ml: one cup (236.588 ml) weighs 118.294 g, so 118.294 g worth of the numbers
    expect(convertPerAmount([100], 'g', 'cup', 0.5)![0]).toBeCloseTo(118.294, 2)
    expect(convertPerAmount([118.294], 'cup', 'g', 0.5)![0]).toBeCloseTo(100, 2)
  })
  it('refuses weight <-> volume without a density, and anything involving counts', () => {
    expect(convertPerAmount([100], 'g', 'cup', null)).toBeNull()
    expect(convertPerAmount([100], 'g', 'cup', 0)).toBeNull()
    expect(convertPerAmount([100], 'g', 'each', 0.5)).toBeNull()
    expect(convertPerAmount([100], 'each', 'g', 0.5)).toBeNull()
  })
  it('round trips', () => {
    const there = convertPerAmount([364, 19, 61], 'g', 'tbsp', 0.55)!
    const back = convertPerAmount(there, 'tbsp', 'g', 0.55)!
    back.forEach((v, i) => expect(v).toBeCloseTo([364, 19, 61][i], 6))
  })
})

describe('cans', () => {
  const beans = mk({ name: 'Black beans (canned, drained)' })
  const tomatoes = mk({ name: 'Canned diced tomatoes' })
  const coconut = mk({ name: 'Canned coconut milk', base_unit: 'ml' })
  it('offers "can" only for the canned foods we know the size of', () => {
    expect(unitsFor(beans)).toContain('can')
    expect(unitsFor(coconut)).toContain('can')
    expect(unitsFor(mk({ name: 'Spinach' }))).not.toContain('can')
    expect(unitsFor(egg)).not.toContain('can')
    expect(canSizeOf(beans)).toBe(255)
    expect(canSizeOf(mk({ name: 'Black beans (canned, drained)', base_unit: 'ml' }))).toBeNull() // size is for the weight
  })
  it('converts cans to grams or ml and back', () => {
    expect(toBase(2, 'can', beans)).toBe(510)
    expect(toBase(1, 'can', tomatoes)).toBe(411)
    expect(toBase(1, 'can', coconut)).toBe(400)
    expect(fromBase(510, 'can', beans)).toBe(2)
    expect(fromBase(200, 'can', coconut)).toBe(0.5)
  })
  it('a can of something with no known size is an error, not a silent guess', () => {
    expect(() => toBase(1, 'can', mk({ name: 'Spinach' }))).toThrow()
  })
  it('the grocery list buys canned foods in cans, rounding up', () => {
    expect(formatBuy(510, beans)).toEqual({ text: '2 cans', hint: '≈ 510 g' })
    expect(formatBuy(300, beans).text).toBe('2 cans')
    expect(formatBuy(100, beans).text).toBe('1 can')
    expect(formatBuy(800, coconut).text).toBe('2 cans')
  })
})

describe('meat is shown in ounces', () => {
  it('uses ounces instead of grams for meat (and fish)', () => {
    expect(formatAmount(113.4, chicken).text).toBe('4 oz')
    expect(formatAmount(437, chicken).text).toBe('15½ oz') // 15.41 oz, nearest quarter
    expect(formatAmount(1000, chicken).text).toBe('35¼ oz')
  })
  it('does not turn big amounts into pounds or kilograms, and leaves other foods alone', () => {
    expect(formatAmount(2268, chicken).text).toBe('80 oz')
    expect(formatAmount(2268, mk({ name: 'Rice' })).text).toBe('2.25 kg')
  })
  it('rounds up to a whole ounce when buying, and portions to a quarter', () => {
    expect(formatAmount(437, chicken, 'up').text).toBe('16 oz')
    expect(formatAmount(10, chicken).text).toBe('¼ oz')
  })
  it('only applies to meat stored by weight', () => {
    expect(formatAmount(437, mk({ name: 'Milk', base_unit: 'ml', store_section: 'meat' })).unit).not.toBe('oz')
    expect(formatAmount(437, mk({ name: 'Cheese', store_section: 'dairy' })).unit).toBe('g')
  })
  it('the amount box starts in ounces for meat and still converts both ways', () => {
    expect(toBase(4, 'oz', chicken)).toBeCloseTo(113.398, 2)
    expect(fromBase(113.398, 'oz', chicken)).toBeCloseTo(4, 3)
  })
})
