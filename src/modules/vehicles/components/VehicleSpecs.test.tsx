import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VEHICLES_SEED } from '../mock/vehicle.mock'
import { VehicleSpecs } from './VehicleSpecs'

describe('VehicleSpecs', () => {
  it('sets its fields apart by spacing alone, with no rule under each', () => {
    render(<VehicleSpecs vehicle={VEHICLES_SEED[0]} />)

    for (const label of ['Make', 'VIN', 'Doors']) {
      expect(screen.getByText(label).parentElement, label).not.toHaveClass('border-b', 'pb-2.5')
    }
  })
})
