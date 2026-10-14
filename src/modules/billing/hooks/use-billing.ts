import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import { billingApi } from '../api/billing.api'
import { TOP_UP_SETTLE_MS } from '../constants/billing.constants'
import type { AutoRecharge, Billing, PlanChoice } from '../types/billing.types'
import { checkoutLinks, packCheckoutLinks, portalReturnUrl, rechargesNow } from '../utils/billing.utils'

export const billingKeys = {
  billing: ['billing'] as const,
  history: ['billing', 'history'] as const,
}

/**
 * Read the plan, its usage and the history again: the fleet and its branches are what a plan is
 * sized by, and a paid check takes credits and can set off an auto-recharge.
 */
export function billingChanged(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: billingKeys.billing })
}

/**
 * Read again on coming back to the tab: the plan changes where this page cannot see it, in
 * Stripe's pages and when the owner subscribes while a colleague has the portal open.
 */
export function useBilling() {
  return useQuery({ queryKey: billingKeys.billing, queryFn: billingApi.get, refetchOnWindowFocus: true })
}

function failed(title: string) {
  return (error: unknown) => toast({ title, description: normalizeApiError(error).message, variant: 'error' })
}

/** Sends the owner to Stripe's checkout for the plan. The page leaves on success. */
export function useStartCheckout() {
  return useMutation({
    mutationFn: (choice: PlanChoice) =>
      billingApi.checkoutLink({ ...choice, ...checkoutLinks(window.location.origin) }),
    onSuccess: (url) => window.location.assign(url),
    onError: failed(i18n.t('settings:billing.toast.checkoutFailed')),
  })
}

/** Sends the owner to Stripe's customer portal, and back to the Billing tab afterwards. */
export function useBillingPortal() {
  return useMutation({
    mutationFn: () => billingApi.portalLink(portalReturnUrl(window.location.origin)),
    onSuccess: (url) => window.location.assign(url),
    onError: failed(i18n.t('settings:billing.toast.portalFailed')),
  })
}

/**
 * A plan change and a refresh both answer with the subscription, so the cache is set from that
 * answer. A read still in flight is cancelled first: it may have read the row before this
 * change, and landing after it would put the old plan back.
 */
function useBillingChange<TArg>(
  change: (arg: TArg) => Promise<Billing>,
  titles: { success?: string; error: string },
  then?: (billing: Billing, queryClient: QueryClient) => void,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: change,
    onSuccess: async (billing) => {
      await queryClient.cancelQueries({ queryKey: billingKeys.billing, exact: true })
      queryClient.setQueryData(billingKeys.billing, billing)
      // What was just done may be on an invoice, or a purchase, the history has not shown.
      void queryClient.invalidateQueries({ queryKey: billingKeys.history })
      if (titles.success) toast({ title: titles.success, variant: 'success' })
      then?.(billing, queryClient)
    },
    onError: failed(titles.error),
  })
}

export function useChangePlan() {
  return useBillingChange(billingApi.changePlan, {
    success: i18n.t('settings:billing.toast.planChanged'),
    error: i18n.t('settings:billing.toast.planFailed'),
  })
}

/** Sends the owner to Stripe's checkout for a credit pack. The page leaves on success. */
export function useBuyPack() {
  return useMutation({
    mutationFn: (pack: string) =>
      billingApi.packCheckoutLink({ pack, ...packCheckoutLinks(window.location.origin) }),
    onSuccess: (url) => window.location.assign(url),
    onError: failed(i18n.t('settings:billing.credits.toast.buyFailed')),
  })
}

/** Adds the credits of the checkout the owner has just come back from. */
export function useConfirmPack() {
  return useBillingChange(billingApi.confirmPack, {
    success: i18n.t('settings:billing.credits.toast.bought'),
    error: i18n.t('settings:billing.credits.toast.confirmFailed'),
  })
}

/**
 * Saving below the line buys a pack at once, in the background: the answer comes back before
 * the purchase does, so the balance is read again once the worker has had time to make it.
 */
export function useSetAutoRecharge() {
  return useBillingChange<AutoRecharge | undefined>(
    billingApi.setAutoRecharge,
    {
      success: i18n.t('settings:billing.credits.toast.autoRechargeSaved'),
      error: i18n.t('settings:billing.credits.toast.autoRechargeFailed'),
    },
    ({ credits }, queryClient) => {
      if (!credits.autoRecharge || !rechargesNow(credits.balance, credits.autoRecharge.below)) return
      window.setTimeout(
        () => void queryClient.invalidateQueries({ queryKey: billingKeys.billing }),
        TOP_UP_SETTLE_MS,
      )
    },
  )
}

/** Only mounted for the owner: the API refuses the history to anyone else. */
export function useBillingHistory() {
  return useQuery({ queryKey: billingKeys.history, queryFn: billingApi.history })
}

export function useRefreshBilling() {
  return useBillingChange<void>(billingApi.refresh, {
    error: i18n.t('settings:billing.toast.refreshFailed'),
  })
}
