import type { AxiosInstance } from 'axios'
import { clerkToken } from '@/services/auth/clerk-token'
import { useOrganizationStore } from '@/state/organization.store'
import { normalizeApiError } from './errors'

export function attachInterceptors(instance: AxiosInstance): void {
  instance.interceptors.request.use(async (config) => {
    const token = await clerkToken.get()
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }

    // The backend requires this whenever the user belongs to more than one
    // tenant, and validates it against their memberships either way.
    const tenantId = useOrganizationStore.getState().activeOrganizationId
    if (tenantId) {
      config.headers.set('X-Tenant-Id', tenantId)
    }

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
