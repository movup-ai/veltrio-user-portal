import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { BookingVehiclePicker, type VehicleOption } from './BookingVehiclePicker'

/** Four days, matching the run-out prices the rows render. */
const HOURS = 96

function vehicle(id: string, overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id,
    make: 'Honda',
    model: `Accord ${id}`,
    year: 2024,
    vehicleType: 'Sedan',
    color: 'Silver',
    plate: `PLATE-${id}`,
    vin: `VIN${id}`,
    uri: `honda-accord-${id}`,
    location: 'Miami Beach',
    status: 'Available',
    mileage: 1000,
    utilization: 0,
    photos: [],
    rateOptions: [
      {
        id: `${id}_daily`,
        label: 'Daily',
        basis: 'day',
        rate: 100,
        includedMiles: 150,
        unlimitedMileage: false,
      },
    ],
    fees: {},
    specs: { transmission: 'Automatic', fuelType: 'Petrol', seats: 5, doors: 4 },
    features: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function options(count: number): VehicleOption[] {
  return Array.from({ length: count }, (_, i) => ({ vehicle: vehicle(`v${i + 1}`) }))
}

function rowNames(): string[] {
  return screen.getAllByRole('radio').map((row) => row.textContent ?? '')
}

describe('BookingVehiclePicker', () => {
  it('marks the list invalid, with the same thin error edge an input gets', () => {
    render(
      <BookingVehiclePicker options={options(2)} selectedId="" onSelect={vi.fn()} hours={HOURS} invalid />,
    )

    const group = screen.getByRole('radiogroup')
    expect(group).toHaveAttribute('aria-invalid', 'true')
    expect(group).toHaveClass('outline', 'outline-error')
    expect(group).not.toHaveClass('outline-2')
  })

  it('shows five vehicles a page and pages through the rest', async () => {
    const user = userEvent.setup()
    render(<BookingVehiclePicker options={options(11)} selectedId="" onSelect={vi.fn()} hours={HOURS} />)

    expect(screen.getAllByRole('radio')).toHaveLength(5)
    expect(rowNames()[0]).toContain('Accord v1')

    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    expect(rowNames()[0]).toContain('Accord v6')

    // 11 vehicles is three pages; the last holds the remainder.
    await user.click(screen.getByRole('button', { name: '3' }))
    expect(screen.getAllByRole('radio')).toHaveLength(1)
    expect(rowNames()[0]).toContain('Accord v11')
  })

  it('hides the pager when everything fits on one page', () => {
    render(<BookingVehiclePicker options={options(5)} selectedId="" onSelect={vi.fn()} hours={HOURS} />)

    expect(screen.getAllByRole('radio')).toHaveLength(5)
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('returns to the first page when the fleet changes underneath', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <BookingVehiclePicker options={options(11)} selectedId="" onSelect={vi.fn()} hours={HOURS} />,
    )

    await user.click(screen.getByRole('button', { name: '2' }))
    expect(rowNames()[0]).toContain('Accord v6')

    // A different branch with the same number of cars — the page must not survive it.
    const elsewhere = Array.from({ length: 11 }, (_, i) => ({ vehicle: vehicle(`x${i + 1}`) }))
    rerender(<BookingVehiclePicker options={elsewhere} selectedId="" onSelect={vi.fn()} hours={HOURS} />)

    expect(rowNames()[0]).toContain('Accord x1')
  })

  it('lists booked vehicles last and refuses to select them', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const mixed: VehicleOption[] = [
      { vehicle: vehicle('taken'), bookedUntil: '2026-10-05T09:30:00.000Z' },
      { vehicle: vehicle('free') },
    ]
    render(<BookingVehiclePicker options={mixed} selectedId="" onSelect={onSelect} hours={HOURS} />)

    const rows = screen.getAllByRole('radio')
    expect(rows[0].textContent).toContain('Accord free')
    expect(rows[1]).toBeDisabled()

    await user.click(rows[1])
    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe('BookingVehiclePicker prices', () => {
  /** A car offered only by the week — the headline rate is not a daily one. */
  function weekly(): VehicleOption {
    return {
      vehicle: vehicle('w1', {
        rateOptions: [
          {
            id: 'w1_weekly',
            label: 'Weekly',
            basis: 'week',
            rate: 3000,
            includedMiles: 1000,
            unlimitedMileage: false,
          },
        ],
      }),
    }
  }

  it('labels a weekly rate by its own basis, not as a daily one', () => {
    render(<BookingVehiclePicker options={[weekly()]} selectedId="" onSelect={vi.fn()} hours={HOURS} />)

    const row = screen.getByRole('radio')
    expect(row).toHaveTextContent('/wk')
    expect(row).not.toHaveTextContent('/day')
  })

  it('bills a short trip on a weekly rate as one full week', () => {
    // 24 hours against a weekly option is still one billed week, not one day.
    render(<BookingVehiclePicker options={[weekly()]} selectedId="" onSelect={vi.fn()} hours={24} />)

    // The run-out line counts billed units, so it reads "1 week" rather than "1 day".
    expect(screen.getByRole('radio')).toHaveTextContent(/1 week/i)
  })
})
