/**
 * Whether a module should serve local fixtures instead of calling the real API.
 *
 * The vehicles, locations and bookings modules no longer consult this — they always talk to
 * the backend, as does the customer lookup the booking form uses. Everything else still does:
 * auth (there is no /auth/login endpoint), and the modules whose endpoints do not exist yet
 * (the customers page, payments, pricing and the dashboard). Remove it per module as each lands.
 */
export const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

/** Simulates network latency for mock API functions so loading states are visible during development. */
export function mockDelay<T>(data: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}
