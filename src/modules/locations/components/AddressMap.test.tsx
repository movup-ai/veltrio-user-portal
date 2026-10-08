import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const maps: FakeMap[] = []
const markers: FakeMarker[] = []

class FakeMap {
  setCenter = vi.fn()
  element: Element
  options: { center: unknown }
  constructor(element: Element, options: { center: unknown }) {
    this.element = element
    this.options = options
    maps.push(this)
  }
}

class FakeMarker {
  setPosition = vi.fn()
  options: { map: unknown; position: unknown }
  constructor(options: { map: unknown; position: unknown }) {
    this.options = options
    markers.push(this)
  }
}

const loadMap = vi.fn()

vi.mock('../utils/places', () => ({ loadMap: () => loadMap() }))

const { AddressMap } = await import('./AddressMap')

beforeEach(() => {
  maps.length = 0
  markers.length = 0
  loadMap.mockReset().mockResolvedValue({ Map: FakeMap, Marker: FakeMarker })
})

describe('AddressMap', () => {
  it('centres the map and drops a marker on the coordinates', async () => {
    render(<AddressMap latitude={25.7907} longitude={-80.13} label="Map" />)

    await waitFor(() => expect(markers).toHaveLength(1))
    const position = { lat: 25.7907, lng: -80.13 }
    expect(maps[0].element).toBe(screen.getByRole('region', { name: 'Map' }))
    expect(maps[0].options.center).toEqual(position)
    expect(markers[0].options).toEqual({ map: maps[0], position })
  })

  it('moves the existing map when another place is picked', async () => {
    const { rerender } = render(<AddressMap latitude={25.7907} longitude={-80.13} label="Map" />)
    await waitFor(() => expect(markers).toHaveLength(1))

    rerender(<AddressMap latitude={29.9712} longitude={-81.4265} label="Map" />)

    const position = { lat: 29.9712, lng: -81.4265 }
    await waitFor(() => expect(markers[0].setPosition).toHaveBeenCalledWith(position))
    expect(maps[0].setCenter).toHaveBeenCalledWith(position)
    // A second Map would be a second billed map load for the same dialog.
    expect(maps).toHaveLength(1)
  })

  it('renders nothing when the map cannot load', async () => {
    loadMap.mockRejectedValue(new Error('blocked'))
    render(<AddressMap latitude={25.7907} longitude={-80.13} label="Map" />)

    await waitFor(() => expect(screen.queryByRole('region')).not.toBeInTheDocument())
  })
})
