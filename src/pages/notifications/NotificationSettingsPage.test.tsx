import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { NotificationSettingsPage } from './NotificationSettingsPage'

vi.mock('@/modules/notifications/components/EmailPreferencesCard', () => ({
  EmailPreferencesCard: () => null,
}))

function Location() {
  return <output data-testid="location">{useLocation().pathname}</output>
}

describe('NotificationSettingsPage', () => {
  it('leads back to the notifications from under its title', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/notifications/settings']}>
          <NotificationSettingsPage />
          <Location />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const back = screen.getByRole('link', { name: 'Back to notifications' })
    // After the heading in reading order, not beside it as a page action.
    expect(screen.getByRole('heading', { name: 'Notification settings' }).compareDocumentPosition(back)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    await user.click(back)

    expect(screen.getByTestId('location')).toHaveTextContent(/^\/notifications$/)
  })
})
