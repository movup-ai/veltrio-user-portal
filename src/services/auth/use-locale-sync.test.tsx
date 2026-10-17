import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import type { MeResponse } from './auth.api'
import { useLocaleSync } from './use-locale-sync'

const updateLocale = vi.fn<(locale: string) => Promise<MeResponse>>()
let me: MeResponse | undefined

vi.mock('./auth.api', () => ({ authApi: { updateLocale: (locale: string) => updateLocale(locale) } }))
vi.mock('./use-me', () => ({ ME_QUERY_KEY: ['auth', 'me'], useMe: () => ({ data: me }) }))
vi.mock('@clerk/clerk-react', () => ({ useAuth: () => ({ userId: 'user_a' }) }))

function account(locale: 'en' | 'es' | null): MeResponse {
  return { user: { id: 'u-1', email: 'sam@coastline.test', fullName: 'Sam', locale }, membership: null }
}

function sync(queryClient = new QueryClient()) {
  return renderHook(() => useLocaleSync(), {
    wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  })
}

afterEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('en')
})

describe('useLocaleSync', () => {
  it('reports the language on first sign-in, when the account has none', async () => {
    me = account(null)
    updateLocale.mockResolvedValue(account('en'))
    sync()

    await waitFor(() => expect(updateLocale).toHaveBeenCalledWith('en'))
  })

  it('reports a switch to Spanish', async () => {
    me = account('en')
    updateLocale.mockResolvedValue(account('es'))
    await i18n.changeLanguage('es')
    sync()

    await waitFor(() => expect(updateLocale).toHaveBeenCalledWith('es'))
  })

  it('says nothing when the account already has the language shown', () => {
    me = account('en')
    sync()

    expect(updateLocale).not.toHaveBeenCalled()
  })
})

describe('useLocaleSync across accounts', () => {
  const other = {
    user: { id: 'u-2', email: 'ana@other.test', fullName: 'Ana', locale: 'en' as const },
    membership: null,
  }

  it("writes the answer to the signed-in account's entry only", async () => {
    // Another account's entry can still be cached after switching accounts in one tab.
    const queryClient = new QueryClient()
    queryClient.setQueryData(['auth', 'me', 'user_b'], other)
    me = account(null)
    updateLocale.mockResolvedValue(account('en'))
    sync(queryClient)

    await waitFor(() => expect(queryClient.getQueryData(['auth', 'me', 'user_a'])).toEqual(account('en')))
    expect(queryClient.getQueryData(['auth', 'me', 'user_b'])).toEqual(other)
  })

  it('drops an answer that arrives after the account has gone', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['auth', 'me', 'user_a'], account(null))
    me = account(null)
    let answer: (value: MeResponse) => void = () => {}
    updateLocale.mockReturnValue(new Promise((resolve) => (answer = resolve)))
    const { unmount } = sync(queryClient)
    await waitFor(() => expect(updateLocale).toHaveBeenCalled())

    unmount()
    answer(account('en'))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(queryClient.getQueryData(['auth', 'me', 'user_a'])).toEqual(account(null))
  })
})
