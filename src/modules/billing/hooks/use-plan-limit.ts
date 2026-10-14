import { usePlanLimitStore } from '@/state/plan-limit.store'
import { planLimitFor, planLimitFromError } from '../utils/billing.utils'
import { useBilling } from './use-billing'

/**
 * Opens the plan-limit dialog when `error` is the API refusing an add for the plan. True when
 * it did, so the caller skips its own toast: that one would only repeat the API's English text.
 */
export function showPlanLimit(error: unknown): boolean {
  const limit = planLimitFromError(error)
  if (limit) usePlanLimitStore.getState().show(limit)
  return limit !== undefined
}

/**
 * Checks the plan before an add starts, so the owner is not sent through a long form only to
 * have it refused. The returned function is true, with the dialog open, when it would be.
 */
export function usePlanLimitGuard() {
  const { data: billing } = useBilling()
  return (what: 'vehicles' | 'branches', adding = 1): boolean => {
    const limit = planLimitFor(billing, what, adding)
    if (limit) usePlanLimitStore.getState().show(limit)
    return limit !== undefined
  }
}
