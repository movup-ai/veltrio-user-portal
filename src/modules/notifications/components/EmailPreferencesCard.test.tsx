import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { EmailPreference } from '../types/notifications.types'
import { EmailPreferencesCard } from './EmailPreferencesCard'

const savePreferences = vi.fn<(preferences: EmailPreference[]) => Promise<EmailPreference[]>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('@/services/auth/use-me', () => ({
  useMe: () => ({ data: { user: { email: 'sam@coastline.test' } } }),
}))
vi.mock('../api/notifications.api', () => ({
  notificationsApi: {
    preferences: async (): Promise<EmailPreference[]> => [
      { category: 'bookings', email: false },
      { category: 'payments', email: false },
      { category: 'contracts', email: true },
    ],
    savePreferences: (preferences: EmailPreference[]) => savePreferences(preferences),
  },
}))

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <EmailPreferencesCard />
    </QueryClientProvider>,
  )
}

beforeEach(() => savePreferences.mockImplementation(async (preferences) => preferences))
afterEach(() => vi.clearAllMocks())

describe('EmailPreferencesCard', () => {
  it('saves the switches as they now stand', async () => {
    const user = userEvent.setup({ delay: null })
    renderCard()

    expect(await screen.findByText(/Sent to sam@coastline\.test/)).toBeInTheDocument()
    const save = screen.getByRole('button', { name: 'Save changes' })
    expect(save).toBeDisabled()
    await user.click(screen.getByRole('switch', { name: /Bookings/ }))
    await user.click(save)

    expect(savePreferences).toHaveBeenCalledWith([
      { category: 'bookings', email: true },
      { category: 'payments', email: false },
      { category: 'contracts', email: true },
    ])
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled())
  })

  it('puts the switches back on discard', async () => {
    const user = userEvent.setup({ delay: null })
    renderCard()

    const contracts = await screen.findByRole('switch', { name: /Agreements/ })
    await user.click(contracts)
    expect(contracts).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Discard' }))

    expect(contracts).toBeChecked()
    expect(savePreferences).not.toHaveBeenCalled()
  })
})
