import { describe, expect, it } from 'vitest'
import { ApiError } from '@/types/api'
import { isStaleMembership } from './stale-membership'

describe('isStaleMembership', () => {
  it('holds for a role taken away and for a removal', () => {
    expect(isStaleMembership(new ApiError('forbidden', '', { code: 'insufficient_role' }))).toBe(true)
    expect(isStaleMembership(new ApiError('not_found', '', { code: 'tenant_not_found' }))).toBe(true)
  })

  it('ignores every other failure, including the account not being set up', () => {
    expect(isStaleMembership(new ApiError('forbidden', '', { code: 'user_not_onboarded' }))).toBe(false)
    expect(isStaleMembership(new ApiError('not_found', '', { code: 'booking_not_found' }))).toBe(false)
    expect(isStaleMembership(new Error('boom'))).toBe(false)
  })
})
