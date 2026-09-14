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
