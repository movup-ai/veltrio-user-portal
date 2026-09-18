/** Discriminates the errors the UI must render differently. */
export type ApiErrorKind =
  | 'unauthorized' // 401
  | 'forbidden' // 403
  | 'not_found' // 404
  | 'validation' // 422
  | 'rate_limited' // 429
  | 'server_error' // 5xx
  | 'network_error' // request never reached the server
  | 'unknown'

export interface ApiFieldError {
  field: string
  message: string
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number
  readonly fieldErrors?: ApiFieldError[]
  /** Backend error code, e.g. `user_not_onboarded` — the only stable thing to branch on. */
  readonly code?: string

  constructor(
    kind: ApiErrorKind,
    message: string,
    options?: { status?: number; fieldErrors?: ApiFieldError[]; code?: string; cause?: unknown },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'ApiError'
    this.kind = kind
    this.status = options?.status
    this.fieldErrors = options?.fieldErrors
    this.code = options?.code
  }
}

export interface PaginatedResponse<T> {
  items: T[]
  page: number
  page_size: number
  total: number
  total_pages: number
}
