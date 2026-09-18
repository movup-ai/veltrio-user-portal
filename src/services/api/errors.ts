import { isAxiosError } from 'axios'
import i18n from '@/i18n'
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
      return new ApiError('network_error', i18n.t('validation:api.network'), { cause: error })
    }

    const { status, data } = error.response
    const kind = STATUS_TO_KIND[status] ?? (status >= 500 ? 'server_error' : 'unknown')
    const fieldErrors = extractFieldErrors(data)
    const backendError = extractBackendError(data)
    const message = backendError?.message ?? extractMessage(data) ?? defaultMessageFor(kind)

    return new ApiError(kind, message, { status, fieldErrors, code: backendError?.code, cause: error })
  }

  return new ApiError('unknown', i18n.t('validation:api.unknown'), { cause: error })
}

/**
 * The backend renders every error as `{error: {code, message, details}}`
 * (app/core/errors.py). The `code` is what callers branch on — HTTP status alone
 * cannot tell `user_not_onboarded` apart from any other 403.
 */
function extractBackendError(data: unknown): { code: string; message?: string } | undefined {
  if (!data || typeof data !== 'object' || !('error' in data)) return undefined
  const { error } = data as { error: unknown }
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined

  const { code, message } = error as { code: unknown; message?: unknown }
  if (typeof code !== 'string') return undefined
  return { code, message: typeof message === 'string' ? message : undefined }
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

/** Resolved at call time (not module scope) so the message follows the language in effect. */
function defaultMessageFor(kind: ApiError['kind']): string {
  switch (kind) {
    case 'unauthorized':
      return i18n.t('validation:api.unauthorized')
    case 'forbidden':
      return i18n.t('validation:api.forbidden')
    case 'not_found':
      return i18n.t('validation:api.notFound')
    case 'validation':
      return i18n.t('validation:api.validation')
    case 'rate_limited':
      return i18n.t('validation:api.rateLimited')
    case 'server_error':
      return i18n.t('validation:api.serverError')
    default:
      return i18n.t('validation:api.unknown')
  }
}
