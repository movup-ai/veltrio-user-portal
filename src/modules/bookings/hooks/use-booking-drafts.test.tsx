import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const remove = vi.fn()
const toast = vi.fn()

vi.mock('../api/booking-draft.api', () => ({
  bookingDraftApi: {
    remove: (...args: unknown[]) => remove(...args),
  },
  bookingDraftKeys: { all: ['booking-drafts'] },
}))

vi.mock('@/components/ui/use-toast', () => ({ toast: (...args: unknown[]) => toast(...args) }))

const { useDeleteBookingDraft } = await import('./use-booking-drafts')

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  remove.mockReset()
  toast.mockReset()
})

describe('useDeleteBookingDraft', () => {
  it('toasts on its own when the counter discarded the draft deliberately', async () => {
    remove.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useDeleteBookingDraft(), { wrapper: wrapper() })
    result.current.mutate('d1')

    await waitFor(() => expect(toast).toHaveBeenCalledTimes(1))
  })

  it('stays quiet when silent, so the caller can report what actually happened', async () => {
    // Submitting a draft as a booking is not "discarding" it, and a failure there means a
    // possible duplicate booking — which the form reports itself.
    remove.mockRejectedValueOnce(new Error('network'))

    const { result } = renderHook(() => useDeleteBookingDraft({ silent: true }), {
      wrapper: wrapper(),
    })
    result.current.mutate('d1')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast).not.toHaveBeenCalled()
  })

  it('rejects through mutateAsync so the caller can await and catch it', async () => {
    remove.mockRejectedValueOnce(new Error('network'))

    const { result } = renderHook(() => useDeleteBookingDraft({ silent: true }), {
      wrapper: wrapper(),
    })

    await expect(result.current.mutateAsync('d1')).rejects.toThrow('network')
  })
})
