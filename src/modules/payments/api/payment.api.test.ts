import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/services/api/client'
import type { PaymentListParams } from '../types/payment.types'
import { paymentApi } from './payment.api'
import { toPaymentListQuery, type PaymentRowWire } from './payment.mapper'

vi.mock('@/services/api/client', () => ({ apiClient: { get: vi.fn() } }))
const get = vi.mocked(apiClient.get)
const params: PaymentListParams = {
  page: 4,
  pageSize: 10,
  search: 'Renter',
  tab: 'Paid',
  state: 'paid',
  method: 'card',
  period: { from: '2026-10-01', to: '2026-10-12' },
}
const row: PaymentRowWire = {
  id: 'p1',
  kind: 'charge',
  state: 'paid',
  amountCents: 12345,
  refundedCents: 0,
  currency: 'USD',
  method: 'card',
  at: '2026-10-10T12:00:00Z',
  bookingReference: 'BK-10001',
  customerName: 'Renter',
}

beforeEach(() => get.mockReset())

describe('paymentApi.page', () => {
  it('fetches the last valid page with the same filters before returning its rows', async () => {
    get.mockResolvedValueOnce({ data: { items: [], total: 21 } })
    get.mockResolvedValueOnce({ data: { items: [row], total: 21 } })

    const result = await paymentApi.page(params)

    expect(get).toHaveBeenCalledTimes(2)
    expect(get).toHaveBeenNthCalledWith(2, '/payments', {
      params: { ...toPaymentListQuery(params), offset: 20 },
    })
    expect(result).toMatchObject({
      items: [{ id: 'p1', amount: 123.45 }],
      page: 3,
      pageSize: 10,
      total: 21,
      totalPages: 3,
    })
    expect(params.page).toBe(4)
  })

  it('keeps a valid page with no extra request', async () => {
    get.mockResolvedValueOnce({ data: { items: [row], total: 31 } })
    expect(await paymentApi.page(params)).toMatchObject({ page: 4, totalPages: 4 })
    expect(get).toHaveBeenCalledOnce()
  })

  it('refetches page one when the result becomes empty', async () => {
    get.mockResolvedValue({ data: { items: [], total: 0 } })
    expect(await paymentApi.page(params)).toEqual({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    })
    expect(get).toHaveBeenCalledTimes(2)
    expect(get).toHaveBeenLastCalledWith('/payments', {
      params: { ...toPaymentListQuery(params), offset: 0 },
    })
  })

  it('handles a total that shrinks again during the refetch', async () => {
    get.mockResolvedValueOnce({ data: { items: [], total: 21 } })
    get.mockResolvedValueOnce({ data: { items: [], total: 10 } })
    get.mockResolvedValueOnce({ data: { items: [row], total: 10 } })
    expect(await paymentApi.page(params)).toMatchObject({
      page: 1,
      total: 10,
      totalPages: 1,
      items: [{ id: 'p1' }],
    })
    expect(get).toHaveBeenCalledTimes(3)
  })

  it('propagates a failed refetch instead of reporting an empty valid page', async () => {
    get.mockResolvedValueOnce({ data: { items: [], total: 21 } })
    get.mockRejectedValueOnce(new Error('Network failure'))
    await expect(paymentApi.page(params)).rejects.toThrow('Network failure')
  })
})
