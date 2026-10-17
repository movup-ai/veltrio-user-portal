import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { useOrganizationStore } from '@/state/organization.store'
import type { Announcement, Notification, UnreadCount } from '../types/notifications.types'
import { NotificationBell } from './NotificationBell'

const unreadCount = vi.fn<() => Promise<UnreadCount>>()
const markRead = vi.fn<(target: unknown) => Promise<UnreadCount>>()
const markAnnouncementsRead = vi.fn<(ids: string[]) => Promise<void>>()
const attachmentUrl = vi.fn<(announcementId: string, attachmentId: string) => Promise<string>>()
let notifications: Notification[] = []
let announcements: Announcement[] = []

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

vi.mock('../api/notifications.api', () => ({
  notificationsApi: {
    unreadCount: () => unreadCount(),
    markRead: (target: unknown) => markRead(target),
    markAnnouncementsRead: (ids: string[]) => markAnnouncementsRead(ids),
    attachmentUrl: (announcementId: string, attachmentId: string) =>
      attachmentUrl(announcementId, attachmentId),
    page: async () => ({
      items: notifications,
      page: 1,
      pageSize: 10,
      total: notifications.length,
      totalPages: 1,
    }),
    announcements: async () => ({
      items: announcements,
      page: 1,
      pageSize: 5,
      total: announcements.length,
      totalPages: 1,
    }),
  },
}))

const PAID: Notification = {
  id: 'n-1',
  kind: 'payment_received',
  category: 'payments',
  entityType: 'booking',
  entityId: 'b-1',
  params: { reference: 'BK-10234', customer: 'Dana Okafor', amountCents: 23_540 },
  createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
}

const RELEASE: Announcement = {
  id: 'a-1',
  kind: 'release',
  title: { en: 'Calendar view' },
  body: { en: 'See every booking on one screen.' },
  publishAt: '2026-10-17T12:00:00Z',
  attachments: [{ id: 'f-1', name: 'calendar.png', contentType: 'image/png', sizeBytes: 2048 }],
  read: false,
  dismissed: false,
}

function Location() {
  return <output data-testid="location">{useLocation().pathname}</output>
}

function renderBell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <NotificationBell />
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
  notifications = [PAID]
  announcements = [RELEASE]
  unreadCount.mockResolvedValue({ notifications: 2, announcements: 1 })
  markRead.mockResolvedValue({ notifications: 0, announcements: 1 })
  markAnnouncementsRead.mockResolvedValue(undefined)
  attachmentUrl.mockResolvedValue('https://files.example/calendar.png')
})

afterEach(() => {
  vi.clearAllMocks()
  useOrganizationStore.setState({ membership: null })
})

describe('NotificationBell', () => {
  it('counts unread notifications and announcements together', async () => {
    renderBell()

    expect(await screen.findByRole('button', { name: 'Notifications, 3 unread' })).toHaveTextContent('3')
  })

  it('opens a notification at its booking and marks it read', async () => {
    const user = userEvent.setup({ delay: null })
    renderBell()

    await user.click(await screen.findByRole('button', { name: 'Notifications, 3 unread' }))
    const row = await screen.findByRole('link', { name: /Dana Okafor paid \$235\.40 for BK-10234/ })
    expect(row).toHaveAttribute('href', '/bookings/BK-10234')
    await user.click(row)

    expect(markRead).toHaveBeenCalledWith({ ids: ['n-1'] })
    expect(screen.getByTestId('location')).toHaveTextContent('/bookings/BK-10234')
    await waitFor(() => expect(screen.queryByText(/Dana Okafor paid/)).not.toBeInTheDocument())
  })

  it('marks every notification read at once', async () => {
    const user = userEvent.setup({ delay: null })
    renderBell()

    await user.click(await screen.findByRole('button', { name: 'Notifications, 3 unread' }))
    await user.click(await screen.findByRole('button', { name: 'Mark all read' }))

    expect(markRead).toHaveBeenCalledWith({ all: true })
  })

  it("reads what's new once it is shown", async () => {
    const user = userEvent.setup({ delay: null })
    renderBell()

    await user.click(await screen.findByRole('button', { name: 'Notifications, 3 unread' }))
    await user.click(screen.getByRole('tab', { name: /What's new/ }))

    expect(await screen.findByText('Calendar view')).toBeInTheDocument()
    await waitFor(() => expect(markAnnouncementsRead).toHaveBeenCalledWith(['a-1']))
    // Its picture, by a link asked for this announcement only.
    expect(await screen.findByRole('button', { name: /calendar.png/ })).toBeInTheDocument()
    expect(attachmentUrl).toHaveBeenCalledWith('a-1', 'f-1')
  })

  it('asks nothing for someone with no company', () => {
    useOrganizationStore.setState({ membership: null })
    renderBell()

    expect(unreadCount).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Notifications, 0 unread' })).not.toHaveTextContent(/\d/)
  })
})
