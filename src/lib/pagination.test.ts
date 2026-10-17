import { describe, expect, it } from 'vitest'
import { pageBackTo, toPaginatedResult } from './pagination'

describe('pageBackTo', () => {
  it('sends a page that emptied under it back to the last page with rows', () => {
    // Page 3 of 10-per-page was asked for, and 14 rows remain: the last page is now 2.
    expect(pageBackTo(3, toPaginatedResult([], 14, { page: 3, pageSize: 10 }))).toBe(2)
  })

  it('leaves alone a page that has rows, and a list that is simply empty', () => {
    expect(pageBackTo(2, toPaginatedResult(['row'], 11, { page: 2, pageSize: 10 }))).toBeUndefined()
    expect(pageBackTo(1, toPaginatedResult([], 0, { page: 1, pageSize: 10 }))).toBeUndefined()
  })
})
