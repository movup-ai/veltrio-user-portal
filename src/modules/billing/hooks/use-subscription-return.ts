import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SUBSCRIPTION_RETURN_PARAMS } from '../utils/billing.utils'
import { useRefreshBilling } from './use-billing'

/**
 * Reads the subscription from Stripe once the owner is back from its checkout or portal, since the
 * event reporting the change can arrive after them. Returns the refresh, so a page can wait on it.
 */
export function useSubscriptionReturn() {
  const refresh = useRefreshBilling()
  const [params, setParams] = useSearchParams()
  const handled = useRef(false)

  const returned = SUBSCRIPTION_RETURN_PARAMS.some((param) => params.has(param))
  useEffect(() => {
    if (!returned || handled.current) return
    handled.current = true
    // Only the markers handled here: a credits purchase may have come back with them.
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        SUBSCRIPTION_RETURN_PARAMS.forEach((param) => next.delete(param))
        return next
      },
      { replace: true },
    )
    refresh.mutate()
  }, [returned, setParams, refresh])

  return refresh
}
