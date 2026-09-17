export type ID = string

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type SortDirection = 'asc' | 'desc'

export interface SortParam {
  field: string
  direction: SortDirection
}

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * A file attached to a record. `url` is a data URL while uploads are mock-backed; it becomes a
 * CDN URL once a real upload endpoint exists, so nothing downstream has to change.
 */
export interface UploadedFile {
  id: string
  name: string
  url: string
  /** Bytes, for display only. */
  size: number
}
