import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('keeps a type-scale size beside a text colour', () => {
    // Filled buttons lost `text-label` this way and rendered larger than outline ones.
    expect(cn('text-label', 'text-primary-foreground')).toBe('text-label text-primary-foreground')
  })

  it('still lets a later size replace an earlier one', () => {
    expect(cn('text-label', 'text-caption')).toBe('text-caption')
  })
})
