import type { BookingScreening, ScreeningStatus } from '../types/booking.types'

/** How a check reads on the checklist. Drives the dot, the label colour and the wording. */
export type ScreeningTone = 'success' | 'error' | 'pending' | 'neutral'

/**
 * Suffix of `bookings:screening.state.<key>` and `.hint.<key>`. A literal union rather than
 * `string`, so a key added here without a translation is a tsc error.
 */
export type ScreeningStateKey =
  | 'notStarted'
  | 'running'
  | 'clear'
  | 'consider'
  | 'error'

export interface ScreeningView {
  tone: ScreeningTone
  stateKey: ScreeningStateKey
  /** The primary button, or none when there is nothing left to do. */
  action?: 'order'
  /** Whether the finished report can be opened. Independent of the primary action. */
  canViewReport: boolean
  /** Whether Checkr may still move this on its own. */
  inProgress: boolean
}

const NOT_STARTED: ScreeningView = {
  tone: 'neutral',
  stateKey: 'notStarted',
  action: 'order',
  canViewReport: false,
  inProgress: false,
}

/** How each Checkr result reads on the checklist. */
const BY_STATUS: Record<ScreeningStatus, ScreeningView> = {
  // Unusual for an instant check: it means Checkr took the order but has no verdict yet.
  running: { tone: 'pending', stateKey: 'running', canViewReport: false, inProgress: true },
  clear: { tone: 'success', stateKey: 'clear', canViewReport: true, inProgress: false },
  // Records were found. Not a refusal: the branch reads the report and uses its judgement.
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
 * What the checklist row should show for a background check. Informational throughout:
 * the row reports where the check got to and offers the report, and gates nothing.
 */
export function screeningView(screening: BookingScreening | undefined): ScreeningView {
  if (!screening) return NOT_STARTED

  const view = BY_STATUS[screening.status] ?? NOT_STARTED
  // The API refuses a re-run while a result still stands, so offering one here only produced
  // a 409 toast. `canReorder` is the API's own answer, which is why the button follows it.
  if (view.action === 'order' && !screening.canReorder) {
    return { ...view, action: undefined }
  }
  return view
}
