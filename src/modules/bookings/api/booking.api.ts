import { apiClient } from '@/services/api/client'
import { mockDelay, useMocks } from '@/lib/mock'
import { BOOKINGS_RECENT, BOOKINGS_UPCOMING } from '../mock/booking.mock'
import type { Booking, BookingInput, BookingLists, BookingTuple } from '../types/booking.types'
import { bookingToTuple } from '../utils/booking.utils'

/**
 * Bookings created this session, newest first. The seed sets stay immutable — a new booking is
 * prepended to "upcoming" as a tuple so the list renders it exactly like a seeded one.
 */
let created: Booking[] = []

/** Seed references run to BK-48228; start clear of them so a new booking never collides. */
let nextReferenceNumber = 48230

function nextReference(): string {
  return `BK-${nextReferenceNumber++}`
}

function mockList(): BookingLists {
  const createdTuples: BookingTuple[] = created.map(bookingToTuple)
  return { upcoming: [...createdTuples, ...BOOKINGS_UPCOMING], recent: BOOKINGS_RECENT }
}

/**
 * Thin wrapper around the not-yet-built FastAPI bookings endpoints. Mock-backed writes live in
 * memory (gated by VITE_USE_MOCKS, see .env.example) so the module is explorable before the
 * backend exists — swap this out once /bookings is live.
 */
export const bookingApi = {
  list: () => {
    if (useMocks) return mockDelay(mockList())
    return apiClient.get<BookingLists>('/bookings').then((r) => r.data)
  },

  create: (input: BookingInput) => {
    if (useMocks) {
      // Every new booking starts unconfirmed: the deposit hasn't been taken yet.
      const booking: Booking = {
        ...input,
        reference: nextReference(),
        status: 'Deposit due',
        createdAt: new Date().toISOString(),
      }
      created = [booking, ...created]
      return mockDelay(booking)
    }
    return apiClient.post<Booking>('/bookings', input).then((r) => r.data)
  },
}
