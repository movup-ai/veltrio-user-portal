import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toast } from '@/components/ui/use-toast'
import { ApiError } from '@/types/api'
import type { BookingVerification } from '../types/booking.types'

const completeInsurance = vi.fn()

vi.mock('../api/verification.api', () => ({
  verificationApi: {
    completeInsurance: (...args: unknown[]) => completeInsurance(...args),
  },
}))

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

const { useInsuranceResults, useInsuranceReturn, verificationKeys } = await import(
  './use-verification'
)

function check(overrides: Partial<BookingVerification> = {}): BookingVerification {
  return {
    id: 'v1',
    status: 'running',
    recordsFound: false,
    hasReport: false,
    canReorder: false,
    reused: false,
    createdAt: '2026-09-30T10:00:00Z',
    updatedAt: '2026-09-30T10:00:00Z',
    ...overrides,
  }
}

const CARD = verificationKeys.detail('BK-1', 'insurance')
const DONE = { verificationId: 'v1' }
const RETURN_URL =
  '/insurance/return?returnTo=%2Fapp%2Fbookings%2FBK-1' +
  '&tenantId=t1&verificationId=v1&status=complete&authCode=cod_1'

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  client.setQueryData(CARD, check())
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

/** The other tab, as the page the counter started from hears it. */
function fromReturnTab(message: unknown) {
  const channel = new BroadcastChannel('veltrio:insurance')
  channel.postMessage(message)
  channel.close()
}

/**
 * The return page loaded at `url`. The browser lets a tab close itself only when a script
 * opened it: the counter's, not a renter's link opened on their phone.
 */
function returnTab({ closable, url = RETURN_URL }: { closable: boolean; url?: string }) {
  window.history.replaceState(null, '', url)
  let closed = false
  const close = vi.spyOn(window, 'close').mockImplementation(() => {
    closed = closable
  })
  // jsdom keeps `closed` on the prototype, where a spy cannot reach it.
  Object.defineProperty(window, 'closed', { configurable: true, get: () => closed })
  return { close }
}

afterEach(() => {
  delete (window as { closed?: boolean }).closed
  vi.restoreAllMocks()
  vi.mocked(toast).mockReset()
  completeInsurance.mockReset()
  window.history.replaceState(null, '', '/')
})

describe('the tab the counter started from', () => {
  it('re-reads the check as staff once the return tab has finished it, and says so', async () => {
    // The public completion carries no verdict, so the card gets it from its own staff read.
    const { client, wrapper } = setup()
    renderHook(() => useInsuranceResults(), { wrapper })

    fromReturnTab({ type: 'finished', outcome: DONE })

    await waitFor(() => expect(client.getQueryState(CARD)?.isInvalidated).toBe(true))
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Insurance checked' }))
  })

  it('reports a check being finished until the verdict arrives', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useInsuranceResults(), { wrapper })

    fromReturnTab({ type: 'completing' })
    await waitFor(() => expect(result.current).toBe(true))

    fromReturnTab({ type: 'finished', outcome: DONE })
    await waitFor(() => expect(result.current).toBe(false))
  })
})

describe('the return page', () => {
  it('finishes the check with the ids the API wrote, hands the verdict over and closes', async () => {
    const { close } = returnTab({ closable: true })
    const heard: unknown[] = []
    const listener = new BroadcastChannel('veltrio:insurance')
    listener.onmessage = ({ data }) => heard.push(data)
    completeInsurance.mockResolvedValue(DONE)

    const { wrapper } = setup()
    const { result } = renderHook(() => useInsuranceReturn(), { wrapper })

    await waitFor(() => expect(close).toHaveBeenCalled())
    expect(completeInsurance).toHaveBeenCalledWith({
      tenantId: 't1',
      verificationId: 'v1',
      authCode: 'cod_1',
    })
    await waitFor(() =>
      expect(heard).toEqual([{ type: 'completing' }, { type: 'finished', outcome: DONE }]),
    )
    // Closed, so there is nothing to show.
    expect(result.current).toBeUndefined()
    listener.close()
  })

  it('shows the outcome in a tab the browser will not close, such as the renter’s phone', async () => {
    // Before, the return page sat behind the login, so a renter sent the link never finished.
    returnTab({ closable: false })
    completeInsurance.mockResolvedValue(DONE)

    const { wrapper } = setup()
    const { result } = renderHook(() => useInsuranceReturn(), { wrapper })

    await waitFor(() => expect(result.current).toEqual({ type: 'finished', outcome: DONE }))
  })

  it('spends nothing when the renter backed out', async () => {
    returnTab({ closable: false, url: '/insurance/return?tenantId=t1&verificationId=v1&status=exit' })

    const { wrapper } = setup()
    let hook!: { current: unknown }
    await act(async () => {
      hook = renderHook(() => useInsuranceReturn(), { wrapper }).result
    })

    expect(hook.current).toEqual({ type: 'unfinished' })
    expect(completeInsurance).not.toHaveBeenCalled()
  })

  it('says the link was replaced when staff have since opened a newer session', async () => {
    // Reported as done, the renter would stop while the newer check waited for them.
    returnTab({ closable: false })
    completeInsurance.mockRejectedValue(
      new ApiError('conflict', 'This link has been replaced.', {
        status: 409,
        code: 'verification_session_closed',
      }),
    )

    const { wrapper } = setup()
    const { result } = renderHook(() => useInsuranceReturn(), { wrapper })

    await waitFor(() => expect(result.current).toEqual({ type: 'replaced' }))
  })
})
