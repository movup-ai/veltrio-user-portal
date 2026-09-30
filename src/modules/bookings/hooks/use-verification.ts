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
import { normalizeApiError } from '@/services/api/errors'
import type { PaginationParams } from '@/types/common'
import type {
  InsuranceLinkWire,
  InsuranceOrderWire,
  InsuranceOutcomeWire,
  StandaloneOrderWire,
  VerificationOrder,
} from '../api/booking.mapper'
import { verificationApi, type CoverWindow } from '../api/verification.api'
import {
  TERMINAL_VERIFICATION_STATUSES,
  type ProviderKind,
} from '../types/booking.types'
import { readInsuranceRedirect } from '../utils/booking.insurance-redirect'
import { bookingKeys } from './use-bookings'

/** Long enough for the new tab to have loaded the blob before the URL is released. */
const REVOKE_AFTER_MS = 60_000

/** How often to re-ask while Checkr is still working — the same shape as the photo poll. */
const VERIFICATION_POLL_MS = 15_000

export const verificationKeys = {
  detail: (reference: string, kind: ProviderKind = 'background') =>
    [...bookingKeys.all, 'verification', reference, kind] as const,
  forEmail: (email: string, kind: ProviderKind = 'background', cover?: CoverWindow) =>
    [...bookingKeys.all, 'verification', 'email', email, kind, cover ?? null] as const,
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
export function useVerificationByEmail(
  email: string | undefined,
  kind: ProviderKind = 'background',
  cover?: CoverWindow,
) {
  // Debounced and shape-checked: the counter types this a character at a time, and a half
  // written address is a request that can only come back empty.
  const trimmed = useDebounced(email?.trim().toLowerCase() ?? '')

  return useQuery({
    queryKey: verificationKeys.forEmail(trimmed, kind, cover),
    queryFn: () => verificationApi.forEmail(trimmed, kind, cover),
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


/**
 * Opens a report PDF in a new tab. A mutation rather than a query: it is an action the
 * counter takes, and the blob is not worth caching.
 *
 * Call `open` straight from the click: the tab opens there, before the mutation's own awaits,
 * since some browsers block a tab opened a tick after the click. The object URL is revoked on
 * a timer rather than immediately - revoking it synchronously can race the new tab.
 */
function useReportOpener<TArg = void>(fetchPdf: (arg: TArg) => Promise<Blob>) {
  const mutation = useMutation({
    mutationFn: async ({ arg, tab }: { arg: TArg; tab: Window | null }) => {
      try {
        const pdf = await fetchPdf(arg)
        const url = URL.createObjectURL(pdf)
        if (tab) {
          // Severed here rather than by `noopener` above, which costs us the handle.
          tab.opener = null
          tab.location.href = url
        } else {
          const link = document.createElement('a')
          link.href = url
          link.download = 'background-check.pdf'
          link.click()
        }
        setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS)
      } catch (error) {
        tab?.close()
        throw error
      }
    },
    onError: (error) => {
      toast({
        title: i18n.t('bookings:verification.toast.reportFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })

  return {
    open: (arg: TArg) => mutation.mutate({ arg, tab: window.open('', '_blank') }),
    isPending: mutation.isPending,
  }
}

export function useVerificationReport(reference: string) {
  return useReportOpener(() => verificationApi.report(reference))
}

/** The renter's report, opened from the booking form before a booking exists. */
export function useVerificationReportByEmail(email: string | undefined) {
  return useReportOpener(() => {
    // Interpolating an empty value would request a plausible-looking URL that only 404s,
    // which reads as a broken button rather than a missing renter.
    if (!email) throw new Error('No renter to fetch a report for')
    return verificationApi.reportForEmail(email)
  })
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

/** Opens a report from the log, where a standalone check has no renter to key on. */
export function useVerificationReportById() {
  return useReportOpener((verificationId: string) => verificationApi.reportById(verificationId))
}

/** A line of text for the new tab while the session is fetched; a bare about:blank reads as broken. */
function showOpening(tab: Window) {
  const doc = tab.document
  if (!doc?.body) return
  const message = doc.createElement('p')
  message.textContent = i18n.t('bookings:verification.insurance.opening')
  message.style.cssText = 'font: 15px system-ui, sans-serif; color: #666; text-align: center; margin-top: 40vh'
  doc.title = message.textContent
  doc.body.replaceChildren(message)
}

/**
 * Opens an Axle session and sends the renter to it.
 *
 * Call `start` straight from the click. It opens the tab before anything else - before the
 * order is validated and before the mutation runs, both of which await - because some browsers
 * only allow a new tab synchronously inside the click, and block one opened a tick later.
 */
export function useStartInsurance() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ input, tab }: { input: InsuranceOrderWire; tab: Window | null }) => {
      try {
        const session = await verificationApi.startInsurance(input)
        if (tab) {
          tab.opener = null
          tab.location.href = session.ignitionUri
        } else {
          // Blocked. Leaving for Axle here would throw away a booking form half filled in, so
          // stay: the session is open, and Send link hands it over without leaving the page.
          toast({
            title: i18n.t('bookings:verification.toast.popupBlocked'),
            description: i18n.t('bookings:verification.toast.popupBlockedDescription'),
          })
        }
        return session
      } catch (error) {
        tab?.close()
        throw error
      }
    },
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

  return {
    /** `order` may be a function that validates first; resolving to nothing closes the tab. */
    start: (order: InsuranceOrderWire | (() => Promise<InsuranceOrderWire | undefined>)) => {
      const tab = window.open('', '_blank')
      if (tab) showOpening(tab)
      void Promise.resolve(typeof order === 'function' ? order() : order).then(
        (input) => (input ? mutation.mutate({ input, tab }) : tab?.close()),
        () => tab?.close(),
      )
    },
    isPending: mutation.isPending,
  }
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
