import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { TooltipProvider } from '@/components/ui/tooltip'
import { toPaginatedResult } from '@/lib/pagination'
import { useOrganizationStore } from '@/state/organization.store'
import type { BookingListParams } from '@/modules/bookings/api/booking.mapper'
import type { BookingDay, BookingStats } from '@/modules/bookings/types/booking.types'
import type { CollectedDay } from '@/modules/payments/types/payment.types'

const daily = vi.fn<(from: string, to: string) => Promise<BookingDay[]>>()

vi.mock('@/modules/bookings/api/booking.api', () => ({
  bookingApi: {
    stats: () => Promise.resolve(BOOKING_STATS),
    daily: (from: string, to: string) => daily(from, to),
    page: (params: BookingListParams) => Promise.resolve(toPaginatedResult([], 0, params)),
  },
}))
vi.mock('@/modules/payments/api/payment.api', () => ({
  paymentApi: {
    collected: (from: string, to: string) => Promise.resolve(collectedDays(from, to)),
  },
}))
vi.mock('@/modules/vehicles/api/vehicle.api', () => ({
  vehicleApi: {
    stats: () =>
      Promise.resolve({
        total: 5,
        byStatus: { Available: 3, 'On rent': 2, Maintenance: 0, 'Out of service': 0, Archived: 0 },
        avgUtilization: 0.1,
      }),
    listAll: () => Promise.resolve([]),
  },
}))
vi.mock('@/modules/locations/api/location.api', () => ({
  locationApi: { list: () => Promise.resolve([{}]) },
}))
vi.mock('@/services/auth/use-me', () => ({
  useMe: () => ({ data: { user: { fullName: 'Edward Thomas' } } }),
}))

const { DashboardPage } = await import('./DashboardPage')

// Noon on Oct 16 on the company's clock, which is UTC here.
const NOW = new Date('2026-10-16T12:00:00Z')

const BOOKING_STATS: BookingStats = {
  openBookings: 8,
  startingSoon: 1,
  expectedRevenue: 5801.5,
  needsAttention: 9,
  unpaid: 9,
  unsigned: 9,
  ready: 0,
  pending: 4,
  pickedUpToday: 0,
  returningToday: 0,
  missedPickups: 4,
  notReadySoon: 0,
  tabCounts: { All: 18, Upcoming: 8, Today: 0, Overdue: 1 },
}

// The dev tenant's October: $7,183.90 this month, nothing in September.
const TAKEN: Record<string, number> = {
  '2026-10-02': 555,
  '2026-10-07': 2900,
  '2026-10-08': 2312.4,
  '2026-10-11': 640,
  '2026-10-15': 231.5,
  '2026-10-16': 545,
}

function days(from: string, to: string): string[] {
  const out = []
  for (
    let d = new Date(`${from}T00:00:00Z`);
    d.toISOString().slice(0, 10) <= to;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

function collectedDays(from: string, to: string): CollectedDay[] {
  return days(from, to).map((day) => ({ day, collected: TAKEN[day] ?? 0 }))
}

/** 7 bookings made in each of the last two weeks; 2 cars out, 40% used this week, 10% last. */
function bookingDays(from: string, to: string): BookingDay[] {
  return days(from, to).map((day, i, all) => {
    const thisWeek = i >= all.length - 7
    return { day, created: i >= all.length - 14 ? 1 : 0, onRent: 2, utilization: thisWeek ? 0.4 : 0.1 }
  })
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

/** The KPI card a label heads: label, its row, then the card. */
function card(label: string): HTMLElement {
  return screen.getByText(label).parentElement!.parentElement!
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  useOrganizationStore.getState().setMembership({
    organizationId: 't1',
    organizationName: 'Thewheeldeal',
    subdomain: 'twd',
    currency: 'USD',
    timezone: 'UTC',
    role: 'owner',
    permissions: [],
  })
  daily.mockReset()
  daily.mockImplementation((from, to) => Promise.resolve(bookingDays(from, to)))
})

afterEach(() => {
  vi.useRealTimers()
  useOrganizationStore.getState().setMembership(null)
})

describe('the KPI cards', () => {
  it("show the API's own figures and comparisons", async () => {
    renderPage()

    const revenue = card('Revenue (MTD)')
    expect(await within(revenue).findByText('$7,184')).toBeInTheDocument()
    expect(within(revenue).getByText('+$7,184')).toBeInTheDocument()

    const rentals = card('Active rentals')
    expect(await within(rentals).findByText('2')).toBeInTheDocument()
    expect(within(rentals).getByText('0')).toBeInTheDocument()

    // This week 40% against last week's 10%: 30 points, not "300%".
    const used = card('Fleet utilization (7d)')
    expect(within(used).getByText('40%')).toBeInTheDocument()
    expect(within(used).getByText('30 pts')).toBeInTheDocument()

    const made = card('Bookings (7d)')
    expect(within(made).getByText('7')).toBeInTheDocument()
    // Unchanged is a plain 0%, with no icon: a dash before it read as "minus zero".
    expect(within(made).getByText('0%').querySelector('svg')).toBeNull()
  })

  it('say a series could not be loaded rather than leave a bare dash', async () => {
    daily.mockRejectedValue(new Error('404'))
    renderPage()

    await waitFor(() => expect(screen.getAllByText("Couldn't load")).toHaveLength(3))
    // The pickups pill is not shown beside a figure that failed to load.
    expect(within(card('Active rentals')).queryByText('0')).not.toBeInTheDocument()
  })
})
