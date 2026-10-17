import { useEffect } from 'react'
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
  const queryClient = useQueryClient()
  const user = useMe().data?.user
  const shown = isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : undefined
  const stored = user?.locale

  useEffect(() => {
    if (!user || !shown || stored === shown) return
    // A failure keeps emails in the old language until the next switch; not worth a toast.
    authApi
      .updateLocale(shown)
      .then((me) => queryClient.setQueriesData({ queryKey: ME_QUERY_KEY }, me))
      .catch(() => undefined)
  }, [user, shown, stored, queryClient])
}
