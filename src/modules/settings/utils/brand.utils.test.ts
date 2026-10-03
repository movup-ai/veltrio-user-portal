import { describe, expect, it } from 'vitest'
import { isHexColor, readableOn } from './brand.utils'

describe('isHexColor', () => {
  it('takes #RRGGBB in either case, and nothing shorter or named', () => {
    expect(isHexColor('#0f766e')).toBe(true)
    expect(isHexColor(' #0F766E ')).toBe(true)
    expect(isHexColor('#0F7')).toBe(false)
    expect(isHexColor('teal')).toBe(false)
  })
})

describe('readableOn', () => {
  it('labels a dark button in white and a light one in near-black', () => {
    expect(readableOn('#0F766E')).toBe('#FFFFFF')
    expect(readableOn('#FACC15')).toBe('#111827')
  })

  it('switches where white stops being the better label', () => {
    // Mid-grey sits near the crossover: #777777 still reads better in white, #888888 in near-black.
    expect(readableOn('#777777')).toBe('#FFFFFF')
    expect(readableOn('#888888')).toBe('#111827')
  })
})
