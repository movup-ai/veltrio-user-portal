import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { BookingPaymentRecord, BookingPayments, ReturnCharge } from '../types/booking-payment.types'
import { ReturnChargesDialog } from './ReturnChargesDialog'

const onSubmit = vi.fn<(charges: ReturnCharge[]) => void>()

const DEPOSIT: BookingPaymentRecord = {
  id: 'd1',
  kind: 'deposit',
  status: 'held',
  amount: 2000,
  captured: 0,
  refunded: 0,
  currency: 'USD',
  createdAt: '2026-10-07T12:00:00Z',
}
const HELD = {
  currency: 'USD',
  deposit: DEPOSIT,
  returnCharges: [],
  returnChargesTotal: 0,
  returnChargesSaved: false,
  balance: 0,
} as unknown as BookingPayments

type Props = Partial<React.ComponentProps<typeof ReturnChargesDialog>>

function renderDialog(props: Props = {}) {
  render(
    <ReturnChargesDialog
      open
      onOpenChange={() => {}}
      payments={HELD}
      loading={false}
      onSubmit={onSubmit}
      {...props}
    />,
  )
  return userEvent.setup({ delay: null })
}

const amount = (kind: string) => screen.getByRole('textbox', { name: `${kind} amount` })
/** The figure beside a label in the summary under the charges. */
const figure = (label: string) => screen.getByText(label).nextElementSibling?.textContent

describe('ReturnChargesDialog', () => {
  beforeEach(() => onSubmit.mockReset())

  it('releases the whole deposit when the return cost nothing', async () => {
    const user = renderDialog()

    expect(figure('Released to the renter')).toBe('$2,000')
    await user.click(screen.getByRole('button', { name: 'Release deposit' }))

    expect(onSubmit).toHaveBeenCalledWith([])
  })

  it('captures the charges from the deposit and says what goes back', async () => {
    const user = renderDialog()

    await user.type(amount('Damage'), '120')
    await user.type(screen.getByRole('textbox', { name: 'Damage note' }), 'Rear bumper')
    await user.type(amount('Fuel'), '30.5')

    expect(figure('Total charges')).toBe('$150.50')
    expect(figure('Captured from the deposit')).toBe('$150.50')
    expect(figure('Released to the renter')).toBe('$1,849.50')
    expect(screen.queryByText('Still to collect')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Capture $150.50' }))

    // In the order the kinds are listed, and only the ones charged.
    expect(onSubmit).toHaveBeenCalledWith([
      { kind: 'fuel', amount: 30.5, note: undefined },
      { kind: 'damage', amount: 120, note: 'Rear bumper' },
    ])
  })

  it('takes the whole deposit and shows what is still to collect when charges run past it', async () => {
    const user = renderDialog()

    await user.type(amount('Damage'), '2150')

    expect(figure('Captured from the deposit')).toBe('$2,000')
    expect(figure('Released to the renter')).toBe('$0')
    expect(figure('Still to collect')).toBe('$150')
    expect(screen.getByRole('button', { name: 'Capture $2,000' })).toBeInTheDocument()
  })

  it('will not save an amount that is not one', async () => {
    const user = renderDialog()

    await user.type(amount('Other'), 'ten')
    await user.click(screen.getByRole('button', { name: 'Release deposit' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Enter each amount as a number')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('starts from the suggested charge only while none are saved', () => {
    const suggested = { over_mileage: { amount: 18, note: '40 mi over the allowance' } }
    const saved = {
      ...HELD,
      returnCharges: [{ kind: 'damage' as const, amount: 75 }],
      returnChargesTotal: 75,
      returnChargesSaved: true,
    }

    const { unmount } = render(
      <ReturnChargesDialog
        open
        onOpenChange={() => {}}
        payments={HELD}
        suggested={suggested}
        loading={false}
        onSubmit={onSubmit}
      />,
    )
    expect(amount('Extra mileage')).toHaveValue('18')
    unmount()

    renderDialog({ payments: saved, suggested })
    expect(amount('Extra mileage')).toHaveValue('')
    expect(amount('Damage')).toHaveValue('75')
  })

  it('captures only what is still owed when the charges were already paid another way', () => {
    // Saved earlier, the capture failed, and the renter paid the $80 in cash since.
    renderDialog({
      payments: {
        ...HELD,
        returnCharges: [{ kind: 'damage', amount: 80 }],
        returnChargesTotal: 80,
        returnChargesSaved: true,
        balance: 0,
      },
    })

    expect(figure('Already collected')).toBe('$80')
    expect(figure('Captured from the deposit')).toBe('$0')
    expect(figure('Released to the renter')).toBe('$2,000')
    expect(screen.getByRole('button', { name: 'Release deposit' })).toBeInTheDocument()
  })

  it('does not suggest a charge again once the charges were saved without it, even as none', () => {
    // No deposit to go by: saving is what makes an empty row a decision.
    renderDialog({
      payments: { ...HELD, deposit: undefined, returnChargesSaved: true },
      suggested: { over_mileage: { amount: 18, note: '40 mi over the allowance' } },
    })

    expect(amount('Extra mileage')).toHaveValue('')
  })

  it('adds charges to the balance where no deposit is on hold', async () => {
    const taken = { ...DEPOSIT, status: 'captured' as const, captured: 2000 }
    const user = renderDialog({
      payments: {
        ...HELD,
        deposit: taken,
        returnCharges: [{ kind: 'damage', amount: 2000 }],
        returnChargesTotal: 2000,
        returnChargesSaved: true,
      },
    })

    await user.clear(amount('Damage'))
    await user.type(amount('Damage'), '2300')

    expect(figure('Already collected')).toBe('$2,000')
    expect(figure('Still to collect')).toBe('$300')
    expect(screen.queryByText('Released to the renter')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save charges' })).toBeInTheDocument()
  })
})
