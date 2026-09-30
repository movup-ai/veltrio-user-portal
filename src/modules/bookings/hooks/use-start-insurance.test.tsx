import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toast } from '@/components/ui/use-toast'

const startInsurance = vi.fn()

vi.mock('../api/verification.api', () => ({
  verificationApi: {
    startInsurance: (...args: unknown[]) => startInsurance(...args),
  },
}))

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

const { useStartInsurance } = await import('./use-verification')

function wrapper() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const ORDER = {
  name: 'Marisol Vega',
  dateOfBirth: '1991-04-17',
  redirectUri: 'https://portal.test/app/verification',
}

afterEach(() => {
  vi.restoreAllMocks()
  startInsurance.mockReset()
})

describe('starting an insurance check', () => {
  it('says what is happening in the new tab while the session is fetched', async () => {
    // Axle can take seconds to answer, and until then the tab sat on a bare about:blank.
    const tab = {
      document: document.implementation.createHTMLDocument(''),
      location: { href: '' },
    } as unknown as Window
    vi.spyOn(window, 'open').mockReturnValue(tab)
    let answer: (session: unknown) => void = () => {}
    startInsurance.mockReturnValue(new Promise((resolve) => (answer = resolve)))

    const { result } = renderHook(() => useStartInsurance(), { wrapper: wrapper() })
    result.current.start(ORDER)

    await waitFor(() => expect(startInsurance).toHaveBeenCalled())
    expect(tab.document.body.textContent).toBe('Opening a secure connection to your insurer…')

    answer({ verification: {}, ignitionUri: 'https://ignition.axle.test/abc' })
    await waitFor(() => expect(tab.location.href).toBe('https://ignition.axle.test/abc'))
  })

  it('stays on the page when the browser blocks the new tab', async () => {
    // Leaving for Axle threw away a booking form half filled in. The session is still open, and
    // Send link hands it over without leaving.
    vi.spyOn(window, 'open').mockReturnValue(null)
    startInsurance.mockResolvedValue({ verification: {}, ignitionUri: 'https://ignition.axle.test/abc' })

    const { result } = renderHook(() => useStartInsurance(), { wrapper: wrapper() })
    result.current.start(ORDER)

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'The browser blocked the new tab' }),
      ),
    )
  })

  it('opens the tab inside the click, before the order has been validated', () => {
    // Opened after an await, some browsers treat the tab as an unprompted popup and block it.
    const open = vi.spyOn(window, 'open').mockReturnValue(null)

    const { result } = renderHook(() => useStartInsurance(), { wrapper: wrapper() })
    result.current.start(() => new Promise(() => {}))

    expect(open).toHaveBeenCalledOnce()
  })

  it('closes the tab and starts nothing when the order does not validate', async () => {
    const close = vi.fn()
    vi.spyOn(window, 'open').mockReturnValue({ close } as unknown as Window)

    const { result } = renderHook(() => useStartInsurance(), { wrapper: wrapper() })
    result.current.start(async () => undefined)

    await waitFor(() => expect(close).toHaveBeenCalled())
    expect(startInsurance).not.toHaveBeenCalled()
  })
})
