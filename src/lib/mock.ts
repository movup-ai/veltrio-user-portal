/** Whether modules should serve local dev fixtures instead of calling the real API. See .env.example. */
export const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

/** Simulates network latency for mock API functions so loading states are visible during development. */
export function mockDelay<T>(data: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}
