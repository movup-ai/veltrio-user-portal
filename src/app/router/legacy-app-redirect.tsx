import { Navigate, useLocation } from 'react-router-dom'

/**
 * Pages used to live under /app. Links made before that changed, such as bookmarks, sent links and
 * the Stripe and insurance return URLs, still land on the same page, query and all.
 */
export function LegacyAppRedirect() {
  const { pathname, search, hash } = useLocation()
  return <Navigate to={`${pathname.replace(/^\/app(?=\/|$)/, '') || '/'}${search}${hash}`} replace />
}
