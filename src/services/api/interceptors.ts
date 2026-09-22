import type { AxiosInstance } from 'axios'
import { clerkToken } from '@/services/auth/clerk-token'
import { normalizeApiError } from './errors'

export function attachInterceptors(instance: AxiosInstance): void {
  instance.interceptors.request.use(async (config) => {
    const token = await clerkToken.get()
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }

    // No tenant header: an account belongs to exactly one company, so the API derives it
    // from the token. Sending one would be ignored, and offering it would imply a choice
    // the client does not have.
    return config
  })

  // A 401 is not handled here: Clerk owns the session lifecycle, so an expired
  // token is refreshed on the next request and a revoked one flips the Clerk
  // state that ProtectedRoute already watches.
  instance.interceptors.response.use(
    (response) => response,
    (error: unknown) => Promise.reject(normalizeApiError(error)),
  )
}
