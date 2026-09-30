import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const report = vi.fn()

vi.mock('../api/screening.api', () => ({
  screeningApi: {
    report: (...args: unknown[]) => report(...args),
  },
}))

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

const { useScreeningReport } = await import('./use-screening')

function wrapper() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const PDF = new Blob(['%PDF-1.4'], { type: 'application/pdf' })

afterEach(() => {
  vi.restoreAllMocks()
  report.mockReset()
})

describe('opening a report', () => {
  it('opens the tab during the click, not after the PDF arrives', async () => {
    // Opening it after an await is what a browser treats as an unprompted popup and blocks:
    // the fetch succeeds, nothing appears, and no error toast fires.
    const order: string[] = []
    vi.spyOn(window, 'open').mockImplementation(() => {
      order.push('open')
      return { location: { href: '' } } as unknown as Window
    })
    report.mockImplementation(() => {
      order.push('fetch')
      return Promise.resolve(PDF)
    })

    const { result } = renderHook(() => useScreeningReport('BK-1'), { wrapper: wrapper() })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(order).toEqual(['open', 'fetch'])
  })

  it('does not navigate this tab when window.open returns null', async () => {
    // `noopener` makes some browsers return null for a tab they did open, so null is not
    // proof of a block. Navigating here would replace an unsaved booking form with a PDF.
    vi.spyOn(window, 'open').mockReturnValue(null)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const before = window.location.href
    report.mockResolvedValue(PDF)

    const { result } = renderHook(() => useScreeningReport('BK-1'), { wrapper: wrapper() })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(window.location.href).toBe(before)
    // Downloaded instead, which reaches the report without losing the page.
    expect(click).toHaveBeenCalled()
  })

  it('closes the blank tab when the fetch fails', async () => {
    const close = vi.fn()
    vi.spyOn(window, 'open').mockReturnValue({ close } as unknown as Window)
    report.mockRejectedValue(new Error('nope'))

    const { result } = renderHook(() => useScreeningReport('BK-1'), { wrapper: wrapper() })
    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(close).toHaveBeenCalled()
  })
})
