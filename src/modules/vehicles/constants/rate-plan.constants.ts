/**
 * Trip lengths the effective-rates preview always prices: a mix of exact matches and in-between
 * lengths, so each engine rule shows up. Each option's own length and each tier threshold join them.
 */
export const PREVIEW_DAYS = [1, 3, 4, 7, 10, 14] as const

/** Past this the preview stops reading as a glance. */
export const MAX_PREVIEW_ROWS = 10

/**
 * Longest rental the engine prices: its work grows with every hour. Matches MAX_RENTAL_DAYS on the
 * API, which refuses a longer booking.
 */
export const MAX_RENTAL_DAYS = 365

/** Most discount tiers a vehicle can hold; matches the API's limit. */
export const MAX_DISCOUNT_TIERS = 10

/** Most an hourly rate bills per day unless the vehicle sets its own; matches the API default. */
export const DEFAULT_BILLABLE_HOURS_PER_DAY = 8
