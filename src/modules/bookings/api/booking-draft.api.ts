import { apiClient } from '@/services/api/client'
import { toLimitOffset, toPaginatedResult, type ListEnvelope } from '@/lib/pagination'
import type { PaginationParams } from '@/types/common'
import { toBookingDraft, type BookingDraftWire } from './booking.mapper'

/**
 * Part-filled booking wizards. Kept apart from /bookings because a draft has none of what
 * makes a booking real — no vehicle, rate or renter — so it is stored as the portal's own
 * form state and only becomes a Booking when the wizard is submitted.
 */
export const bookingDraftApi = {
  list: (params: PaginationParams) =>
    apiClient
      .get<ListEnvelope<BookingDraftWire>>('/bookings/drafts', { params: toLimitOffset(params) })
      .then((r) => toPaginatedResult(r.data.items.map(toBookingDraft), r.data.total, params)),

  create: (payload: Record<string, unknown>) =>
    apiClient.post<BookingDraftWire>('/bookings/drafts', { payload }).then((r) => toBookingDraft(r.data)),

  update: (id: string, payload: Record<string, unknown>) =>
    apiClient
      .put<BookingDraftWire>(`/bookings/drafts/${id}`, { payload })
      .then((r) => toBookingDraft(r.data)),

  remove: (id: string) => apiClient.delete<void>(`/bookings/drafts/${id}`).then((r) => r.data),
}
