import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MeResponse } from './auth.api'

let userId = 'user_a'
const getMe = vi.fn<() => Promise<MeResponse>>()

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, userId }),
}))
vi.mock('./auth.api', () => ({ authApi: { getMe: () => getMe() } }))

const { useMe } = await import('./use-me')

describe('useMe', () => {
  it('does not hand the next Clerk user the previous one’s account', async () => {
    // The cache is only cleared from an effect, so the render where the user changes used to
    // read the last account under the shared key and pass the route's membership check.
    const first = { user: { id: 'a' } } as MeResponse
    getMe.mockResolvedValueOnce(first)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )

    const { result, rerender } = renderHook(() => useMe(), { wrapper })
    await waitFor(() => expect(result.current.data).toBe(first))

    getMe.mockReturnValueOnce(new Promise(() => {}))
    userId = 'user_b'
    rerender()

    expect(result.current.data).toBeUndefined()
    expect(result.current.isPending).toBe(true)
  })
})
