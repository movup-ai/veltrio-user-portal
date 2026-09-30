import { apiClient } from '@/services/api/client'
import { toLimitOffset, toPaginatedResult, type ListEnvelope } from '@/lib/pagination'
import type { PaginationParams } from '@/types/common'
import {
  toScreening,
  toScreeningListRow,
  type ScreeningListWire,
  type ScreeningOrder,
  type ScreeningWire,
  type StandaloneOrderWire,
} from './booking.mapper'

/**
 * Background checks on a booking. The renter's SSN and consent go to Checkr on its own hosted
 * form, so nothing regulated passes through these calls — only the check's state.
 */
export const screeningApi = {
  get: (reference: string) =>
    apiClient
      .get<ScreeningWire | null>(`/bookings/${reference}/screening`)
      .then((r) => (r.data ? toScreening(r.data) : undefined)),

  /**
   * The check that stands for this renter's next booking, read while one is still being
   * taken. Null once the last check is too old to be reused, matching what ordering would do.
   *
   * Keyed on email because that is what the API matches on when a check is ordered: the form
   * knows a typed-in renter by email before it knows their customer id, and looking them up
   * any other way let the card contradict the refusal ordering would give.
   */
  forEmail: (email: string) =>
    apiClient
      .get<ScreeningWire | null>('/customers/screening', { params: { email } })
      .then((r) => (r.data ? toScreening(r.data) : undefined)),

  /**
   * Orders a check from the new-booking form, before the booking exists.
   *
   * Sends only what a check needs — Checkr matches on the name and date of birth, and the
   * email says which renter the result belongs to. The rest of the form is deliberately left
   * out: ordering a check is not an edit, and the API refuses anything else.
   */
  orderForCustomer: (input: ScreeningOrder) =>
    apiClient
      .post<ScreeningWire>('/customers/screening', {
        name: input.name.trim(),
        email: input.email.trim(),
        dateOfBirth: input.dateOfBirth,
      })
      .then((r) => toScreening(r.data)),

  /**
   * The same report as `report`, reachable from the form before a booking exists. Keyed on
   * email because a renter screened at the counter has no customer record until they book.
   */
  reportForEmail: (email: string) =>
    apiClient
      .get<Blob>('/customers/screening/report', { params: { email }, responseType: 'blob' })
      .then((r) => r.data),

  /**
   * The verification log: every check this tenant has run, on renters and on anyone else.
   */
  list: (params: PaginationParams) =>
    apiClient
      .get<ListEnvelope<ScreeningListWire>>('/screenings', { params: toLimitOffset(params) })
      .then((r) => toPaginatedResult(r.data.items.map(toScreeningListRow), r.data.total, params)),

  /**
   * Screens someone who is not a renter. The address is optional and goes over whole or not
   * at all — Checkr rejects a partial one, so the form validates it before we get here.
   */
  orderStandalone: (input: StandaloneOrderWire) =>
    apiClient.post<ScreeningWire>('/screenings', input).then((r) => toScreening(r.data)),

  /** A specific check's report, which is how the log opens one with no renter to key on. */
  reportById: (screeningId: string) =>
    apiClient
      .get<Blob>(`/screenings/${screeningId}/report`, { responseType: 'blob' })
      .then((r) => r.data),

  /** Ordering twice is safe: the API returns the check already running. */
  order: (reference: string) =>
    apiClient
      .post<ScreeningWire>(`/bookings/${reference}/screening`)
      .then((r) => toScreening(r.data)),

  /**
   * The report as a PDF blob. Proxied by the API with its own Checkr credentials, so the
   * browser never holds a provider token and nothing is stored on our side.
   */
  report: (reference: string) =>
    apiClient
      .get<Blob>(`/bookings/${reference}/screening/report`, { responseType: 'blob' })
      .then((r) => r.data),
}
