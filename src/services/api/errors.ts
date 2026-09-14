import { isAxiosError } from 'axios'
import { ApiError, type ApiFieldError } from '@/types/api'

const STATUS_TO_KIND: Record<number, ApiError['kind']> = {
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  422: 'validation',
  429: 'rate_limited',
}

/**
 * Normalizes any error thrown by the API client into an ApiError so the
 * UI never has to branch on axios internals or raw backend payload shapes.
 */
export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (isAxiosError(error)) {
    if (!error.response) {
      return new ApiError('network_error', 'Unable to reach the server. Check your connection.', {
        cause: error,
      })
    }

    const { status, data } = error.response
    const kind = STATUS_TO_KIND[status] ?? (status >= 500 ? 'server_error' : 'unknown')
    const fieldErrors = extractFieldErrors(data)
    const message = extractMessage(data) ?? defaultMessageFor(kind)

    return new ApiError(kind, message, { status, fieldErrors, cause: error })
  }

  return new ApiError('unknown', 'Something went wrong. Please try again.', { cause: error })
}

function extractMessage(data: unknown): string | undefined {
  if (data && typeof data === 'object' && 'detail' in data) {
    const { detail } = data as { detail: unknown }
    if (typeof detail === 'string') return detail
  }
  if (data && typeof data === 'object' && 'message' in data) {
    const { message } = data as { message: unknown }
    if (typeof message === 'string') return message
  }
  return undefined
}

/** FastAPI/Pydantic 422 responses shape errors as `detail: [{ loc, msg }]`. */
function extractFieldErrors(data: unknown): ApiFieldError[] | undefined {
  if (!data || typeof data !== 'object' || !('detail' in data)) return undefined
  const { detail } = data as { detail: unknown }
  if (!Array.isArray(detail)) return undefined

  const errors: ApiFieldError[] = []
  for (const entry of detail) {
    if (entry && typeof entry === 'object' && 'loc' in entry && 'msg' in entry) {
      const loc = (entry as { loc: unknown }).loc
      const msg = (entry as { msg: unknown }).msg
      if (Array.isArray(loc) && typeof msg === 'string') {
        errors.push({ field: String(loc.at(-1)), message: msg })
      }
    }
  }
  return errors.length > 0 ? errors : undefined
}

function defaultMessageFor(kind: ApiError['kind']): string {
  switch (kind) {
    case 'unauthorized':
      return 'Your session has expired. Please sign in again.'
    case 'forbidden':
      return "You don't have permission to do that."
    case 'not_found':
      return 'The requested resource could not be found.'
    case 'validation':
      return 'Some of the submitted information is invalid.'
    case 'rate_limited':
      return 'Too many requests. Please slow down and try again.'
    case 'server_error':
      return 'The server ran into a problem. Please try again shortly.'
    default:
      return 'Something went wrong. Please try again.'
  }
}
