import type { PaginatedResult, PaginationParams } from '@/types/common'

/** Rows per page until someone picks another. One value, so every list opens the same way. */
export const DEFAULT_PAGE_SIZE = 10

/** What the rows-per-page picker offers. */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

/** The API's ceiling on `limit`: a list asked for in one go is capped here. */
export const MAX_PAGE_SIZE = 100

/**
 * Pages a fetch-everything loop reads before giving up, a stop if `total` were ever wrong. Each
 * is its own limit: the fleet's covers every car, the bookings' also caps the CSV export.
 */
export const MAX_FLEET_PAGES = 100
export const MAX_BOOKING_PAGES = 50
export const MAX_CUSTOMER_PAGES = 50

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

/** Raised instead of returning a partial export, so the caller can say what went wrong. */
export class ExportTooLargeError extends Error {
  readonly total: number
  readonly limit: number

  constructor(total: number, limit: number) {
    super(`Cannot export ${total} rows; the limit is ${limit}`)
    this.name = 'ExportTooLargeError'
    this.total = total
    this.limit = limit
  }
}

/**
 * Every row of a paged list, for an export: not just the page on screen. Paged because the
 * API caps a page at 100, and capped in turn so a huge list cannot hang the browser.
 */
export async function fetchEveryPage<T>(
  fetchPage: (page: PaginationParams) => Promise<PaginatedResult<T>>,
  maxPages: number,
): Promise<T[]> {
  const limit = maxPages * MAX_PAGE_SIZE
  const rows: T[] = []
  let total = 0
  for (let page = 1; page <= maxPages; page++) {
    const result = await fetchPage({ page, pageSize: MAX_PAGE_SIZE })
    total = result.total
    // The first response already says whether this can finish, so an oversized export costs
    // one request rather than fetching and mapping every page only to refuse at the end.
    if (total > limit) throw new ExportTooLargeError(total, limit)
    rows.push(...result.items)
    if (rows.length >= total) break
  }
  // A total that never arrives — pages short of what was promised — is refused too: a CSV
  // claiming to be the whole export is worse than none, since nothing says rows are missing.
  if (rows.length < total) throw new ExportTooLargeError(total, limit)
  return rows
}
