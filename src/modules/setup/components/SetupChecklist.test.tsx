import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { useOrganizationStore } from '@/state/organization.store'
import type { MembershipRole } from '@/types/user'
import type { Setup, SetupPatch } from '../types/setup.types'
import { SetupChecklist } from './SetupChecklist'

const update = vi.fn<(patch: SetupPatch) => Promise<Setup>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('../api/setup.api', () => ({ setupApi: { update: (patch: SetupPatch) => update(patch) } }))

const SETUP: Setup = {
  steps: [
    { key: 'vehicle', status: 'done' },
    { key: 'agreement', status: 'todo' },
    { key: 'payments', status: 'pending' },
  ],
  dismissed: false,
}

function renderAs(role: MembershipRole, setup = SETUP) {
  useOrganizationStore.getState().setMembership({
    organizationId: 't1',
    organizationName: 'Test Org',
    subdomain: 'test-org',
    currency: 'USD',
    timezone: 'UTC',
    role,
    permissions: [],
  })
  update.mockImplementation((patch) => Promise.resolve({ ...setup, dismissed: patch.dismissed ?? false }))
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <SetupChecklist setup={setup} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  update.mockReset()
  useOrganizationStore.getState().setMembership(null)
})

describe('SetupChecklist', () => {
  it('shows progress, with a step Stripe is reviewing not yet counted', () => {
    renderAs('owner')

    expect(
      screen.getByText('Finish these steps to start renting out your cars · 1 of 3 done'),
    ).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
    const payments = screen.getByRole('link', { name: /Connect Stripe/ })
    expect(within(payments).getByText('In review')).toBeInTheDocument()
    // jsdom's accessible name drops the space before the hidden "(done)".
    expect(screen.getByRole('link', { name: /^Add your first vehicle ?\(done\)/ })).toHaveAttribute(
      'href',
      '/vehicles/new',
    )
  })

  it('lets the owner mark the starter agreement reviewed and put the checklist away', async () => {
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    await user.click(screen.getByRole('button', { name: 'Mark as reviewed' }))
    expect(update).toHaveBeenCalledWith({ agreementReviewed: true })

    await user.click(screen.getByRole('button', { name: 'Hide the checklist' }))
    expect(update).toHaveBeenLastCalledWith({ dismissed: true })
  })

  it('gives a manager neither, since the API refuses both', () => {
    renderAs('manager', { steps: [{ key: 'vehicle', status: 'todo' }], dismissed: false })

    expect(screen.queryByRole('button', { name: 'Hide the checklist' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as reviewed' })).not.toBeInTheDocument()
  })
})
