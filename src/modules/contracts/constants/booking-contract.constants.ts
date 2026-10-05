/** Why the API turns an agreement action down; the wording lives in the translations. */
export const CONTRACT_REFUSALS = [
  'booking_cancelled',
  'not_before_pickup',
  'already_signed',
  'not_issued',
] as const

export type ContractRefusal = (typeof CONTRACT_REFUSALS)[number]

/** Mirrors SIGNER_NAME_LENGTH and VOID_REASON_LENGTH in the API (app/modules/contracts/models.py). */
export const SIGNER_NAME_MAX = 80
export const VOID_REASON_MAX = 300

/** Mirrors SIGNATORY_TITLE_LENGTH in the API. */
export const SIGNATORY_TITLE_MAX = 80
