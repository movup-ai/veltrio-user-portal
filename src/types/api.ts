/** Discriminates the errors the UI must render differently. */
export type ApiErrorKind =
  | 'unauthorized' // 401
  | 'forbidden' // 403
  | 'not_found' // 404
  | 'conflict' // 409 — e.g. a VIN already registered to another vehicle
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
  /**
   * The API's machine-readable code, e.g. `user_not_onboarded` or `vin_already_exists`.
   * Status alone is often too coarse — several distinct 403s share a status but need
   * different handling.
   */
  readonly code?: string
  readonly fieldErrors?: ApiFieldError[]

  constructor(
    kind: ApiErrorKind,
    message: string,
    options?: { status?: number; code?: string; fieldErrors?: ApiFieldError[]; cause?: unknown },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'ApiError'
    this.kind = kind
    this.status = options?.status
    this.code = options?.code
    this.fieldErrors = options?.fieldErrors
  }
}

export interface PaginatedResponse<T> {
  items: T[]
  page: number
  page_size: number
  total: number
  total_pages: number
}
