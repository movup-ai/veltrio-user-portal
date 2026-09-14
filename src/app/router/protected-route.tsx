import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/state/auth.store'

/**
 * Centralizes the authenticated-route gate so individual pages never have
 * to check auth state themselves. `status === 'idle'` covers the brief
 * window while a stored token is still being validated against /auth/me.
 */
export function ProtectedRoute() {
  const status = useAuthStore((state) => state.status)
  const location = useLocation()

  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
