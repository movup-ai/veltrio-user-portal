import { normalizeApiError } from '@/services/api/errors'
import type { ContractLink } from '../types/booking-contract.types'

/** What the signing form holds before it is sent. */
export interface SignatureDraft {
  name: string
  consent: boolean
  /** The renter chose to adopt their typed name instead of drawing. */
  typed: boolean
  drawing?: string
}

/** The two ways the API turns a drawing down: nothing drawn, or not an image it can read. */
export type DrawingProblem = 'signatureRequired' | 'signatureUnreadable'

/** What still stops the form from being sent, by the field it belongs under. */
export function signatureProblems(draft: SignatureDraft): {
  name?: 'nameRequired'
  signature?: 'signatureRequired'
  consent?: 'consentRequired'
} {
  return {
    ...(draft.name.trim() ? {} : { name: 'nameRequired' as const }),
    ...(draft.typed || draft.drawing ? {} : { signature: 'signatureRequired' as const }),
    ...(draft.consent ? {} : { consent: 'consentRequired' as const }),
  }
}

/** The API's refusal of a drawing, as the problem to show under the pad; undefined for anything else. */
export function drawingProblem(error: unknown): DrawingProblem | undefined {
  const code = normalizeApiError(error).code
  if (code === 'signature_blank') return 'signatureRequired'
  return code === 'signature_invalid' ? 'signatureUnreadable' : undefined
}

/** The renter's agreement page, on this portal's own origin. */
export function contractLinkUrl(origin: string, link: ContractLink): string {
  return `${origin}/sign/${link.tenantId}/${link.contractId}/${link.token}`
}

/** Numbered from the booking, as the API names its agreement (AGR-). */
export function contractFileName(reference: string): string {
  return `AGR-${reference}.pdf`
}
