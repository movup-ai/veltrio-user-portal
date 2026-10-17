import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { isLanguage } from '@/i18n'
import { authApi } from './auth.api'
import { ME_QUERY_KEY, useMe } from './use-me'

/**
 * Tells the API the language the portal shows whenever it differs from the one on the account,
 * so notification emails arrive in it: on first sign-in, and after each switch.
 */
export function useLocaleSync() {
  const { i18n } = useTranslation()
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  const user = useMe().data?.user
  const shown = isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : undefined
  const stored = user?.locale

  useEffect(() => {
    if (!userId || !user || !shown || stored === shown) return
    // The answer is this account's: after a sign-out it would overwrite whoever signed in next.
    let cancelled = false
    // A failure keeps emails in the old language until the next switch; not worth a toast.
    authApi
      .updateLocale(shown)
      .then((me) => {
        if (!cancelled) queryClient.setQueryData([...ME_QUERY_KEY, userId], me)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [userId, user, shown, stored, queryClient])
}
