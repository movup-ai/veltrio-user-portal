import type { PaginatedResult, PaginationParams } from '@/types/common'

/** Rows per page until someone picks another. One value, so every list opens the same way. */
export const DEFAULT_PAGE_SIZE = 10

/** What the rows-per-page picker offers. */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

/** The API's ceiling on `limit`: a list asked for in one go is capped here. */
export const MAX_PAGE_SIZE = 100

/**
 * How many full pages a fetch-everything loop reads before giving up: 5,000 rows, far past any
 * real fleet or book, and a stop if `total` were ever wrong.
 */
export const MAX_LIST_PAGES = 50

/** The API caps drafts per tenant well below this, so one page always holds them all. */
export const DRAFTS_PAGE: PaginationParams = { page: 1, pageSize: 50 }

/**
 * Query shape the API actually pages with. The UI thinks in page/pageSize (it renders
 * "page 3 of 7" and Previous/Next), so the two are translated at the API boundary rather
 * than leaking limit/offset into components.
 */
interface LimitOffsetParams {
  limit: number
  offset: number
}

/** Response envelope from a limit/offset endpoint — it reports a total, not a page count. */
export interface ListEnvelope<T> {
  items: T[]
  total: number
}

/** `{ page: 3, pageSize: 20 }` → `?limit=20&offset=40`. */
export function toLimitOffset({ page, pageSize }: PaginationParams): LimitOffsetParams {
  return { limit: pageSize, offset: Math.max(0, (page - 1) * pageSize) }
}

/** Rebuilds the page/pageSize view the UI expects from a limit/offset response. */
export function toPaginatedResult<T>(
  items: T[],
  total: number,
  { page, pageSize }: PaginationParams,
): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return { items, page: Math.min(page, totalPages), pageSize, total, totalPages }
}
