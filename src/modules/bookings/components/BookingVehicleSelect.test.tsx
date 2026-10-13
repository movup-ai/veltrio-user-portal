import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { VEHICLES_SEED } from '@/modules/vehicles/mock/vehicle.mock'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import type { VehicleOption } from './BookingVehiclePicker'
import { BookingVehicleSelect } from './BookingVehicleSelect'

const car = (index: number, overrides: Partial<Vehicle>): Vehicle => ({
  ...VEHICLES_SEED[index],
  ...overrides,
})

const ACCORD = car(0, { id: 'a', make: 'Honda', model: 'Accord', plate: 'FL·8KJ-205' })
const TWIN = car(1, { id: 'b', make: 'Honda', model: 'Accord', plate: 'FL·7VC-283' })
const BRONCO = car(2, { id: 'c', make: 'Ford', model: 'Bronco', plate: 'FL·3HX-517' })
const OPTIONS: VehicleOption[] = [
  { vehicle: ACCORD },
  { vehicle: TWIN, bookedUntil: '2026-10-18T14:00:00.000Z' },
  { vehicle: BRONCO },
]

function renderSelect(selectedId = '') {
  const onSelect = vi.fn()
  render(
    <BookingVehicleSelect
      aria-label="New vehicle"
      options={OPTIONS}
      selectedId={selectedId}
      onSelect={onSelect}
      hours={96}
      placeholder="Choose a vehicle"
      emptyText="No vehicle matches."
    />,
  )
  return { onSelect, field: screen.getByRole('combobox', { name: 'New vehicle' }) }
}

const names = () => screen.getAllByRole('option').map((option) => option.textContent ?? '')

describe('BookingVehicleSelect', () => {
  it('takes one line until it is opened, however long the fleet', async () => {
    const user = userEvent.setup({ delay: null })
    const { field } = renderSelect()

    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    await user.click(field)

    // Free cars first; the one booked on the dates is there to read, not to pick.
    const models = names().map((name) => name.match(/^(Honda Accord|Ford Bronco)/)?.[0])
    expect(models).toEqual(['Honda Accord', 'Ford Bronco', 'Honda Accord'])
    const taken = screen.getByRole('option', { name: /FL·7VC-283/ })
    expect(taken).toBeDisabled()
    expect(taken).toHaveTextContent(/Booked until/)
  })

  it('narrows to what is typed, and picks with the keyboard', async () => {
    const user = userEvent.setup({ delay: null })
    const { field, onSelect } = renderSelect()

    await user.click(field)
    await user.keyboard('3hx517')
    expect(names()).toHaveLength(1)
    await user.keyboard('{Enter}')

    expect(onSelect).toHaveBeenCalledWith(BRONCO)
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('moves through the cars that can be picked with the arrows, never onto a taken one', async () => {
    const user = userEvent.setup({ delay: null })
    const { field, onSelect } = renderSelect()

    await user.click(field)
    // Two are free: a third press has nowhere further to go.
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}')

    expect(onSelect).toHaveBeenCalledWith(BRONCO)
  })

  it('picks with a click, and shows the car picked with its plate', async () => {
    const user = userEvent.setup({ delay: null })
    const { field, onSelect } = renderSelect('c')

    // Two Accords: the plate is what says which car this is.
    expect(field).toHaveValue('Ford Bronco · FL·3HX-517')
    await user.click(field)
    expect(screen.getByRole('option', { name: /FL·3HX-517/ })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('option', { name: /FL·8KJ-205/ }))

    expect(onSelect).toHaveBeenCalledWith(ACCORD)
  })

  it('says so when nothing matches, and picks nothing on Enter', async () => {
    const user = userEvent.setup({ delay: null })
    const { field, onSelect } = renderSelect()

    await user.click(field)
    await user.keyboard('lamborghini{Enter}')

    expect(screen.getByText('No vehicle matches.')).toBeInTheDocument()
    expect(onSelect).not.toHaveBeenCalled()
  })
})
