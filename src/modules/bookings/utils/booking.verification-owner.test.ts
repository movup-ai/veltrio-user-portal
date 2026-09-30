import { describe, expect, it } from 'vitest'
import { verificationForRenter } from './booking.verification'
import type { BookingVerification } from '../types/booking.types'

function verification(id: string): BookingVerification {
  return {
    id,
    status: 'clear',
    recordsFound: false,
    hasReport: true,
    canReorder: true,
    reused: false,
    completedAt: '2026-09-28T10:00:00Z',
    createdAt: '2026-09-28T10:00:00Z',
    updatedAt: '2026-09-28T10:00:00Z',
  }
}

const RAN = { email: 'a@example.com', verification: verification('for-a') }

describe('a check run in the form', () => {
  it('shows for the renter it was ordered for', () => {
    expect(verificationForRenter(undefined, RAN, 'a@example.com')?.id).toBe('for-a')
  })

  it('does not follow the form to a different renter', () => {
    // Switching to an unscreened renter left the previous one's verdict on the card while
    // View report fetched the new renter's — two people's results on one screen.
    expect(verificationForRenter(undefined, RAN, 'b@example.com')).toBeUndefined()
  })

  it('ignores case and whitespace, as the lookup does', () => {
    expect(verificationForRenter(undefined, RAN, '  A@Example.com ')?.id).toBe('for-a')
  })

  it('prefers the saved result for that renter over the one run here', () => {
    const saved = verification('saved')

    expect(verificationForRenter(saved, RAN, 'a@example.com')?.id).toBe('saved')
  })
})
