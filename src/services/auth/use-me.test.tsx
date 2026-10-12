import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authApi, type MeResponse } from './auth.api'
import { ME_QUERY_KEY, useMe } from './use-me'

const auth = vi.hoisted(() => ({ isLoaded: true, isSignedIn: true, userId: 'user-a' }))
vi.mock('@clerk/clerk-react', () => ({ useAuth: () => auth }))
vi.mock('./auth.api', () => ({ authApi: { getMe: vi.fn() } }))

function account(id: string): MeResponse {
  return { user: { id, fullName: id, email: `${id}@example.com` }, membership: null }
}

beforeEach(() => {
  Object.assign(auth, { isLoaded: true, isSignedIn: true, userId: 'user-a' })
  vi.mocked(authApi.getMe).mockReset()
})

function setup() {
  const client = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, ...renderHook(() => useMe(), { wrapper }) }
}

describe('useMe', () => {
  it('isolates cached accounts when the active Clerk user changes', async () => {
    const a = account('user-a')
    const b = account('user-b')
    vi.mocked(authApi.getMe).mockResolvedValueOnce(a).mockResolvedValueOnce(b)
    const { result, rerender, client } = setup()
    await waitFor(() => expect(result.current.data).toEqual(a))

    auth.userId = 'user-b'
    rerender()
    expect(result.current.data).toBeUndefined()
    await waitFor(() => expect(result.current.data).toEqual(b))
    expect(client.getQueryData([...ME_QUERY_KEY, 'user-a'])).toEqual(a)

    auth.userId = 'user-a'
    rerender()
    expect(result.current.data).toEqual(a)
    expect(authApi.getMe).toHaveBeenCalledTimes(2)
  })

  it.each([
    { isLoaded: false, isSignedIn: false },
    { isLoaded: true, isSignedIn: false },
  ])('does not fetch while auth is %j', (state) => {
    Object.assign(auth, state)
    const { result } = setup()
    expect(result.current.fetchStatus).toBe('idle')
    expect(authApi.getMe).not.toHaveBeenCalled()
  })

  it('does not retry a failed account lookup', async () => {
    vi.mocked(authApi.getMe).mockRejectedValue(new Error('user_not_onboarded'))
    const { result } = setup()
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(authApi.getMe).toHaveBeenCalledOnce()
  })
})
