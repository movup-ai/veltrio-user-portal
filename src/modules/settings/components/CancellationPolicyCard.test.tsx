import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { CancellationPolicy } from '@/lib/cancellation-policy'
import type { Company } from '../types/company.types'
import { CancellationPolicyCard } from './CancellationPolicyCard'

const setPolicy = vi.fn<(policy: CancellationPolicy | undefined) => Promise<Company>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('../api/company.api', () => ({
  companyApi: { setCancellationPolicy: (policy: CancellationPolicy | undefined) => setPolicy(policy) },
}))

const COMPANY: Company = {
  id: 't_1',
  name: 'Sunstate Car Co.',
  subdomain: 'sunstate',
  fleetSize: '11_50',
  country: 'US',
  currencyLocked: false,
  timezone: 'America/New_York',
  currency: 'USD',
}
const STANDARD: CancellationPolicy = [
  { daysBefore: 14, refundPercent: 100 },
  { daysBefore: 7, refundPercent: 50 },
]

function renderCard(policy?: CancellationPolicy) {
  setPolicy.mockImplementation(async (saved) => ({ ...COMPANY, cancellationPolicy: saved }))
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CancellationPolicyCard company={{ ...COMPANY, cancellationPolicy: policy }} />
    </QueryClientProvider>,
  )
  return userEvent.setup({ delay: null })
}

const save = () => screen.getByRole('button', { name: 'Save changes' })

afterEach(() => setPolicy.mockReset())

describe('CancellationPolicyCard', () => {
  it('starts on no stated policy, with nothing to save and nothing shown to renters', () => {
    renderCard()

    expect(screen.getByRole('radio', { name: /No stated policy/ })).toBeChecked()
    expect(save()).toBeDisabled()
    expect(screen.queryByText('How renters will see it')).not.toBeInTheDocument()
  })

  it('saves a ready-made schedule as its tiers, and shows it as renters will read it', async () => {
    const user = renderCard()

    await user.click(screen.getByRole('radio', { name: /Standard/ }))

    expect(screen.getByText('7 to 13 days before pickup')).toBeInTheDocument()
    expect(screen.getByText('Less than 7 days before pickup')).toBeInTheDocument()
    await user.click(save())
    await waitFor(() => expect(setPolicy).toHaveBeenCalledWith(STANDARD))
  })

  it('tells non-refundable, an empty schedule, from withdrawing the policy altogether', async () => {
    const user = renderCard(STANDARD)
    expect(screen.getByRole('radio', { name: /Standard/ })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: /Non-refundable/ }))
    await user.click(save())
    await waitFor(() => expect(setPolicy).toHaveBeenLastCalledWith([]))

    await user.click(screen.getByRole('radio', { name: /No stated policy/ }))
    await user.click(save())
    await waitFor(() => expect(setPolicy).toHaveBeenLastCalledWith(undefined))
  })

  it('edits its own tiers from the schedule on screen, and saves them', async () => {
    const user = renderCard(STANDARD)

    await user.click(screen.getByRole('radio', { name: /Custom/ }))
    const half = screen.getByRole('spinbutton', { name: 'Tier 2: refund percent' })
    await user.clear(half)
    await user.type(half, '25')
    await user.click(screen.getByRole('button', { name: 'Add tier' }))
    await user.click(save())

    await waitFor(() =>
      expect(setPolicy).toHaveBeenCalledWith([
        { daysBefore: 14, refundPercent: 100 },
        { daysBefore: 7, refundPercent: 25 },
        { daysBefore: 3, refundPercent: 12 },
      ]),
    )
  })

  it('does not send a schedule the API would refuse, and says which tier is wrong', async () => {
    const user = renderCard(STANDARD)
    await user.click(screen.getByRole('radio', { name: /Custom/ }))
    const days = screen.getByRole('spinbutton', { name: 'Tier 2: days before pickup' })

    await user.clear(days)
    await user.type(days, '20')
    await user.click(save())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Notice must be shorter than in the tier above.',
    )
    expect(setPolicy).not.toHaveBeenCalled()
  })

  it('keeps edited tiers while a ready-made schedule is looked at', async () => {
    const user = renderCard(STANDARD)
    await user.click(screen.getByRole('radio', { name: /Custom/ }))
    const half = () => screen.getByRole('spinbutton', { name: 'Tier 2: refund percent' })
    await user.clear(half())
    await user.type(half(), '25')

    await user.click(screen.getByRole('radio', { name: /Flexible/ }))
    await user.click(screen.getByRole('radio', { name: /Custom/ }))

    // Seeded from the schedule on screen only the first time: after an edit they are the owner's.
    expect(half()).toHaveValue(25)
    expect(screen.getByRole('spinbutton', { name: 'Tier 1: days before pickup' })).toHaveValue(14)
  })

  it('keeps a saved custom schedule while a ready-made one is looked at', async () => {
    const own = [
      { daysBefore: 10, refundPercent: 100 },
      { daysBefore: 2, refundPercent: 30 },
    ]
    const user = renderCard(own)
    expect(screen.getByRole('radio', { name: /Custom/ })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: /Flexible/ }))
    await user.click(screen.getByRole('radio', { name: /Custom/ }))

    expect(screen.getByRole('spinbutton', { name: 'Tier 1: days before pickup' })).toHaveValue(10)
    expect(screen.getByRole('spinbutton', { name: 'Tier 2: refund percent' })).toHaveValue(30)
    expect(save()).toBeDisabled()
  })

  it('goes back to the saved policy on discard', async () => {
    const user = renderCard(STANDARD)

    await user.click(screen.getByRole('radio', { name: /Flexible/ }))
    await user.click(screen.getByRole('button', { name: 'Discard' }))

    expect(screen.getByRole('radio', { name: /Standard/ })).toBeChecked()
    expect(save()).toBeDisabled()
  })
})
