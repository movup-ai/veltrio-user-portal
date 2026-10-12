import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { authApi } from './auth.api'

export const ME_QUERY_KEY = ['auth', 'me'] as const

/**
 * The platform account behind the current Clerk session. Fails with
 * `user_not_onboarded` (403) while the Clerk user has no tenant yet, so it is
 * never retried — that state resolves by onboarding, not by asking again.
 */
export function useMe() {
  const { isLoaded, isSignedIn, userId } = useAuth()

  return useQuery({
    // Per Clerk user: the cache is cleared from an effect, a render too late to keep the next
    // account from reading the last one's under a shared key.
    queryKey: [...ME_QUERY_KEY, userId],
    queryFn: authApi.getMe,
    enabled: isLoaded && isSignedIn,
    retry: false,
    staleTime: Infinity,
  })
}
