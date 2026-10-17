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

function account(locale: 'en' | 'es' | null): MeResponse {
  return { user: { id: 'u-1', email: 'sam@coastline.test', fullName: 'Sam', locale }, membership: null }
}

function sync() {
  const queryClient = new QueryClient()
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
