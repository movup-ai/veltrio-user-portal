import { useEffect, useRef, useState } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { useDebounced } from '@/lib/use-debounced'
import { usePdfOpener } from '@/lib/use-pdf-opener'
import { normalizeApiError } from '@/services/api/errors'
import type { PaginationParams } from '@/types/common'
import type {
  InsuranceLinkWire,
  InsuranceOrderWire,
  InsuranceOutcomeWire,
  StandaloneOrderWire,
  VerificationOrder,
} from '../api/booking.mapper'
import { verificationApi } from '../api/verification.api'
import { VERIFICATION_POLL_MS } from '../constants/verification.constants'
import { TERMINAL_VERIFICATION_STATUSES, type ProviderKind } from '../types/booking.types'
import { readInsuranceRedirect } from '../utils/booking.insurance-redirect'
import { bookingKeys } from './use-bookings'

export const verificationKeys = {
  detail: (reference: string, kind: ProviderKind = 'background') =>
    [...bookingKeys.all, 'verification', reference, kind] as const,
  forEmail: (email: string, kind: ProviderKind = 'background') =>
    [...bookingKeys.all, 'verification', 'email', email, kind] as const,
  logs: () => ['verifications'] as const,
  log: (params: PaginationParams) => ['verifications', params] as const,
}

/**
 * Whether the renter being typed into the booking form already has a check that would stand.
 *
 * Keyed on email rather than customer id: the form knows a typed-in renter by email long
 * before it knows their id, and looking them up by id let the card say "nothing on file"
 * about someone the order endpoint then refused as already screened.
 */
export function useVerificationByEmail(email: string | undefined, kind: ProviderKind = 'background') {
  // Debounced and shape-checked: the counter types this a character at a time, and a half
  // written address is a request that can only come back empty.
  const trimmed = useDebounced(email?.trim().toLowerCase() ?? '')

  return useQuery({
    queryKey: verificationKeys.forEmail(trimmed, kind),
    queryFn: () => verificationApi.forEmail(trimmed, kind),
    enabled: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status) return false
      return TERMINAL_VERIFICATION_STATUSES.includes(status) ? false : VERIFICATION_POLL_MS
    },
  })
}

/**
 * One kind of check on a booking, polled while it is still moving.
 *
 * Its own query rather than reading `booking.verification`: a check runs for minutes or days, and
 * polling the whole booking detail to watch one field would refetch the vehicle and branch too.
 */
export function useVerification(reference: string | undefined, kind: ProviderKind = 'background') {
  return useQuery({
    queryKey: verificationKeys.detail(reference ?? '', kind),
    queryFn: () => verificationApi.get(reference as string, kind),
    enabled: Boolean(reference),
    // Stop once Checkr can no longer change its mind; a decided check never moves again.
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status) return false
      return TERMINAL_VERIFICATION_STATUSES.includes(status) ? false : VERIFICATION_POLL_MS
    },
  })
}

/**
 * Runs a check from the new-booking form. The renter may not exist yet, so the typed details
 * go with it and the API resolves — or creates — the customer the booking will use.
 */
