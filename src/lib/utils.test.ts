import { describe, expect, it } from 'vitest'
import { cn, moveItem } from './utils'

describe('cn', () => {
  it('keeps a type-scale size beside a text colour', () => {
    // Filled buttons lost `text-label` this way and rendered larger than outline ones.
    expect(cn('text-label', 'text-primary-foreground')).toBe('text-label text-primary-foreground')
  })

  it('still lets a later size replace an earlier one', () => {
    expect(cn('text-label', 'text-caption')).toBe('text-caption')
  })
})

describe('moveItem', () => {
  it('moves an item down, shifting the ones it passes up', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('moves an item up, shifting the ones it passes down', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('leaves the order alone for an index outside the list', () => {
    // A stale drag index would otherwise splice in `undefined`.
    expect(moveItem(['a', 'b'], 0, 5)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], -1, 0)).toEqual(['a', 'b'])
  })
})
