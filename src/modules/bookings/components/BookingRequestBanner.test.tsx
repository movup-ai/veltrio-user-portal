import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import { BookingRequestBanner } from './BookingRequestBanner'

describe('BookingRequestBanner', () => {
  it('shows what the renter asked for beside the buttons that answer it', () => {
    render(
      <BookingRequestBanner
        request={{ paymentPreference: 'online_rental_only', notes: 'Arriving on a late flight.' }}
        actions={<button type="button">Confirm reservation</button>}
      />,
    )

    expect(screen.getByText('Rental online, deposit at the counter')).toBeInTheDocument()
    expect(screen.getByText('Arriving on a late flight.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm reservation' })).toBeInTheDocument()
  })

  it('keeps the answer buttons when the renter left no preference or note', () => {
    // The buttons live only here, so a reservation with nothing to show must still get them.
    render(<BookingRequestBanner actions={<button type="button">Confirm reservation</button>} />)

    expect(screen.getByRole('button', { name: 'Confirm reservation' })).toBeInTheDocument()
    expect(screen.queryByText('Prefers to pay')).not.toBeInTheDocument()
    expect(screen.queryByText('Note')).not.toBeInTheDocument()
  })
})
