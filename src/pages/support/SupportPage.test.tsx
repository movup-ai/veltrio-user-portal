import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PaginatedResult } from '@/types/common'
import type { TicketListParams, TicketRow } from '@/modules/support/types/support.types'

const page = vi.fn<(params: TicketListParams) => Promise<PaginatedResult<TicketRow>>>()

vi.mock('@/modules/support/api/support.api', () => ({
  supportApi: { page: (params: TicketListParams) => page(params) },
}))

const { SupportPage } = await import('./SupportPage')

const ticket: TicketRow = {
  id: 't-1',
  number: 482913,
  subject: "Can't add a vehicle",
  category: 'technical',
  status: 'waiting_on_customer',
  authorName: 'Pat Owner',
  createdAt: '2026-10-17T09:00:00Z',
  lastMessageAt: '2026-10-17T10:00:00Z',
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SupportPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  page.mockReset()
})

describe('support page', () => {
  it("marks the last tab's rows as loading, not as the new tab's results", async () => {
    page.mockResolvedValueOnce({ items: [ticket], page: 1, pageSize: 10, total: 1, totalPages: 1 })
    page.mockReturnValueOnce(new Promise(() => {}))
    const user = userEvent.setup({ delay: null })
    renderPage()
    const row = await screen.findByText("Can't add a vehicle")
    expect(row.closest('[aria-busy]')).toHaveAttribute('aria-busy', 'false')

    await user.click(screen.getByRole('tab', { name: 'Awaiting support' }))

    // Still on screen while the next page loads, but busy: dimmed and not clickable.
    expect(screen.getByText("Can't add a vehicle").closest('[aria-busy]')).toHaveAttribute(
      'aria-busy',
      'true',
    )
    expect(page).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'open', page: 1 }))
  })
})
