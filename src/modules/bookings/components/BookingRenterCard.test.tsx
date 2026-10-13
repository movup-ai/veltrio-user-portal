import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { BookingRenter } from '../types/booking.types'
import { BookingRenterCard } from './BookingRenterCard'

const RENTER = {
  id: 'c1',
  name: 'Marisol Vega',
  email: 'marisol@example.com',
  phone: '+1 305 442 0118',
  licenceNumber: 'FL D-1204-889',
  since: 2024,
  rentals: 3,
  lifetimeValue: 1240,
} as BookingRenter

describe('BookingRenterCard', () => {
  it('names who else may drive, with the licence the agreement states and what each costs', () => {
    render(
      <BookingRenterCard
        renter={RENTER}
        onOpenProfile={vi.fn()}
        drivers={[
          { id: 'd1', name: 'Sam Okafor', licenceNumber: 'FL 9911', pricePerDay: 12 },
          { id: 'd2', name: 'Dana Ortiz', licenceNumber: 'FL 2204', pricePerDay: 0 },
        ]}
      />,
    )

    const [sam, dana] = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(sam).toHaveTextContent('Sam Okafor')
    expect(sam).toHaveTextContent('FL 9911')
    expect(sam).toHaveTextContent('$12/day')
    // Waived, and said so as a figure rather than left out.
    expect(dana).toHaveTextContent('$0/day')
  })

  it('opens the renter’s own page from Profile, and offers nothing when they have none', async () => {
    const onOpenProfile = vi.fn()
    const user = userEvent.setup({ delay: null })
    const { rerender } = render(<BookingRenterCard renter={RENTER} onOpenProfile={onOpenProfile} />)

    await user.click(screen.getByRole('button', { name: 'Profile' }))
    expect(onOpenProfile).toHaveBeenCalledTimes(1)

    // A seeded row has no customer behind it: a button that led to the list read as broken.
    rerender(<BookingRenterCard renter={RENTER} />)
    expect(screen.getByRole('button', { name: 'Profile' })).toBeDisabled()
  })

  it('says nothing about drivers when the renter is the only one', () => {
    render(<BookingRenterCard renter={RENTER} onOpenProfile={vi.fn()} />)

    expect(screen.queryByText('Additional drivers')).not.toBeInTheDocument()
  })
})
