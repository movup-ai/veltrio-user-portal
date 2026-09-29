import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { useDebounced } from '@/lib/use-debounced'
import { normalizeApiError } from '@/services/api/errors'
import type { PaginationParams } from '@/types/common'
import type { ScreeningOrder, StandaloneOrderWire } from '../api/booking.mapper'
import { screeningApi } from '../api/screening.api'
import { TERMINAL_SCREENING_STATUSES } from '../types/booking.types'
import { bookingKeys } from './use-bookings'

/** Long enough for the new tab to have loaded the blob before the URL is released. */
const REVOKE_AFTER_MS = 60_000

/** How often to re-ask while Checkr is still working — the same shape as the photo poll. */
const SCREENING_POLL_MS = 15_000

export const screeningKeys = {
  detail: (reference: string) => [...bookingKeys.all, 'screening', reference] as const,
  forEmail: (email: string) => [...bookingKeys.all, 'screening', 'email', email] as const,
  logs: () => ['screenings'] as const,
  log: (params: PaginationParams) => ['screenings', params] as const,
}

/**
 * Whether the renter being typed into the booking form already has a check that would stand.
 *
 * Keyed on email rather than customer id: the form knows a typed-in renter by email long
 * before it knows their id, and looking them up by id let the card say "nothing on file"
 * about someone the order endpoint then refused as already screened.
 */
export function useScreeningByEmail(email: string | undefined) {
  // Debounced and shape-checked: the counter types this a character at a time, and a half
  // written address is a request that can only come back empty.
  const trimmed = useDebounced(email?.trim().toLowerCase() ?? '')

  return useQuery({
    queryKey: screeningKeys.forEmail(trimmed),
    queryFn: () => screeningApi.forEmail(trimmed),
    enabled: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed),
  })
}

/**
 * The booking's background check, polled while it is still moving.
 *
 * Its own query rather than reading `booking.screening`: a check runs for minutes or days, and
 * polling the whole booking detail to watch one field would refetch the vehicle and branch too.
 */
export function useScreening(reference: string | undefined) {
  return useQuery({
    queryKey: screeningKeys.detail(reference ?? ''),
    queryFn: () => screeningApi.get(reference as string),
    enabled: Boolean(reference),
    // Stop once Checkr can no longer change its mind; a decided check never moves again.
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status) return false
      return TERMINAL_SCREENING_STATUSES.includes(status) ? false : SCREENING_POLL_MS
    },
  })
}

/**
 * Runs a check from the new-booking form. The renter may not exist yet, so the typed details
 * go with it and the API resolves — or creates — the customer the booking will use.
 */
export function useOrderCustomerScreening() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ScreeningOrder) => screeningApi.orderForCustomer(input),
    onSuccess: () => {
      // Re-read by customer id: the form knows the renter, not the screening's own key.
      queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      toast({
        title: i18n.t('bookings:screening.toast.ordered'),
        description: i18n.t('bookings:screening.toast.orderedDescription'),
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({
        title: i18n.t('bookings:screening.toast.orderFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}

export function useOrderScreening(reference: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => screeningApi.order(reference),
    onSuccess: (screening) => {
      queryClient.setQueryData(screeningKeys.detail(reference), screening)
      // The booking's own copy and the ready counts both move with it.
      queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      toast({
        title: i18n.t('bookings:screening.toast.ordered'),
        description: i18n.t('bookings:screening.toast.orderedDescription'),
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({
        title: i18n.t('bookings:screening.toast.orderFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}


/**
 * Opens a report PDF in a new tab. A mutation rather than a query: it is an action the
 * counter takes, and the blob is not worth caching.
 *
 * The object URL is revoked on a timer rather than immediately - revoking it synchronously
 * can race the new tab and leave it blank.
 */
function useReportOpener<TArg = void>(fetchPdf: (arg: TArg) => Promise<Blob>) {
  return useMutation({
    mutationFn: fetchPdf,
    onSuccess: (pdf) => {
      const url = URL.createObjectURL(pdf)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS)
    },
    onError: (error) => {
      toast({
        title: i18n.t('bookings:screening.toast.reportFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}

export function useScreeningReport(reference: string) {
  return useReportOpener(() => screeningApi.report(reference))
}

/** The renter's report, opened from the booking form before a booking exists. */
export function useScreeningReportByEmail(email: string | undefined) {
  return useReportOpener(() => {
    // Interpolating an empty value would request a plausible-looking URL that only 404s,
    // which reads as a broken button rather than a missing renter.
    if (!email) throw new Error('No renter to fetch a report for')
    return screeningApi.reportForEmail(email)
  })
}

/** The verification log, one page at a time. */
export function useScreeningLog(params: PaginationParams) {
  return useQuery({
    queryKey: screeningKeys.log(params),
    queryFn: () => screeningApi.list(params),
    // Holds the rows on screen while the next page loads, so paging dims rather than blanks.
    placeholderData: keepPreviousData,
  })
}

/**
 * Screens someone who is not a renter. Invalidates the log rather than the bookings tree:
 * the result belongs to no booking and no customer.
 */
export function useOrderStandaloneScreening() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: StandaloneOrderWire) => screeningApi.orderStandalone(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: screeningKeys.logs() })
      toast({
        title: i18n.t('bookings:screening.toast.ordered'),
        description: i18n.t('bookings:screening.toast.orderedDescription'),
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({
        title: i18n.t('bookings:screening.toast.orderFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}

/** Opens a report from the log, where a standalone check has no renter to key on. */
export function useScreeningReportById() {
  return useReportOpener((screeningId: string) => screeningApi.reportById(screeningId))
}
