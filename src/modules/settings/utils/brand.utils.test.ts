import { describe, expect, it } from 'vitest'
import type { Brand } from '../types/brand.types'
import { isHexColor, mergeBrand, readableOn } from './brand.utils'

describe('mergeBrand', () => {
  const current: Brand = { primaryColor: '#E11D48', backgroundColor: '#FFFFFF', textColor: '#111827' }

  it('takes only what the mutation changed, so a late answer cannot undo a newer save', () => {
    // An upload that began before the colour was saved answers with the old colour.
    const late: Brand = { ...current, primaryColor: '#0F766E', logoUrl: 'https://media.example/logo.webp' }

    expect(mergeBrand(current, late, ['logoUrl'])).toEqual({ ...current, logoUrl: 'https://media.example/logo.webp' })
  })

  it('clears a removed image, which arrives as an absent field', () => {
    const withLogo = { ...current, logoUrl: 'https://media.example/logo.webp' }

    expect(mergeBrand(withLogo, current, ['logoUrl']).logoUrl).toBeUndefined()
  })

  it('takes the whole response when nothing is cached yet', () => {
    expect(mergeBrand(undefined, current, ['logoUrl'])).toBe(current)
  })
})

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
