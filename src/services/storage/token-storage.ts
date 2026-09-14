/**
 * Isolates where the access token physically lives so the storage
 * mechanism (localStorage today) can change without touching callers.
 */
const ACCESS_TOKEN_KEY = 'veltrio.access_token'

export const tokenStorage = {
  get(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },
  set(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
  },
  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  },
}
