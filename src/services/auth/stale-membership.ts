import { ApiError } from '@/types/api'

/**
 * Whether an API error means the cached account is out of date: the role was changed or the
 * person removed since `/auth/me` was read, which is cached for the session.
 */
export function isStaleMembership(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.code === 'insufficient_role' || error.code === 'tenant_not_found')
  )
}
