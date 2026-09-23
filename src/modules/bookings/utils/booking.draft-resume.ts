import type { BookingDraft } from '../types/booking.types'

/**
 * What the form page should show for a `?draft=<id>` link.
 *
 * Separated from the page so the decision is testable on its own: opening the wizard when the
 * draft is not in hand is the difference between resuming a booking and quietly starting a
 * second one.
 */
export type DraftResume =
  | { kind: 'new' }
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'missing' }
  | { kind: 'resume'; draft: BookingDraft }

export function resolveDraftResume(
  resumedDraftId: string | null,
  drafts: BookingDraft[] | undefined,
  state: { isLoading: boolean; isError: boolean },
): DraftResume {
  if (!resumedDraftId) return { kind: 'new' }
  if (state.isLoading) return { kind: 'loading' }
  // A failed list is not an absent draft: the one being resumed may well exist.
  if (state.isError || !drafts) return { kind: 'failed' }

  const draft = drafts.find((d) => d.id === resumedDraftId)
  return draft ? { kind: 'resume', draft } : { kind: 'missing' }
}
