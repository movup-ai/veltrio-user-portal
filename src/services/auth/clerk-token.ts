import type { useClerk } from '@clerk/clerk-react'

type ClerkInstance = ReturnType<typeof useClerk>

/**
 * Bridges Clerk's React-owned session into the plain axios instance.
 *
 * Clerk session tokens are short-lived (~60s) and refreshed in the background,
 * so the request interceptor mints a fresh one per request instead of reading a
 * stored value — nothing about the session is persisted by us. The instance is
 * registered once by ClerkRouterProvider; `clerk.session` is read at call time,
 * so it always reflects the current session.
 */
let clerk: ClerkInstance | null = null

export const clerkToken = {
  setInstance(instance: ClerkInstance | null): void {
    clerk = instance
  },

  async get(): Promise<string | null> {
    return (await clerk?.session?.getToken()) ?? null
  },
}
