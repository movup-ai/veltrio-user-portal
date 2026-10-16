import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { Invitation } from '../types/users.types'

const invitations = vi.fn<() => Promise<Invitation[]>>()

vi.mock('../api/users.api', () => ({
  usersApi: { invitations: () => invitations() },
}))

const { PendingInvitations } = await import('./PendingInvitations')

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <PendingInvitations onSent={vi.fn()} />
    </QueryClientProvider>,
  )
  return client
}

beforeEach(() => {
  invitations.mockReset()
})

describe('pending invitations', () => {
  it('loads under its own title, not as a bare spinner below the team', () => {
    invitations.mockReturnValue(new Promise(() => {}))
    renderSection()

    expect(screen.getByRole('heading', { name: 'Pending invitations' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('says it was the invitations that failed to load', async () => {
    invitations.mockRejectedValue(new Error('boom'))
    renderSection()

    expect(await screen.findByText("We couldn't load the pending invitations.")).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pending invitations' })).toBeInTheDocument()
  })

  it('shows a failed refetch even when the list it had was empty', async () => {
    invitations.mockResolvedValue([])
    const client = renderSection()
    await vi.waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())

    // TanStack keeps the empty list it had and reports the error alongside it.
    invitations.mockRejectedValue(new Error('boom'))
    await client.refetchQueries()

    expect(await screen.findByText("We couldn't load the pending invitations.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('stays out of the way when there are none', async () => {
    invitations.mockResolvedValue([])
    renderSection()

    await vi.waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(screen.queryByText('Pending invitations')).not.toBeInTheDocument()
  })
})
