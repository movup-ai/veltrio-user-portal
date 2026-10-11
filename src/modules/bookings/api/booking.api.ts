import { apiClient } from '@/services/api/client'
import { locationApi } from '@/modules/locations/api/location.api'
import { vehicleApi } from '@/modules/vehicles/api/vehicle.api'
import {
  ExportTooLargeError,
  MAX_BOOKING_PAGES,
  MAX_PAGE_SIZE,
  fetchEveryPage,
  toPaginatedResult,
  type ListEnvelope,
} from '@/lib/pagination'
import type {
  BookingFilters,
  BookingInput,
  ConditionInput,
  CancelInput,
  DeclineInput,
  RenterAnswer,
} from '../types/booking.types'
import { buildBookingDetails } from '../utils/booking.details'
import { bookingToTuple } from '../utils/booking.utils'
import {
  toBooking,
  toBookingFilterQuery,
  toBookingListQuery,
  toBookingLists,
  toBookingPayload,
  toBookingStats,
  toConditionPayload,
  toCancelPayload,
  toCancelledBooking,
  toDeclinePayload,
  toInterval,
  toNotifiedBooking,
  toTabCounts,
  type BookedIntervalWire,
  type BookingListParams,
  type BookingCancelledWire,
  type BookingNotifiedWire,
  type BookingStatsWire,
  type BookingTabCountsWire,
  type BookingWire,
} from './booking.mapper'

export { ExportTooLargeError }

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
      params: { limit: MAX_PAGE_SIZE, offset: 0 },
    })
    const wires = [...first.data.items]

    const pages = Math.min(Math.ceil(first.data.total / MAX_PAGE_SIZE), MAX_BOOKING_PAGES)
    for (let page = 1; page < pages; page++) {
      const next = await apiClient.get<ListEnvelope<BookingWire>>('/bookings', {
        params: { limit: MAX_PAGE_SIZE, offset: page * MAX_PAGE_SIZE },
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

  /** Accepts a renter's own reservation. Refused when another booking took the dates meanwhile. */
  confirm: (reference: string) =>
    apiClient.post<BookingWire>(`/bookings/${reference}/confirm`).then((r) => toBooking(r.data)),

  /** Says who made a request whose details differ from the customer on file. */
  settleRenter: (reference: string, answer: RenterAnswer, allowSharedLicence = false) =>
    apiClient
      .post<BookingWire>(`/bookings/${reference}/renter`, { ...answer, allowSharedLicence })
      .then((r) => toBooking(r.data)),

  /** Withdraws a payment link nobody paid. Refused once money is taken or held on the booking. */
  decline: (reference: string, input: DeclineInput) =>
    apiClient
      .post<BookingNotifiedWire>(`/bookings/${reference}/decline`, toDeclinePayload(input))
      .then((r) => toNotifiedBooking(r.data)),

  /** Cancels before pickup: links withdrawn, the deposit released, the rest above `keep` refunded. */
  cancel: (reference: string, input: CancelInput) =>
    apiClient
      .post<BookingCancelledWire>(`/bookings/${reference}/cancel`, toCancelPayload(input))
      .then((r) => toCancelledBooking(r.data)),

  /** Undoes a decline: pending again, not accepted. Refused once the pickup time has passed. */
  restore: (reference: string) =>
    apiClient
      .post<BookingNotifiedWire>(`/bookings/${reference}/restore`)
      .then((r) => toNotifiedBooking(r.data)),

  /** Refused until the booking is fully paid: the rental settled and the deposit held. */
  pickUp: (reference: string, input: ConditionInput) =>
    apiClient
      .post<BookingWire>(`/bookings/${reference}/pick-up`, toConditionPayload(input))
      .then((r) => toBooking(r.data)),

  /** Refused when the odometer reads less than it did at pickup. */
  returnVehicle: (reference: string, input: ConditionInput) =>
    apiClient
      .post<BookingWire>(`/bookings/${reference}/return`, toConditionPayload(input))
      .then((r) => toBooking(r.data)),

  /** The last step, once the car is back. Refused while a deposit is still held. */
  close: (reference: string) =>
    apiClient.post<BookingWire>(`/bookings/${reference}/close`).then((r) => toBooking(r.data)),

  /**
   * One filtered, sorted page — what the bookings table renders. The server does the narrowing,
   * so the browser never holds more than the rows on screen.
   */
  page: (params: BookingListParams) =>
    apiClient.get<ListEnvelope<BookingWire>>('/bookings', { params: toBookingListQuery(params) }).then((r) =>
      toPaginatedResult(r.data.items.map(toBooking).map(bookingToTuple), r.data.total, {
        page: params.page,
        pageSize: params.pageSize,
      }),
    ),

  /**
   * Every row matching the filters, for the CSV — not just the page on screen.
   */
  exportAll: (params: Omit<BookingListParams, 'page' | 'pageSize'>) =>
    fetchEveryPage((page) => bookingApi.page({ ...params, ...page }), MAX_BOOKING_PAGES),

  /** Headline totals for the whole book — not narrowed by the list's filters. */
  stats: () => apiClient.get<BookingStatsWire>('/bookings/stats').then((r) => toBookingStats(r.data)),

  /** What each tab would show under the filters already applied. */
  tabCounts: (filters: BookingFilters) =>
    apiClient
      .get<BookingTabCountsWire>('/bookings/tab-counts', { params: toBookingFilterQuery(filters) })
      .then((r) => toTabCounts(r.data)),

  /** Every live booking touching the window — what the form greys taken vehicles out with. */
  schedule: (from: string, to: string) =>
    apiClient
      .get<BookedIntervalWire[]>('/bookings/schedule', { params: { from, to } })
      .then((r) => r.data.map(toInterval)),
}
