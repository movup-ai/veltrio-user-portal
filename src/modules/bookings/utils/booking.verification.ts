import type { InsuranceOrderWire } from '../api/booking.mapper'
import {
  TERMINAL_VERIFICATION_STATUSES,
  type BookingVerification,
  type ProviderKind,
  type VerificationRecord,
  type VerificationStatus,
} from '../types/booking.types'

/** How a check reads on the checklist. Drives the dot, the label colour and the wording. */
export type VerificationTone = 'success' | 'error' | 'pending' | 'neutral'

/**
 * Suffix of `bookings:verification.state.<kind>.<key>` and `.hint.<kind>.<key>`. A literal union
 * rather than `string`, so a key added here without a translation is a tsc error.
 */
export type VerificationStateKey = 'notStarted' | 'running' | 'clear' | 'consider' | 'error' | 'expired'

export interface VerificationView {
  tone: VerificationTone
  stateKey: VerificationStateKey
  /**
   * The primary button, or none when there is nothing left to do. `resume` reopens a session
   * the renter has not finished - it costs nothing, since the provider hands back the same one.
   */
  action?: 'order' | 'resume'
  /** Whether the finished report can be opened. Independent of the primary action. */
  canViewReport: boolean
  /** Whether the provider may still move this on its own. */
  inProgress: boolean
}

const NOT_STARTED: VerificationView = {
  tone: 'neutral',
  stateKey: 'notStarted',
  action: 'order',
  canViewReport: false,
  inProgress: false,
}

/** A verdict that has run out: on file, but cover no longer, so verifying again is the action. */
const EXPIRED: VerificationView = {
  tone: 'error',
  stateKey: 'expired',
  action: 'order',
  canViewReport: false,
  inProgress: false,
}

/** How each result reads on the checklist, whichever provider produced it. */
const BY_STATUS: Record<VerificationStatus, VerificationView> = {
  // Rare for Checkr, which answers instantly; routine for Axle, which waits on the renter.
  running: { tone: 'pending', stateKey: 'running', canViewReport: false, inProgress: true },
  clear: { tone: 'success', stateKey: 'clear', canViewReport: true, inProgress: false },
  // Records found, or a policy that does not cover the renter. Not a refusal: a human decides.
  consider: {
    tone: 'error',
    stateKey: 'consider',
    action: 'order',
    canViewReport: true,
    inProgress: false,
  },
  error: {
    tone: 'error',
    stateKey: 'error',
    action: 'order',
    canViewReport: false,
    inProgress: false,
  },
}

/**
 * What the checklist row should show for a check. Informational throughout: the row reports
 * where the check got to and offers the report, and gates nothing.
 */
export function verificationView(
  verification: BookingVerification | undefined,
  kind: ProviderKind = 'background',
): VerificationView {
  if (!verification) return NOT_STARTED
  // Ahead of the verdict it once was: a green tick here would say the renter is still covered.
  if (verification.expired) return EXPIRED

  const view = BY_STATUS[verification.status] ?? NOT_STARTED
  // An insurance check waits on the renter, who may close the tab. Without a way back in the
  // row would sit running for good, since the open session blocks starting another.
  if (kind === 'insurance' && verification.status === 'running') {
    return { ...view, action: 'resume' }
  }
  // The API refuses a re-run while a result still stands, so offering one here only produced
  // a 409 toast. `canReorder` is the API's own answer, which is why the button follows it.
  if (view.action === 'order' && !verification.canReorder) {
    return { ...view, action: undefined }
  }
  return view
}

/**
 * Whether sending a link starts a fresh check rather than handing back the open one. Only a
 * session still waiting on the renter is reused; after a result they get a new link.
 */
export function sendsNewLink(verification: Pick<BookingVerification, 'status'> | undefined): boolean {
  return verification !== undefined && verification.status !== 'running'
}

/**
 * Whether a rental runs past the day its renter's insurance was verified to. Only a warning:
 * one check stands for the renter, and whether to verify again is the counter's call.
 */
export function outlastsCover(
  verification: Pick<BookingVerification, 'validUntil' | 'expired'> | undefined,
  /** The rental's last day, as `YYYY-MM-DD`. */
  returnOn: string | undefined,
): boolean {
  if (!verification?.validUntil || verification.expired || !returnOn) return false
  return verification.validUntil < returnOn
}

/** What a row of the verification history can do, in the order its menu lists them. */
export type LogAction = 'viewReport' | 'sendLink' | 'sendNewLink' | 'delete'

export function logActions(record: VerificationRecord, canDelete: boolean, today: string): LogAction[] {
  const actions: LogAction[] = []
  if (record.hasReport) actions.push('viewReport')
  // Covered needs nothing more until it runs out; anything else can be put to the renter
  // again. The session is matched on the birth date, so a row without one cannot open another.
  const covered = record.status === 'clear' && (!record.validUntil || record.validUntil >= today)
  if (record.kind === 'insurance' && !covered && record.dateOfBirth) {
    actions.push(sendsNewLink(record) ? 'sendNewLink' : 'sendLink')
  }
  // A running check may still be answered, which is why the API refuses to delete one.
  if (canDelete && TERMINAL_VERIFICATION_STATUSES.includes(record.status)) actions.push('delete')
  return actions
}

/**
 * The insurance session to open again from a history row. A booking's check goes back through
 * the booking, so the renter's details are read from it and the link lands there.
 */
export function resendInsuranceOrder(
  record: VerificationRecord,
  redirectUri: string,
): InsuranceOrderWire | undefined {
  if (!record.dateOfBirth) return undefined
  const renter = { name: record.name, dateOfBirth: record.dateOfBirth, email: record.email }
  return record.bookingReference
    ? { ...renter, reference: record.bookingReference, redirectUri }
    : { ...renter, redirectUri }
}

/** A check run in the booking form, tagged with the renter it was ordered for. */
export interface RanVerification {
  email: string
  verification: BookingVerification
}

export function verificationForRenter(
  saved: BookingVerification | undefined,
  ran: RanVerification | undefined,
  email: string,
): BookingVerification | undefined {
  if (saved) return saved
  return ran && ran.email === email.trim().toLowerCase() ? ran.verification : undefined
}
