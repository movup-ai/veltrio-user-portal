import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Vehicle } from '../types/vehicle.types'
import { AvailabilityStrip } from './AvailabilityStrip'

const VEHICLE = { id: 'v1', plate: 'ABC1234', status: 'Available' } as unknown as Vehicle
const at = (day: number) => new Date(2026, 9, day, 10).toISOString()

/** The legend's words, in order. */
function legend() {
  return within(screen.getByRole('list', { name: 'Legend' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent)
}

function Address() {
  const { pathname, search } = useLocation()
  return <span data-testid="address">{pathname + search}</span>
}

describe('AvailabilityStrip', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 13, 12))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens the whole calendar, not one searched down to this vehicle', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <MemoryRouter initialEntries={['/vehicles/v1']}>
        <AvailabilityStrip vehicle={VEHICLE} />
        <Address />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Open Calendar' }))

    expect(screen.getByTestId('address')).toHaveTextContent(/^\/calendar$/)
  })

  it('draws a request apart from a booking, hatched, and names both in the legend', () => {
    render(
      <MemoryRouter>
        <AvailabilityStrip
          vehicle={VEHICLE}
          busy={[
            { from: at(15), to: at(16) },
            { from: at(20), to: at(21), pending: true },
          ]}
        />
      </MemoryRouter>,
    )

    expect(screen.getByTitle('Oct 15 · Booked')).toHaveClass('bg-primary/80')
    const asked = screen.getByTitle('Oct 20 · Pending')
    expect(asked).toHaveClass('border-dashed')
    expect(asked.style.backgroundImage).toContain('repeating-linear-gradient')
    expect(screen.getByTitle('Oct 13 · Available').style.backgroundImage).toBe('')
    // Disabled is named only when a day is: on a working car it is a colour that never appears.
    expect(legend()).toEqual(['Booked', 'Pending', 'Available'])
  })

  it('still shows a car that is off the road as disabled, and says so in the legend', () => {
    render(
      <MemoryRouter>
        <AvailabilityStrip vehicle={{ ...VEHICLE, status: 'Out of service' }} />
      </MemoryRouter>,
    )

    expect(screen.getByTitle('Oct 13 · Disabled')).toBeInTheDocument()
    expect(legend()).toEqual(['Booked', 'Pending', 'Available', 'Disabled'])
  })
})
