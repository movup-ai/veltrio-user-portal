import type { PaginatedResult, PaginationParams } from '@/types/common'

/**
 * Query shape the API actually pages with. The UI thinks in page/pageSize (it renders
 * "page 3 of 7" and Previous/Next), so the two are translated at the API boundary rather
 * than leaking limit/offset into components.
 */
export interface LimitOffsetParams {
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
