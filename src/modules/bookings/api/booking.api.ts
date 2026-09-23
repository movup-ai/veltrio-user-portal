import { apiClient } from '@/services/api/client'
import { locationApi } from '@/modules/locations/api/location.api'
import { vehicleApi } from '@/modules/vehicles/api/vehicle.api'
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

/** The most `GET /bookings` will return in one call; asking for more is a 422. */
const LIST_PAGE_SIZE = 100

/**
 * Stops a runaway loop from hammering the API if `total` were ever wrong. 50 pages is 5,000
 * bookings — far past where this page should have moved to server-side filtering anyway.
 */
const MAX_LIST_PAGES = 50

/**
 * The FastAPI /bookings endpoints. Wire shapes are translated in booking.mapper.ts — nothing
 * above this file sees the API's format.
 */
export const bookingApi = {
  /**
   * Every booking, not just the first page: the list filters, sorts and exports client-side,
   * so a partial set would silently drop rows from the table, stats and CSV. Sequential
   * because the first response is what says how many pages there are — the reason to move
   * filtering server-side once a tenant's book grows.
   */
  list: async () => {
    const first = await apiClient.get<ListEnvelope<BookingWire>>('/bookings', {
      params: { limit: LIST_PAGE_SIZE, offset: 0 },
    })
    const wires = [...first.data.items]

    const pages = Math.min(Math.ceil(first.data.total / LIST_PAGE_SIZE), MAX_LIST_PAGES)
    for (let page = 1; page < pages; page++) {
      const next = await apiClient.get<ListEnvelope<BookingWire>>('/bookings', {
        params: { limit: LIST_PAGE_SIZE, offset: page * LIST_PAGE_SIZE },
      })
      wires.push(...next.data.items)
    }

    return toBookingLists(wires.map(toBooking))
  },

  /**
   * The details page still reads the mock-era shape: the API's booking is passed through
   * `buildBookingDetails`, which keeps the drivers, fees and renter exact and derives the
   * timeline, payment and audit trail — those have no endpoints yet.
   *
   * The vehicle and the branch are fetched alongside it. Without them the page fell back to
   * the mock seeds, so a real car showed no photo and a real branch no address or agent — the
   * live data was there to be asked for, just never asked for.
   */
  detail: async (reference: string) => {
    const response = await apiClient.get<BookingWire>(`/bookings/${reference}`)
    const booking = toBooking(response.data)

    // Neither is worth failing the page over: the details still render without them, so a
    // missing vehicle (deleted) or a failed branch lookup degrades rather than throws.
    const [vehicle, branches] = await Promise.all([
      booking.vehicleId
        ? vehicleApi.get(booking.vehicleId).catch(() => undefined)
        : Promise.resolve(undefined),
      locationApi.list('name').catch(() => []),
    ])

    return buildBookingDetails(bookingToTuple(booking), booking, {
      vehicle,
      branch: branches.find((b) => b.name === booking.pickupLocation),
    })
  },

  create: (input: BookingInput) =>
    apiClient.post<BookingWire>('/bookings', toBookingPayload(input)).then((r) => toBooking(r.data)),

  /** Every live booking touching the window — what the form greys taken vehicles out with. */
  schedule: (from: string, to: string) =>
    apiClient
      .get<BookedIntervalWire[]>('/bookings/schedule', { params: { from, to } })
      .then((r) => r.data.map(toInterval)),
}
