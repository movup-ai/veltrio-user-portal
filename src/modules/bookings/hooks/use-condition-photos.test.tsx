import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConditionPhoto } from '../types/booking.types'

const list = vi.fn<() => Promise<ConditionPhoto[]>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('../api/booking-condition-photo.api', () => ({ conditionPhotoApi: { list: () => list() } }))

const { useConditionPhotos } = await import('./use-condition-photos')

describe('useConditionPhotos', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    list.mockReset()
    list.mockResolvedValue([])
  })
  afterEach(() => vi.useRealTimers())

  it('asks for new links on a page left open, before the ones on screen expire', async () => {
    // As the app sets it: with focus refetching off, nothing else re-reads an open page.
    const client = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } })
    renderHook(() => useConditionPhotos('BK-10001', true), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(list).toHaveBeenCalledTimes(1)

    await act(() => vi.advanceTimersByTimeAsync(31 * 60_000))

    expect(list).toHaveBeenCalledTimes(2)
  })
})
