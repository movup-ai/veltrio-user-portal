/**
 * Whether a module should serve local fixtures instead of calling the real API.
 *
 * The vehicles module no longer consults this — it always talks to the backend. Everything
 * else still does: auth (there is no /auth/login endpoint), and the modules whose endpoints
 * do not exist yet (bookings, customers, payments, pricing, locations and the dashboard).
 * Remove it per module as each one lands.
 */
export const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

/** Simulates network latency for mock API functions so loading states are visible during development. */
export function mockDelay<T>(data: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}
