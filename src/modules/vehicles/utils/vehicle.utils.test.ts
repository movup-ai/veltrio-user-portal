import { describe, expect, it } from 'vitest'
import { VEHICLES_SEED } from '../mock/vehicle.mock'
import { vehicleRow } from './vehicle.utils'

/** The Trips cell: the sixth column, after vehicle, plate, location, status and utilization. */
const tripsCell = (count: number | undefined) => {
  const cell = vehicleRow(VEHICLES_SEED[0], count, []).cells[5]
  return cell.kind === 'text' ? cell.primary : undefined
}

describe('vehicleRow trips', () => {
  it('shows a dash, not zero, while the count is not known', () => {
    expect(tripsCell(undefined)).toBe('—')
  })

  it('shows a real zero for a car that has never been booked', () => {
    expect(tripsCell(0)).toBe('0')
    expect(tripsCell(3)).toBe('3')
  })
})
