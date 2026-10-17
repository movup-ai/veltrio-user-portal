import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { Notification, NotificationListParams } from '@/modules/notifications/types/notifications.types'
import { useOrganizationStore } from '@/state/organization.store'
import { NotificationsPage } from './NotificationsPage'

const page = vi.fn<(params: NotificationListParams) => Promise<unknown>>()
const markRead = vi.fn<(target: unknown) => Promise<unknown>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('@/modules/notifications/api/notifications.api', () => ({
  notificationsApi: {
    page: (params: NotificationListParams) => page(params),
    markRead: (target: unknown) => markRead(target),
    unreadCount: async () => ({ notifications: 0, announcements: 0 }),
  },
}))

const OVERDUE: Notification = {
  id: 'n-1',
  kind: 'booking_overdue',
  category: 'bookings',
  entityType: 'booking',
  entityId: 'b-1',
  params: { reference: 'BK-10002', customer: 'Kevin Ragira', vehicle: 'Honda Accord' },
  createdAt: '2026-10-17T12:00:00Z',
}

function listOf(items: Notification[]) {
  return { items, page: 1, pageSize: 10, total: items.length, totalPages: 1 }
}

function Location() {
  return <output data-testid="location">{useLocation().pathname}</output>
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/notifications']}>
        <NotificationsPage />
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  useOrganizationStore.setState({
    membership: {
      organizationId: 'org-1',
      organizationName: 'Coastline Rentals',
      subdomain: 'coastline',
      currency: 'USD',
      role: 'owner',
      permissions: [],
    },
  })
  markRead.mockResolvedValue({ notifications: 0, announcements: 0 })
})

afterEach(() => {
  vi.clearAllMocks()
  useOrganizationStore.setState({ membership: null })
})

describe('NotificationsPage', () => {
  it('opens a notification at its booking and reads it', async () => {
    const user = userEvent.setup({ delay: null })
    page.mockResolvedValue(listOf([OVERDUE]))
    renderPage()

    const row = await screen.findByRole('link', { name: /BK-10002 is overdue/ })
    expect(row).toHaveAttribute('href', '/bookings/BK-10002')
    await user.click(row)

    expect(screen.getByTestId('location')).toHaveTextContent('/bookings/BK-10002')
    expect(markRead).toHaveBeenCalledWith({ ids: ['n-1'] })
  })

  it('says so when everything is read, and goes back to all of them', async () => {
    const user = userEvent.setup({ delay: null })
    page.mockImplementation(async (params) => listOf(params.unread ? [] : [OVERDUE]))
    renderPage()

    await user.click(await screen.findByRole('tab', { name: 'Unread' }))
    expect(await screen.findByText("You're all caught up")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show all' }))

    expect(await screen.findByRole('link', { name: /BK-10002 is overdue/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
  })

  it('offers to clear a category that has nothing in it', async () => {
    const user = userEvent.setup({ delay: null })
    page.mockImplementation(async (params) => listOf(params.category ? [] : [OVERDUE]))
    renderPage()

    await user.click(await screen.findByRole('combobox', { name: 'Category' }))
    await user.click(screen.getByRole('option', { name: 'Payments' }))
    expect(await screen.findByText('No notifications in Payments')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show all categories' }))

    await waitFor(() =>
      expect(page).toHaveBeenLastCalledWith(expect.objectContaining({ category: undefined })),
    )
    expect(await screen.findByRole('link', { name: /BK-10002 is overdue/ })).toBeInTheDocument()
  })
})
