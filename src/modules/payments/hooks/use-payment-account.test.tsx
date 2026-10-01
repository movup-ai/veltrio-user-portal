import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CheckoutMethodStatus, PaymentAccount } from '../types/payment-account.types'

const account = vi.fn<() => Promise<PaymentAccount>>()
const refreshAccount = vi.fn<() => Promise<PaymentAccount>>()
const methods = vi.fn<() => Promise<CheckoutMethodStatus[]>>()

vi.mock('../api/payment.api', () => ({
  paymentApi: {
    account: () => account(),
    refreshAccount: () => refreshAccount(),
    methods: () => methods(),
  },
}))

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

const { paymentAccountKeys, usePaymentAccount, usePaymentMethods, useRefreshPaymentAccount } =
  await import('./use-payment-account')

const BEFORE: PaymentAccount = {
  available: true,
  connected: true,
  disconnected: false,
  cardPayments: 'pending',
  requirements: 'currently_due',
}
const AFTER: PaymentAccount = {
  ...BEFORE,
  cardPayments: 'active',
  payouts: 'active',
  requirements: undefined,
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

describe('useRefreshPaymentAccount', () => {
  it('is not overwritten by an account read that started before it', async () => {
    // Back from Stripe, the page loads the account and refreshes it at once. The load read the
    // old status; landing last, it used to replace the refreshed one with "Action needed".
    let finishLoad: (value: PaymentAccount) => void = () => {}
    account.mockReturnValueOnce(new Promise((resolve) => (finishLoad = resolve)))
    refreshAccount.mockResolvedValueOnce(AFTER)
    const { client, wrapper } = setup()

    renderHook(() => usePaymentAccount(), { wrapper })
    const refresh = renderHook(() => useRefreshPaymentAccount(), { wrapper })
    await act(() => refresh.result.current.mutateAsync())
    await act(async () => finishLoad(BEFORE))

    await waitFor(() => expect(client.getQueryData(paymentAccountKeys.account)).toEqual(AFTER))
  })

  it('reloads the checkout methods, which can change with the account', async () => {
    methods.mockResolvedValue([{ type: 'card', available: true }])
    refreshAccount.mockResolvedValueOnce(AFTER)
    const { wrapper } = setup()

    const list = renderHook(() => usePaymentMethods(), { wrapper })
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true))
    const refresh = renderHook(() => useRefreshPaymentAccount(), { wrapper })
    await act(() => refresh.result.current.mutateAsync())

    await waitFor(() => expect(methods).toHaveBeenCalledTimes(2))
  })
})