export function useOrderCustomerVerification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: VerificationOrder) => verificationApi.orderForCustomer(input),
    onSuccess: () => {
      // Re-read by customer id: the form knows the renter, not the verification's own key.
      queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      toast({
        title: i18n.t('bookings:verification.toast.ordered'),
        description: i18n.t('bookings:verification.toast.orderedDescription'),
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({
        title: i18n.t('bookings:verification.toast.orderFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}

export function useOrderVerification(reference: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => verificationApi.order(reference),
    onSuccess: (verification) => {
      queryClient.setQueryData(verificationKeys.detail(reference), verification)
      // The booking's own copy and the ready counts both move with it.
      queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      toast({
        title: i18n.t('bookings:verification.toast.ordered'),
        description: i18n.t('bookings:verification.toast.orderedDescription'),
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({
        title: i18n.t('bookings:verification.toast.orderFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}

const REPORT_PDF = {
  fallbackName: 'background-check.pdf',
  errorTitle: () => i18n.t('bookings:verification.toast.reportFailed'),
}

export function useVerificationReport(reference: string) {
  return usePdfOpener(() => verificationApi.report(reference), REPORT_PDF)
}

/** The renter's report, opened from the booking form before a booking exists. */
export function useVerificationReportByEmail(email: string | undefined) {
  return usePdfOpener(() => {
    // Interpolating an empty value would request a plausible-looking URL that only 404s,
    // which reads as a broken button rather than a missing renter.
    if (!email) throw new Error('No renter to fetch a report for')
    return verificationApi.reportForEmail(email)
  }, REPORT_PDF)
}

/** The verification log, one page at a time. */
export function useVerificationLog(params: PaginationParams) {
  return useQuery({
    queryKey: verificationKeys.log(params),
    queryFn: () => verificationApi.list(params),
    // Holds the rows on screen while the next page loads, so paging dims rather than blanks.
    placeholderData: keepPreviousData,
    // A page holding an unfinished check keeps asking, so a row stops saying "Not finished"
    // and gains its report link without the counter reloading.
    refetchInterval: (query) =>
      query.state.data?.items.some((row) => !TERMINAL_VERIFICATION_STATUSES.includes(row.status))
        ? VERIFICATION_POLL_MS
        : false,
  })
}

/**
 * Screens someone who is not a renter. Invalidates the log rather than the bookings tree:
 * the result belongs to no booking and no customer.
 */
export function useOrderStandaloneVerification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: StandaloneOrderWire) => verificationApi.orderStandalone(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: verificationKeys.logs() })
      toast({
        title: i18n.t('bookings:verification.toast.ordered'),
        description: i18n.t('bookings:verification.toast.orderedDescription'),
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({
        title: i18n.t('bookings:verification.toast.orderFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}

/** Deletes a check from the log. A booking that showed it shows the renter's next one, if any. */
export function useDeleteVerification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (verificationId: string) => verificationApi.remove(verificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: verificationKeys.logs() })
      queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      toast({ title: i18n.t('bookings:verificationPage.log.deleted'), variant: 'success' })
    },
    onError: (error) => {
      toast({
        title: i18n.t('bookings:verificationPage.log.deleteFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}

/** Opens a report from the log, where a standalone check has no renter to key on. */
export function useVerificationReportById() {
  return usePdfOpener((verificationId: string) => verificationApi.reportById(verificationId), REPORT_PDF)
}

/** What the return tab tells the tab the counter started from, which is the one left open. */
export type InsuranceMessage =
  | { type: 'completing' }
  | { type: 'finished'; outcome: InsuranceOutcomeWire }
  | { type: 'unfinished' }
  // The link belonged to a session staff have since replaced; the newer one still waits.
  | { type: 'replaced' }
  | { type: 'failed'; message: string }

const INSURANCE_CHANNEL = 'veltrio:insurance'

function broadcast(message: InsuranceMessage) {
  if (typeof BroadcastChannel === 'undefined') return
  const channel = new BroadcastChannel(INSURANCE_CHANNEL)
  channel.postMessage(message)
  channel.close()
}

/**
 * Puts an outcome on screen: refetches the cards and the log, and a toast saying what happened.
 * The verdict comes from those staff reads - the public completion deliberately carries none.
 */
function announce(queryClient: QueryClient, message: InsuranceMessage) {
  if (message.type === 'completing') return
  if (message.type === 'finished') {
    queryClient.invalidateQueries({ queryKey: verificationKeys.logs() })
    queryClient.invalidateQueries({ queryKey: bookingKeys.all })
    toast({
      title: i18n.t('bookings:verification.toast.insuranceChecked'),
      description: i18n.t('bookings:verification.toast.orderedDescription'),
    })
    return
  }
  if (message.type === 'unfinished') {
    // The renter backed out. The session stays open, and the tile offers to reopen it.
    toast({ title: i18n.t('bookings:verification.toast.insuranceUnfinished') })
    return
  }
  if (message.type === 'replaced') {
    toast({ title: i18n.t('bookings:verification.toast.insuranceReplaced') })
    return
  }
  toast({
    title: i18n.t('bookings:verification.toast.orderFailed'),
    description: message.message,
    variant: 'error',
  })
}

/**
 * Shows the outcome of a session finished in a return tab on this browser. Mounted by every
 * page a session can start from; returns whether a check is being finished right now. A renter
 * finishing on their own phone is picked up by the running check's poll instead.
 */
export function useInsuranceResults(): boolean {
  const queryClient = useQueryClient()
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel(INSURANCE_CHANNEL)
    channel.onmessage = ({ data }: MessageEvent<InsuranceMessage>) => {
      setCompleting(data.type === 'completing')
      announce(queryClient, data)
    }
    return () => channel.close()
  }, [queryClient])

  return completing
}

/**
 * The return page's job: trade the redirect's code for a verdict, hand it to the tab the
 * counter started from, and close. Returns the outcome once there is one, for a tab the browser
 * will not close - a renter's own, or the counter's when the popup was blocked - to show.
 */
export function useInsuranceReturn(): InsuranceMessage | undefined {
  const [shown, setShown] = useState<InsuranceMessage>()
  const started = useRef(false)

  useEffect(() => {
    // Once only: the code is single-use, and a second exchange would fail the check.
    if (started.current) return
    started.current = true
    const redirect = readInsuranceRedirect(window.location.search)

    const finish = (message: InsuranceMessage) => {
      broadcast(message)
      window.close()
      if (!window.closed) setShown(message)
    }

    if (redirect?.outcome !== 'complete') {
      finish({ type: 'unfinished' })
      return
    }
    broadcast({ type: 'completing' })
    const { tenantId, verificationId, authCode } = redirect
    verificationApi.completeInsurance({ tenantId, verificationId, authCode }).then(
      (outcome) => finish({ type: 'finished', outcome }),
      (error) => {
        const apiError = normalizeApiError(error)
        finish(
          apiError.code === 'verification_session_closed'
            ? { type: 'replaced' }
            : { type: 'failed', message: apiError.message },
        )
      },
    )
  }, [])

  return shown
}

/** A session link to hand to the renter, as the send dialog shows it. */
export interface InsuranceLinkSession {
  verificationId: string
  link: string
}

/**
 * Opens a session to hand to the renter rather than to open here, and the dialog it is shown
 * in. Asking again for someone whose session is still open returns that same link.
 */
export function useInsuranceLinkDialog() {
  const link = useInsuranceLink()
  const [open, setOpen] = useState(false)
  const session: InsuranceLinkSession | undefined = link.data && {
    verificationId: link.data.verification.id,
    link: link.data.ignitionUri,
  }

  return {
    share: (input: InsuranceOrderWire) => {
      link.reset()
      setOpen(true)
      link.mutate(input, { onError: () => setOpen(false) })
    },
    sharing: link.isPending,
    dialog: { open, onOpenChange: setOpen, session },
  }
}

function useInsuranceLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: InsuranceOrderWire) => verificationApi.startInsurance(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: verificationKeys.logs() })
      queryClient.invalidateQueries({ queryKey: bookingKeys.all })
    },
    onError: (error) => {
      toast({
        title: i18n.t('bookings:verification.toast.insuranceFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}

/** Emails or texts the renter their link. */
export function useSendInsuranceLink(verificationId: string | undefined) {
  return useMutation({
    mutationFn: (input: InsuranceLinkWire) => {
      if (!verificationId) throw new Error('No session to send')
      return verificationApi.sendInsuranceLink(verificationId, input)
    },
    onSuccess: (_, input) => {
      toast({ title: i18n.t(`bookings:insuranceLink.sent.${input.channel}`), variant: 'success' })
    },
    onError: (error) => {
      toast({
        title: i18n.t('bookings:insuranceLink.sendFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}
