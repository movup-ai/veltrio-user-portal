import { apiClient } from '@/services/api/client'
import { toLimitOffset, toPaginatedResult, type ListEnvelope } from '@/lib/pagination'
import type { PaginationParams } from '@/types/common'
import type { ProviderKind } from '../types/booking.types'
import {
  toVerification,
  toVerificationListRow,
  type InsuranceCallbackWire,
  type InsuranceLinkWire,
  type InsuranceOrderWire,
  type InsuranceOutcomeWire,
  type InsuranceSessionWire,
  type VerificationListWire,
  type VerificationOrder,
  type VerificationWire,
  type StandaloneOrderWire,
} from './booking.mapper'

/**
 * Verifications: background checks through Checkr, insurance through Axle.
 *
 * Nothing regulated passes through these calls — no SSN, no policy contents, no record
 * detail. Only the verdict and enough to identify what produced it; the detail stays with
 * the provider and is fetched on demand as a proxied PDF.
 */
export const verificationApi = {
  get: (reference: string, kind: ProviderKind = 'background') =>
    apiClient
      .get<VerificationWire | null>(`/bookings/${reference}/verification`, { params: { kind } })
      .then((r) => (r.data ? toVerification(r.data) : undefined)),

  /**
   * The check that stands for this renter's next booking, read while one is still being
   * taken. Null once the last check is too old to be reused, matching what ordering would do.
   *
   * Keyed on email because that is what the API matches on when a check is ordered: the form
   * knows a typed-in renter by email before it knows their customer id, and looking them up
   * any other way let the card contradict the refusal ordering would give.
   */
  forEmail: (email: string, kind: ProviderKind = 'background') =>
    apiClient
      .get<VerificationWire | null>('/customers/verification', { params: { email, kind } })
      .then((r) => (r.data ? toVerification(r.data) : undefined)),

  /**
   * Orders a check from the new-booking form, before the booking exists.
   *
   * Sends only what a check needs — Checkr matches on the name and date of birth, and the
   * email says which renter the result belongs to. The rest of the form is deliberately left
   * out: ordering a check is not an edit, and the API refuses anything else.
   */
  orderForCustomer: (input: VerificationOrder) =>
    apiClient
      .post<VerificationWire>('/customers/verification', {
        name: input.name.trim(),
        email: input.email.trim(),
        dateOfBirth: input.dateOfBirth,
      })
      .then((r) => toVerification(r.data)),

  /**
   * The same report as `report`, reachable from the form before a booking exists. Keyed on
   * email because a renter screened at the counter has no customer record until they book.
   */
  reportForEmail: (email: string) =>
    apiClient
      .get<Blob>('/customers/verification/report', { params: { email }, responseType: 'blob' })
      .then((r) => r.data),

  /**
   * The verification log: every check this tenant has run, on renters and on anyone else.
   */
  list: (params: PaginationParams) =>
    apiClient
      .get<ListEnvelope<VerificationListWire>>('/verifications', { params: toLimitOffset(params) })
      .then((r) => toPaginatedResult(r.data.items.map(toVerificationListRow), r.data.total, params)),

  /**
   * Screens someone who is not a renter. The address is optional and goes over whole or not
   * at all — Checkr rejects a partial one, so the form validates it before we get here.
   */
  orderStandalone: (input: StandaloneOrderWire) =>
    apiClient.post<VerificationWire>('/verifications', input).then((r) => toVerification(r.data)),

  /**
   * Opens an Axle session for the renter to connect their insurance in.
   *
   * Nothing is verified yet: this hands back a URL the renter completes themselves, and
   * `completeInsurance` turns the code their redirect carries into a verdict.
   */
  startInsurance: (input: InsuranceOrderWire) =>
    apiClient
      .post<InsuranceSessionWire>('/verifications/insurance', input)
      .then((r) => ({
        verification: toVerification(r.data.verification),
        ignitionUri: r.data.ignitionUri,
      })),

  /**
   * Trades the redirect's single-use code for the policy the renter shared. Public, since the
   * renter may finish on their own phone; it answers with the verdict and nothing more.
   */
  completeInsurance: (input: InsuranceCallbackWire) =>
    apiClient
      .post<InsuranceOutcomeWire>('/public/verifications/insurance/complete', input)
      .then((r) => r.data),

  /** Emails or texts the renter their session link. Not yet served by the API. */
  sendInsuranceLink: (verificationId: string, input: InsuranceLinkWire) =>
    apiClient.post<void>(`/verifications/${verificationId}/insurance-link`, input).then(() => undefined),

  /** A specific check's report, which is how the log opens one with no renter to key on. */
  reportById: (verificationId: string) =>
    apiClient
      .get<Blob>(`/verifications/${verificationId}/report`, { responseType: 'blob' })
      .then((r) => r.data),

  /** Ordering twice is safe: the API returns the check already running. */
  order: (reference: string) =>
    apiClient
      .post<VerificationWire>(`/bookings/${reference}/verification`)
      .then((r) => toVerification(r.data)),

  /**
   * The report as a PDF blob. Proxied by the API with its own Checkr credentials, so the
   * browser never holds a provider token and nothing is stored on our side.
   */
  report: (reference: string) =>
    apiClient
      .get<Blob>(`/bookings/${reference}/verification/report`, { responseType: 'blob' })
      .then((r) => r.data),
}
