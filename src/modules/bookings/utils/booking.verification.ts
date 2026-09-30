import type { BookingVerification, ProviderKind, VerificationStatus } from '../types/booking.types'

/** How a check reads on the checklist. Drives the dot, the label colour and the wording. */
export type VerificationTone = 'success' | 'error' | 'pending' | 'neutral'

/**
 * Suffix of `bookings:verification.state.<kind>.<key>` and `.hint.<kind>.<key>`. A literal union
 * rather than `string`, so a key added here without a translation is a tsc error.
 */
export type VerificationStateKey =
  | 'notStarted'
  | 'running'
  | 'clear'
  | 'consider'
  | 'error'

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

/** How each result reads on the checklist, whichever provider produced it. */
const BY_STATUS: Record<VerificationStatus, VerificationView> = {
  // Rare for Checkr, which answers instantly; routine for Axle, which waits on the renter.
  running: { tone: 'pending', stateKey: 'running', canViewReport: false, inProgress: true },
  clear: { tone: 'success', stateKey: 'clear', canViewReport: true, inProgress: false },
  // Records found, or cover that does not last the rental. Not a refusal: a human decides.
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
