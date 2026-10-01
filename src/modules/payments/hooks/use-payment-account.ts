import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import { paymentApi } from '../api/payment.api'
import type { CheckoutMethod, PaymentAccount } from '../types/payment-account.types'
import { onboardingLinks } from '../utils/payment-account.utils'

export const paymentAccountKeys = {
  account: ['payments', 'account'] as const,
  methods: ['payments', 'account', 'methods'] as const,
}

export function usePaymentAccount() {
  return useQuery({ queryKey: paymentAccountKeys.account, queryFn: paymentApi.account })
}

function failed(title: string) {
  return (error: unknown) => toast({ title, description: normalizeApiError(error).message, variant: 'error' })
}

/** Only for a linked account: the API refuses it otherwise. */
export function usePaymentMethods() {
  return useQuery({ queryKey: paymentAccountKeys.methods, queryFn: paymentApi.methods })
}

export function useEnablePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: paymentApi.enableMethod,
    onSuccess: (methods, method: Exclude<CheckoutMethod, 'card'>) => {
      queryClient.setQueryData(paymentAccountKeys.methods, methods)
      toast({
        title: i18n.t('settings:payments.toast.methodEnabled', {
          method: i18n.t(`settings:payments.methods.${method}`),
        }),
        variant: 'success',
      })
    },
    onError: failed(i18n.t('settings:payments.toast.methodFailed')),
  })
}

/** Sends the owner to Stripe's form. The link is single-use, so one is fetched per click. */
function useOnboardingRedirect(link: typeof paymentApi.onboardingLink) {
  return useMutation({
    mutationFn: () => link(onboardingLinks(window.location.origin)),
    onSuccess: (url) => window.location.assign(url),
    onError: failed(i18n.t('settings:payments.toast.connectFailed')),
  })
}

export function useStartOnboarding() {
  return useOnboardingRedirect(paymentApi.onboardingLink)
}

/** A new account in place of the disconnected one, then straight to Stripe to set it up. */
export function useStartNewAccount() {
  return useOnboardingRedirect(paymentApi.newAccountLink)
}

/**
 * Refresh, disconnect and reconnect all answer with the account, so the cache is set from that
 * answer. An account read still in flight is cancelled first: it may have read the row before
 * this change, and landing after it would put the old status back.
 */
function useAccountChange(
  change: () => Promise<PaymentAccount>,
  titles: { success?: string; error: string },
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: change,
    onSuccess: async (account) => {
      await queryClient.cancelQueries({ queryKey: paymentAccountKeys.account, exact: true })
      queryClient.setQueryData(paymentAccountKeys.account, account)
      // Which methods are on can change with the account: capabilities, or settings edited
      // while it was unlinked.
      void queryClient.invalidateQueries({ queryKey: paymentAccountKeys.methods })
      if (titles.success) toast({ title: titles.success, variant: 'success' })
    },
    onError: failed(titles.error),
  })
}

export function useDisconnectPaymentAccount() {
  return useAccountChange(paymentApi.disconnect, {
    success: i18n.t('settings:payments.toast.disconnected'),
    error: i18n.t('settings:payments.toast.disconnectFailed'),
  })
}

export function useReconnectPaymentAccount() {
  return useAccountChange(paymentApi.reconnect, {
    success: i18n.t('settings:payments.toast.reconnected'),
    error: i18n.t('settings:payments.toast.reconnectFailed'),
  })
}

export function useRefreshPaymentAccount() {
  return useAccountChange(paymentApi.refreshAccount, {
    error: i18n.t('settings:payments.toast.refreshFailed'),
  })
}
