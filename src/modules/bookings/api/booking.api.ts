import { apiClient } from '@/services/api/client'
import type { ListEnvelope } from '@/lib/pagination'
import type { BookingInput } from '../types/booking.types'
import { buildBookingDetails } from '../utils/booking.details'
import { bookingToTuple } from '../utils/booking.utils'
import {
  toBooking,
  toBookingLists,
  toBookingPayload,
  toInterval,
  type BookedIntervalWire,
  type BookingWire,
} from './booking.mapper'

/**
 * The list page filters, sorts and tabs client-side, so it needs the whole book of business
 * — and the endpoint pages at 100. Enough for now; the page moves to server-side filtering
 * when a tenant outgrows it.
 */
const LIST_PAGE_SIZE = 100

/**
 * The FastAPI /bookings endpoints. Wire shapes are translated in booking.mapper.ts — nothing
 * above this file sees the API's format.
 */
export const bookingApi = {
  list: () =>
    apiClient
      .get<ListEnvelope<BookingWire>>('/bookings', { params: { limit: LIST_PAGE_SIZE, offset: 0 } })
      .then((r) => toBookingLists(r.data.items.map(toBooking))),

  /**
   * The details page still reads the mock-era shape: the API's booking is passed through
   * `buildBookingDetails`, which keeps the drivers, fees and renter exact and derives the
   * timeline, payment and audit trail — those have no endpoints yet.
   */
  detail: (reference: string) =>
    apiClient.get<BookingWire>(`/bookings/${reference}`).then((r) => {
      const booking = toBooking(r.data)
      return buildBookingDetails(bookingToTuple(booking), booking)
    }),

  create: (input: BookingInput) =>
    apiClient.post<BookingWire>('/bookings', toBookingPayload(input)).then((r) => toBooking(r.data)),

  /** Every live booking touching the window — what the form greys taken vehicles out with. */
  schedule: (from: string, to: string) =>
    apiClient
      .get<BookedIntervalWire[]>('/bookings/schedule', { params: { from, to } })
      .then((r) => r.data.map(toInterval)),
}
