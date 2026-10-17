import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Member } from '../types/users.types'

const changeRole = vi.fn()

const MEMBERS: Member[] = [
  {
    userId: 'u_me',
    fullName: 'Pat Owner',
    email: 'pat@example.com',
    role: 'owner',
    joinedAt: '2026-01-02T00:00:00Z',
    isYou: true,
  },
  {
    userId: 'u_jo',
    fullName: 'Jo Rivera',
    email: 'jo@example.com',
    role: 'manager',
    joinedAt: '2026-01-02T00:00:00Z',
    isYou: false,
  },
]

vi.mock('../api/users.api', () => ({
  usersApi: {
    members: () => Promise.resolve(MEMBERS),
    changeRole: (...args: unknown[]) => changeRole(...args),
  },
}))

const { MembersSection } = await import('./MembersSection')

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MembersSection />
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

async function pickRole(user: ReturnType<typeof userEvent.setup>, name: string, role: string) {
  await user.click(await screen.findByRole('combobox', { name: `Role of ${name}` }))
  await user.click(await screen.findByRole('option', { name: role }))
}

beforeEach(() => {
  changeRole.mockReset()
  changeRole.mockResolvedValue({})
})

describe('changing a teammate to owner', () => {
  it('asks first, saying what owner access gives, and sends nothing on cancel', async () => {
    const user = userEvent.setup({ delay: null })
    renderSection()

    await pickRole(user, 'Jo Rivera', 'Owner')

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Make Jo Rivera an owner?')).toBeInTheDocument()
    expect(within(dialog).getByText(/settings, billing and the team/)).toBeInTheDocument()
    expect(changeRole).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(changeRole).not.toHaveBeenCalled()
  })

  it('changes the role once confirmed', async () => {
    const user = userEvent.setup({ delay: null })
    renderSection()

    await pickRole(user, 'Jo Rivera', 'Owner')
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Make owner' }))

    expect(changeRole).toHaveBeenCalledWith('u_jo', 'owner')
  })

  it('changes a manager to staff at once', async () => {
    const user = userEvent.setup({ delay: null })
    renderSection()

    await pickRole(user, 'Jo Rivera', 'Staff')

    expect(changeRole).toHaveBeenCalledWith('u_jo', 'staff')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
