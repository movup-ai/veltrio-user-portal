import { describe, expect, it } from 'vitest'
import { contrastRatio, isHexColor, readableOn } from './brand.utils'

describe('isHexColor', () => {
  it('takes #RRGGBB in either case, and nothing shorter or named', () => {
    expect(isHexColor('#0f766e')).toBe(true)
    expect(isHexColor(' #0F766E ')).toBe(true)
    expect(isHexColor('#0F7')).toBe(false)
    expect(isHexColor('teal')).toBe(false)
  })
})

describe('contrastRatio', () => {
  it('matches WCAG at the extremes and is symmetric', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1)
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#777777'))
  })

  it('puts mid-grey on white just under the 4.5 body-text threshold', () => {
    // #777777 on white is the textbook near miss: 4.48:1.
    expect(contrastRatio('#777777', '#FFFFFF')).toBeLessThan(4.5)
    expect(contrastRatio('#767676', '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
  })
})

describe('readableOn', () => {
  it('labels a dark button in white and a light one in near-black', () => {
    expect(readableOn('#0F766E')).toBe('#FFFFFF')
    expect(readableOn('#FACC15')).toBe('#111827')
  })
})
