import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { BookingPayments, ReturnCharge } from '../types/booking-payment.types'

const setReturnCharges = vi.fn<(reference: string, charges: ReturnCharge[]) => Promise<BookingPayments>>()
const captureDeposit = vi.fn<(reference: string, amount: number) => Promise<BookingPayments>>()
const releaseDeposit = vi.fn<(reference: string) => Promise<BookingPayments>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('../api/booking-payment.api', () => ({
  bookingPaymentApi: {
    setReturnCharges: (reference: string, charges: ReturnCharge[]) => setReturnCharges(reference, charges),
    captureDeposit: (reference: string, amount: number) => captureDeposit(reference, amount),
    releaseDeposit: (reference: string) => releaseDeposit(reference),
  },
}))

const { useSettleReturn } = await import('./use-booking-payments')

/** The summary the API answers with once the charges are saved: the deposit as it stands then. */
function saved(total: number, held: number, balance = total): BookingPayments {
  return {
    returnChargesTotal: total,
    // What is still owed of the charges: all of them, until something is taken or paid.
    balance,
    deposit: held > 0 ? { status: 'held', amount: held } : undefined,
  } as unknown as BookingPayments
}

function settle(charges: ReturnCharge[]) {
  const client = new QueryClient()
  const { result } = renderHook(() => useSettleReturn('BK-10001'), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  })
  result.current.mutate(charges)
  return result
}

const DAMAGE: ReturnCharge = { kind: 'damage', amount: 120 }

describe('useSettleReturn', () => {
  beforeEach(() => {
    for (const mock of [setReturnCharges, captureDeposit, releaseDeposit]) mock.mockReset()
    captureDeposit.mockResolvedValue(saved(0, 0))
    releaseDeposit.mockResolvedValue(saved(0, 0))
  })

  it('saves the charges, then captures them from the deposit on hold', async () => {
    setReturnCharges.mockResolvedValue(saved(120, 2000))

    const result = settle([DAMAGE])

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(setReturnCharges).toHaveBeenCalledWith('BK-10001', [DAMAGE])
    expect(captureDeposit).toHaveBeenCalledWith('BK-10001', 120)
    expect(releaseDeposit).not.toHaveBeenCalled()
  })

  it('captures no more than the deposit when the charges run past it', async () => {
    setReturnCharges.mockResolvedValue(saved(2150, 2000))

    const result = settle([{ kind: 'damage', amount: 2150 }])

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(captureDeposit).toHaveBeenCalledWith('BK-10001', 2000)
  })

  it('captures only what is still owed when part of the charges was paid another way', async () => {
    // An earlier settle saved $200 and failed at the capture; the renter has since paid $80 in cash.
    setReturnCharges.mockResolvedValue(saved(200, 2000, 120))

    const result = settle([{ kind: 'damage', amount: 200 }])

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(captureDeposit).toHaveBeenCalledWith('BK-10001', 120)
  })

  it('releases the deposit when the charges were already paid in full another way', async () => {
    setReturnCharges.mockResolvedValue(saved(80, 2000, 0))

    const result = settle([{ kind: 'damage', amount: 80 }])

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(captureDeposit).not.toHaveBeenCalled()
    expect(releaseDeposit).toHaveBeenCalledWith('BK-10001')
  })

  it('releases the deposit when nothing is charged', async () => {
    setReturnCharges.mockResolvedValue(saved(0, 2000))

    const result = settle([])

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(releaseDeposit).toHaveBeenCalledWith('BK-10001')
    expect(captureDeposit).not.toHaveBeenCalled()
  })

  it('only saves the charges when no deposit is on hold', async () => {
    setReturnCharges.mockResolvedValue(saved(120, 0))

    const result = settle([DAMAGE])

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(captureDeposit).not.toHaveBeenCalled()
    expect(releaseDeposit).not.toHaveBeenCalled()
  })

  it('does not touch the deposit when the charges could not be saved', async () => {
    setReturnCharges.mockRejectedValue(new Error('booking_closed'))

    const result = settle([DAMAGE])

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(captureDeposit).not.toHaveBeenCalled()
    expect(releaseDeposit).not.toHaveBeenCalled()
  })
})
