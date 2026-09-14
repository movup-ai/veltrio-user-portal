import { apiClient } from '@/services/api/client'
import { mockDelay, useMocks } from '@/lib/mock'
import type { OrganizationMembership, Permission, User } from '@/types/user'

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  accessToken: string
  memberships: OrganizationMembership[]
}

const ALL_PERMISSIONS: Permission[] = [
  'vehicles.read',
  'vehicles.create',
  'vehicles.update',
  'vehicles.delete',
  'bookings.read',
  'bookings.create',
  'bookings.update',
  'bookings.cancel',
  'customers.read',
  'customers.create',
  'customers.update',
  'payments.read',
  'payments.refund',
  'locations.read',
  'locations.manage',
  'pricing.read',
  'pricing.manage',
  'settings.manage',
  'users.manage',
]

/**
 * Dev-only stand-in for the FastAPI auth endpoints (gated by VITE_USE_MOCKS,
 * see .env.example). Accepts any email/password so the app is explorable
 * before the backend exists — swap this out once /auth/login is live.
 */
function mockLogin(payload: LoginPayload): LoginResponse {
  return {
    user: { id: 'usr_dev', email: payload.email, fullName: 'Diego Rivas' },
    accessToken: 'dev-mock-token',
    memberships: [
      {
        organizationId: 'org_sunstate',
        organizationName: 'Sunstate Car Co.',
        role: 'owner',
        permissions: ALL_PERMISSIONS,
      },
    ],
  }
}

/**
 * Thin wrapper around the not-yet-finalized FastAPI auth endpoints.
 * Shape is a best guess documented here so it's easy to update once the
 * backend contract lands — nothing outside this file should assume
 * these exact fields.
 */
export const authApi = {
  login: (payload: LoginPayload) => {
    if (useMocks) return mockDelay(mockLogin(payload))
    return apiClient.post<LoginResponse>('/auth/login', payload).then((r) => r.data)
  },

  logout: () => {
    if (useMocks) return mockDelay(undefined)
    return apiClient.post<void>('/auth/logout').then((r) => r.data)
  },

  getCurrentUser: () => {
    if (useMocks) return mockDelay(mockLogin({ email: 'diego@sunstatecarco.com', password: '' }))
    return apiClient.get<LoginResponse>('/auth/me').then((r) => r.data)
  },
}
