import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Vehicle } from '../types/vehicle.types'
import { AvailabilityStrip } from './AvailabilityStrip'

const VEHICLE = { id: 'v1', plate: 'ABC1234', status: 'Available' } as unknown as Vehicle

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
})
