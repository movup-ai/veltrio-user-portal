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
 * A file picked in a form, before it has been sent anywhere.
 *
 * `file` is the real thing — it is what gets uploaded, so the bytes are never copied into
 * form state as base64. `url` is an object URL for previewing it locally and is only valid
 * for this page: revoke it when the file is dropped, and never persist or send it.
 */
export interface UploadedFile {
  id: string
  name: string
  url: string
  /** Bytes, for display only. */
  size: number
  file: File
}
