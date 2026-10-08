import { combineDateTime } from '@/modules/bookings/schema/booking.schema'
import { normalizeApiError } from '@/services/api/errors'
import { formatDay } from '@/utils/dates'
import { EXTENSION_ERRORS, type ExtensionError } from '../constants/payment.constants'
import type { BookingPaymentRecord } from '../types/booking-payment.types'
import type { BookingExtension, BookingExtensions } from '../types/booking-extension.types'

const MS_PER_HOUR = 3_600_000

/** A picked day and time, read as the branch's own clock, as the booking form reads its own. */
interface ReturnChoice {
  /** `YYYY-MM-DD` */
  date: string
  /** `HH:mm` */
  time: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toChoice(at: Date): ReturnChoice {
  return { date: formatDay(at), time: `${pad(at.getHours())}:${pad(at.getMinutes())}` }
}

/**
 * Where the dialog starts: a day more, at the hour the car was due. For a car already late
 * that is the first such hour still ahead, since an extension cannot end in the past.
 */
export function suggestedReturn(returnAt: string, now: Date, availableUntil?: string): ReturnChoice {
  const next = new Date(returnAt)
  // setDate rather than +24h, so a clock change overnight keeps the same wall time.
  do next.setDate(next.getDate() + 1)
  while (next <= now)
  // Not past where the next booking begins, when that still leaves the car some extra time.
  const limit = availableUntil ? new Date(availableUntil) : undefined
  const fits = limit && limit < next && limit.getTime() > Math.max(Date.parse(returnAt), now.getTime())
  return toChoice(fits ? limit : next)
}

/** The instant a choice names, or undefined while either half is missing. */
export function chosenReturn(choice: ReturnChoice): Date | undefined {
  if (!choice.date || !choice.time) return undefined
  const at = combineDateTime(choice.date, choice.time)
  return Number.isNaN(at.getTime()) ? undefined : at
}

type ReturnProblem = 'notLater' | 'inPast' | 'pastNextBooking'

/** Why a chosen return cannot be asked for, checked here so the API is not asked to refuse it. */
export function returnProblem(
  chosen: Date,
  returnAt: string,
  availableUntil: string | undefined,
  now: Date,
): ReturnProblem | undefined {
  if (chosen.getTime() <= Date.parse(returnAt)) return 'notLater'
  if (chosen <= now) return 'inPast'
  if (availableUntil && chosen.getTime() > Date.parse(availableUntil)) return 'pastNextBooking'
  return undefined
}

/** The first and last days the calendar offers; the time of day is checked by `returnProblem`. */
export function returnDayBounds(returnAt: string, availableUntil: string | undefined, now: Date) {
  const earliest = new Date(Math.max(Date.parse(returnAt), now.getTime()))
  return { min: formatDay(earliest), max: availableUntil ? formatDay(new Date(availableUntil)) : undefined }
}

/** The extra time as whole days and hours, the way a rental's own length is shown. */
export function addedTime(previousReturnAt: string, newReturnAt: string) {
  const hours = Math.max(
    0,
    Math.round((Date.parse(newReturnAt) - Date.parse(previousReturnAt)) / MS_PER_HOUR),
  )
  return { days: Math.floor(hours / 24), hours: hours % 24 }
}

type ExtensionWarning = 'depositLapses' | 'insuranceEnds'

/**
 * What a later return outlives. Neither stops it: a hold can be asked for again and insurance
 * checked again, but the counter should know before they agree to the date.
 */
export function extensionWarnings(
  chosen: Date,
  deposit: Pick<BookingPaymentRecord, 'status' | 'captureBefore'> | undefined,
  coverValidUntil: string | undefined,
): ExtensionWarning[] {
  const warnings: ExtensionWarning[] = []
  if (
    deposit?.status === 'held' &&
    deposit.captureBefore &&
    Date.parse(deposit.captureBefore) < chosen.getTime()
  ) {
    warnings.push('depositLapses')
  }
  // Compared as calendar days: cover is through the end of its last day.
  if (coverValidUntil && coverValidUntil < formatDay(chosen)) warnings.push('insuranceEnds')
  return warnings
}

/**
 * Why the extend row is off, or undefined when it can be used. A check that failed says so:
 * left blank it reads as a booking that cannot be extended, which nobody can act on.
 */
export function extendUnavailable(extensions: BookingExtensions | undefined, failed: boolean) {
  if (extensions?.extend.allowed) return undefined
  if (!extensions) return { reason: failed ? ('loadFailed' as const) : undefined }
  return { reason: extensions.extend.reason }
}

/** The API's reason for refusing a quote or a request, where the dialog has words for it. */
export function extensionError(error: unknown): ExtensionError | undefined {
  const { code } = normalizeApiError(error)
  return (EXTENSION_ERRORS as readonly string[]).includes(code ?? '') ? (code as ExtensionError) : undefined
}

/** Extensions with an addendum, oldest first, numbered as the API numbers their files. */
export function addenda(history: BookingExtension[]) {
  return history
    .filter((extension) => extension.hasAddendum)
    .reverse()
    .map((extension, index) => ({ extension, number: index + 1 }))
}

/** Money paid for a request that never took effect, which is the renter's to have back. */
export function refundDue(history: BookingExtension[]): number {
  return Math.round(history.reduce((sum, extension) => sum + extension.refundDue, 0) * 100) / 100
}
