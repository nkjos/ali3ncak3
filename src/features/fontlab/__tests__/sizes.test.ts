import { describe, expect, it } from 'vitest'
import { DEFAULT_SIZE_ID, LAB_SIZES, SIZE_STEP, labSize, sizePercent } from '../sizes'

describe('font lab size presets', () => {
  it('offers eight sizes, smallest to largest', () => {
    expect(LAB_SIZES.map((s) => s.id)).toEqual([
      'xxsmall', 'xsmall', 'small', 'medium', 'large', 'xl', 'xxl', 'xxxl',
    ])
  })

  it('medium is the default and the designed size', () => {
    expect(DEFAULT_SIZE_ID).toBe('medium')
    expect(labSize(DEFAULT_SIZE_ID).scale).toBe(1)
  })

  it('every step changes text by exactly 5% of the designed size', () => {
    expect(LAB_SIZES.map(sizePercent)).toEqual([85, 90, 95, 100, 105, 110, 115, 120])
    for (let i = 1; i < LAB_SIZES.length; i++) {
      expect(LAB_SIZES[i].scale - LAB_SIZES[i - 1].scale).toBeCloseTo(SIZE_STEP, 10)
    }
  })

  it('unknown or missing saved values fall back to medium', () => {
    for (const bad of [null, undefined, '', 'huge', 3, { id: 'xl' }]) {
      expect(labSize(bad).id).toBe('medium')
    }
    expect(labSize('xxxl').scale).toBe(1.2)
  })
})
